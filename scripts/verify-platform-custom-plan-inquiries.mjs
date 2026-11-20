import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL(
  '../supabase/migrations/20261120133023_create_platform_custom_plan_inquiries.sql', import.meta.url,
), 'utf8');
const db = new PGlite();
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const platformAdmin = id(101);
const tenantOwner = id(102);

const submit = async ({
  request = id(1), company = 'حجوزات اختبار', contact = 'نجوى سالم',
  email = 'custom-lead@example.com', phone = '+20 11 2222 3333',
  message = 'مطلوب إدارة ٤ مستخدمين\nوحجوزات عمرة.', consent = true, honeypot = null,
} = {}) => (await db.query(
  'SELECT public.submit_platform_custom_plan_inquiry($1,$2,$3,$4,$5,$6,$7,$8) AS result',
  [request, company, contact, email, phone, message, consent, honeypot],
)).rows[0].result;

const list = (status = null, offset = 0) => db.query(
  'SELECT * FROM public.list_platform_custom_plan_inquiries($1,$2)', [status, offset],
);
const changeStatus = async (inquiry, desired, expected) => (await db.query(
  'SELECT public.update_platform_custom_plan_inquiry_status($1,$2,$3) AS result',
  [inquiry, desired, expected],
)).rows[0].result;

const asActor = async actor => {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [actor]);
  await db.exec('SET ROLE authenticated');
};

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION public.is_platform_admin_v2(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT $1 = '${platformAdmin}'::uuid
    $$;
    CREATE TABLE public.admin_audit_log (
      user_id uuid, action text, target_table text, target_id uuid, details jsonb
    );
  `);
  await db.exec(migration);

  await db.exec('SET ROLE anon');
  const receipt = await submit();
  assert.deepEqual(Object.keys(receipt).sort(), ['accepted', 'reference']);
  assert.equal(receipt.accepted, true);
  assert.match(receipt.reference, /^[0-9a-f-]{36}$/);
  assert.notEqual(receipt.reference, id(1));
  assert.deepEqual(await submit({ company: ' حجوزات اختبار ', email: 'CUSTOM-LEAD@EXAMPLE.COM' }), receipt);
  await assert.rejects(() => submit({ contact: 'Unknown person' }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), consent: false }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), honeypot: 'filled' }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), email: 'not-an-email' }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), message: '  \n\t  ' }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), phone: '000' }), { code: '22023' });
  await assert.rejects(() => submit({ request: id(2), message: 'ة'.repeat(1501) }), { code: '22023' });
  await assert.rejects(() => list(), { code: '42501' });
  await assert.rejects(() => changeStatus(receipt.reference, 'closed', 'new'), { code: '42501' });
  await assert.rejects(() => db.query('SELECT * FROM platform_inquiries_private.custom_plan_inquiries'), { code: '42501' });

  await submit({ request: id(2), email: 'lead-two@gmail.com', phone: '+20 (11) 2222-3333' });
  await submit({ request: id(3), email: 'lead-three@example.com', phone: '+201122223333' });
  await assert.rejects(() => submit({ request: id(4), email: 'new-contact@example.com' }), { code: 'PT429' });
  assert.deepEqual(await submit(), receipt);
  await submit({ request: id(4), phone: null });
  await submit({ request: id(5), phone: null });
  await assert.rejects(() => submit({ request: id(6), phone: null }), { code: 'PT429' });

  await asActor(tenantOwner);
  await assert.rejects(() => list(), { code: '42501' });
  await assert.rejects(() => changeStatus(receipt.reference, 'contacted', 'new'), { code: '42501' });

  await asActor(platformAdmin);
  await assert.rejects(() => db.query('SELECT * FROM platform_inquiries_private.custom_plan_inquiries'), { code: '42501' });
  const { rows } = await list('new');
  assert.equal(rows.length, 5);
  const record = rows.find(row => row.id === receipt.reference);
  assert.equal(record.email, 'custom-lead@example.com');
  assert.equal(record.company_name, 'حجوزات اختبار');
  assert.equal(record.message, 'مطلوب إدارة ٤ مستخدمين\nوحجوزات عمرة.');
  assert.equal(Object.hasOwn(record, 'request_id'), false);
  assert.equal(Object.hasOwn(record, 'phone_digits'), false);
  await assert.rejects(() => list('invalid'), { code: '22023' });
  const updated = await changeStatus(record.id, 'contacted', 'new');
  assert.equal(updated.status, 'contacted');
  assert.equal(updated.id, record.id);
  await assert.rejects(() => changeStatus(record.id, 'closed', 'new'), { code: '40001' });
  assert.deepEqual(await changeStatus(record.id, 'contacted', 'contacted'), updated);
  assert.equal((await list('new')).rows.length, 4);
  assert.equal((await list('contacted')).rows.length, 1);

  await db.exec('RESET ROLE');
  const audit = (await db.query('SELECT action, details FROM public.admin_audit_log')).rows;
  assert.deepEqual(audit, [{
    action: 'platform_custom_plan_inquiry_status_changed',
    details: { old_status: 'new', new_status: 'contacted' },
  }]);

  // Allow only the isolated fixture owner to seed enough rows for quota and pagination checks.
  await db.exec(`
    INSERT INTO platform_inquiries_private.custom_plan_inquiries (request_id, company_name, contact_name, email, message, created_at)
    SELECT gen_random_uuid(), 'Fixture company', 'Fixture agent', 'case-' || n || '@example.com',
      'Paging fixture', now() - interval '30 minutes'
    FROM generate_series(1, 495) n;
  `);
  await asActor(platformAdmin);
  assert.equal((await list()).rows.length, 51);
  assert.equal((await list(null, 500)).rows.length, 0);
  assert.equal((await list('new', 450)).rows.length, 49);

  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(() => submit({ request: id(7), email: 'after-limit@example.com', phone: null }), { code: 'PT429' });
  assert.deepEqual(await submit(), receipt);

  console.log('Platform inquiries passed consent, honeypot, private receipt, retries, quotas, role isolation, pagination and audited status.');
} finally {
  await db.close();
}
