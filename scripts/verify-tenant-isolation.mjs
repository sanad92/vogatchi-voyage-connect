import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const orgA=id(1), orgB=id(2), ownerA=id(11), ownerB=id(12), staff=id(13), inactive=id(14);
const newcomer=id(15), unverified=id(16), free=id(17), platform=id(18), foreignInvite=id(31);
const membership=id(41), foreignRole=id(51), employeeA=id(61), employeeB=id(62), sale=id(71);
const fixture = readFileSync(new URL('./fixtures/tenant-isolation.sql', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../drizzle/migrations/0016_tenant_authorization_and_business_email_hardening.sql', import.meta.url), 'utf8');
await db.exec(fixture);
await db.exec(`
 INSERT INTO organizations(id,name) VALUES('${orgA}','Company A'),('${orgB}','Company B');
 INSERT INTO auth.users VALUES
 ('${ownerA}','owner@a.example',now()),('${ownerB}','owner@b.example',now()),
 ('${staff}','agent@a.example',now()),('${inactive}','inactive@b.example',now()),
 ('${newcomer}','new@work.example',now()),('${unverified}','pending@work.example',NULL),
 ('${free}','member@gmail.com',now()),('${platform}','operator@gmail.com',now());
 INSERT INTO organization_members(id,organization_id,user_id,role,is_active) VALUES
 ('${id(42)}','${orgA}','${ownerA}','owner',true),
 ('${id(43)}','${orgB}','${ownerB}','owner',true),
 ('${membership}','${orgB}','${newcomer}','agent',false),
 ('${id(44)}','${orgA}','${staff}','agent',true),
 ('${id(45)}','${orgB}','${inactive}','admin',false);
 INSERT INTO profiles(id,email) SELECT id,email FROM auth.users;
 INSERT INTO platform_roles VALUES('${platform}','platform_owner');
 INSERT INTO invitations(id,organization_id,email,role,token,status,expires_at)
 VALUES('${foreignInvite}','${orgB}','new@work.example','agent','${id(81)}','pending',now()+interval '1 day');
 INSERT INTO organization_permission_roles(id,organization_id,name,is_active)
 VALUES('${foreignRole}','${orgB}','Finance',true);
 INSERT INTO employees(id,organization_id,is_active) VALUES('${employeeA}','${orgB}',true),('${employeeB}','${orgB}',true);
 INSERT INTO pilgrimage_sales(id,organization_id,status) VALUES('${sale}','${orgB}','quoted');
 SET ROLE authenticated;
 SELECT set_config('request.jwt.claim.sub','${ownerA}',false);
`);

// Demonstrate the real cross-tenant failure before applying the hardening.
const exposed = await db.query(`SELECT create_org_permission_role('${orgB}','Unauthorized before fix') AS id`);
assert.ok(exposed.rows[0].id, 'pre-fix NULL role allows a foreign organization mutation');
await db.exec('RESET ROLE');
await db.exec(migration);
let checks = 0;
const asUser = async user => {
 await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${user || ''}',false);`);
};
const denied = async (sql, message, pattern) => {
 await assert.rejects(db.query(sql), pattern || /صلاحية|owners or admins|not_authorized/, message);
 checks++;
};
const foreignCalls = [
 `create_organization_invitation('${orgB}','blocked@work.example','agent')`,
 `cancel_organization_invitation('${foreignInvite}')`,
 `resend_organization_invitation('${foreignInvite}')`,
 `manage_organization_member('${membership}','manager')`,
 `manage_sop_department_member('${orgB}','${ownerB}','sales')`,
 `assign_org_permission_role('${orgB}','${ownerB}','${foreignRole}')`,
 `create_org_permission_role('${orgB}','Unauthorized after fix')`,
 `set_org_permission_grant('${orgB}','${foreignRole}','customers_view',true)`,
 `set_org_permission_override('${orgB}','${ownerB}','customers_view',true)`,
 `merge_employee_records('${employeeA}',ARRAY['${employeeB}'::uuid])`,
 `clone_pilgrimage_sale('${sale}')`,
];
await asUser(ownerA);
for (const call of foreignCalls) await denied(`SELECT ${call}`, `foreign owner cannot call ${call.split('(')[0]}`);
await asUser(inactive);
await denied(`SELECT create_org_permission_role('${orgB}','Inactive bypass')`, 'inactive membership must deny access');
await asUser(staff);
await denied(`SELECT create_organization_invitation('${orgA}','staff@work.example','agent')`, 'ordinary staff cannot invite');
await asUser(null);
await denied(`SELECT create_organization_invitation('${orgB}','anonymous@work.example','agent')`, 'signed-out caller cannot invite');
await asUser(ownerA);
assert.equal((await db.query(`SELECT count(*)::int AS n FROM invitations WHERE organization_id='${orgB}'`)).rows[0].n,0,'foreign invitations are invisible'); checks++;
assert.equal((await db.query(`SELECT count(*)::int AS n FROM profiles WHERE id='${ownerB}'`)).rows[0].n,0,'foreign personal information is invisible'); checks++;
assert.equal((await db.query(`SELECT count(*)::int AS n FROM organization_members WHERE organization_id='${orgB}'`)).rows[0].n,0,'foreign memberships are invisible'); checks++;
assert.equal((await db.query(`UPDATE organization_members SET role='manager' WHERE id='${membership}' RETURNING id`)).rows.length,0,'foreign membership update affects no rows'); checks++;

// Allowed paths still work and persist their changes.
await asUser(ownerB);
const invite = (await db.query(`SELECT create_organization_invitation('${orgB}','new@work.example','agent') AS result`)).rows[0].result;
assert.equal(invite.organization_id,orgB); checks++;
assert.ok((await db.query(`SELECT create_org_permission_role('${orgB}','Authorized role') AS id`)).rows[0].id); checks++;
await asUser(platform);
assert.ok((await db.query(`SELECT create_org_permission_role('${orgB}','Platform support role') AS id`)).rows[0].id,'platform permissions remain independent of mailbox provider'); checks++;

await asUser(ownerB);
for (const email of ['ali@gmail.com','ali@Outlook.com','ali@sub.gmail.com']) {
 await denied(`SELECT create_organization_invitation('${orgB}','${email}','agent')`, `free-email invitation blocked: ${email}`, /بريد عمل رسمي/);
}
await db.exec('RESET ROLE');
await denied(`UPDATE invitations SET email='bypass@gmail.com' WHERE id='${invite.id}'`, 'updates cannot bypass email policy', /بريد عمل رسمي/);
// Legacy pending invitations must not be accepted or resent, but can be cancelled.
await db.exec(`ALTER TABLE invitations DISABLE TRIGGER trg_block_free_email_invitation;
 INSERT INTO invitations(id,organization_id,email,role,token,status,expires_at)
 VALUES('${id(32)}','${orgB}','member@gmail.com','agent','${id(82)}','pending',now()+interval '1 day');
 ALTER TABLE invitations ENABLE TRIGGER trg_block_free_email_invitation;`);
await asUser(ownerB);
await denied(`SELECT resend_organization_invitation('${id(32)}')`, 'legacy free-mail invitation cannot be resent', /بريد عمل رسمي/);
assert.equal((await db.query(`SELECT cancel_organization_invitation('${id(32)}') AS r`)).rows[0].r.success,true); checks++;
await asUser(free);
await denied(`SELECT accept_invitation('${id(82)}')`, 'free mailbox cannot accept an invitation', /تأكيد بريد العمل الرسمي/);
await denied(`SELECT create_organization_onboarding('Free mailbox company')`, 'direct onboarding RPC cannot bypass free-email block', /تأكيد بريد العمل الرسمي/);
await asUser(unverified);
await denied(`SELECT accept_invitation('${invite.token}')`, 'email verification is mandatory for invitation acceptance', /تأكيد بريد العمل الرسمي/);
await denied(`SELECT create_organization_onboarding('Unverified company')`, 'email verification is mandatory for onboarding', /تأكيد بريد العمل الرسمي/);
await asUser(newcomer);
await denied(`SELECT create_organization_onboarding('Spoofed company',NULL,NULL,'contact@gmail.com')`, 'free company contact cannot bypass onboarding', /بريد العمل الرسمي/);
await asUser(ownerA);
assert.equal((await db.query(`SELECT accept_invitation('${invite.token}') AS r`)).rows[0].r.success,false,'a verified but mismatched mailbox cannot accept'); checks++;
await asUser(newcomer);
assert.equal((await db.query(`SELECT accept_invitation('${invite.token}') AS r`)).rows[0].r.success,true,'verified invited mailbox can accept'); checks++;
assert.equal((await db.query(`SELECT role::text,is_active FROM organization_members WHERE id='${membership}'`)).rows[0].is_active,true,'membership persisted and reads back'); checks++;
await db.exec('RESET ROLE');
await denied(`UPDATE organization_members SET organization_id='${orgA}' WHERE id='${membership}'`, 'membership cannot be moved to another company', /immutable/);
await denied(`UPDATE organization_members SET user_id='${ownerA}' WHERE id='${membership}'`, 'membership cannot be reassigned to another account', /immutable/);
await denied(`UPDATE organization_members SET id='${id(99)}' WHERE id='${membership}'`, 'membership identifier cannot be changed', /immutable/);
assert.equal((await db.query(`SELECT status FROM invitations WHERE id='${invite.id}'`)).rows[0].status,'accepted','acceptance persisted'); checks++;
await db.close();
console.log(`Tenant isolation checks passed (${checks} assertions; reproduced original bypass, blocked 11 privileged cross-tenant paths).`);