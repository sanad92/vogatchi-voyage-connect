import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const booking = '00000000-0000-0000-0000-000000000001';
const orgA = '00000000-0000-0000-0000-000000000002';
const orgB = '00000000-0000-0000-0000-000000000003';
const status = '00000000-0000-0000-0000-000000000004';
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
    SELECT NULLIF(current_setting('test.user',true),'')::uuid
  $$;
  CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql AS $$
    SELECT $1=NULLIF(current_setting('test.org',true),'')::uuid
  $$;
  CREATE FUNCTION public.has_org_permission(uuid,text) RETURNS boolean LANGUAGE sql AS $$
    SELECT $1=NULLIF(current_setting('test.org',true),'')::uuid
      AND $2=current_setting('test.permission',true)
  $$;
  CREATE TABLE booking_statuses(id uuid PRIMARY KEY,name text);
  INSERT INTO booking_statuses VALUES ('${status}','cancelled');
`);
for (const table of ['hotel_bookings','flight_bookings','transport_bookings','car_rentals']) {
  await db.exec(`CREATE TABLE ${table}(id uuid PRIMARY KEY,organization_id uuid,status_id uuid,updated_at timestamptz);
    INSERT INTO ${table}(id,organization_id) VALUES ('${booking}','${orgA}');`);
}
await db.exec(await readFile(new URL('../drizzle/migrations/0000_secure_legacy_booking_status_updates.sql',import.meta.url),'utf8'));
const call = (type = 'flight', id = status) => db.query('SELECT update_booking_status($1,$2,$3)',[booking,type,id]);
await assert.rejects(call(),/Not authenticated/);
await db.query("SELECT set_config('test.user',$1,false),set_config('test.org',$2,false),set_config('test.permission','bookings_cancel',false)",[booking,orgB]);
await assert.rejects(call(),/Not authorized/);
await db.query("SELECT set_config('test.org',$1,false),set_config('test.permission','bookings_edit',false)",[orgA]);
await assert.rejects(call(),/Not authorized/);
await db.query("SELECT set_config('test.permission','bookings_cancel',false)");
await assert.rejects(call('invalid'),/Unsupported booking type/);
await assert.rejects(call('flight',null),/Booking status not found/);
assert.equal((await call()).rows[0].update_booking_status,true);
assert.equal((await db.query('SELECT status_id FROM flight_bookings')).rows[0].status_id,status);
assert.equal((await db.query('SELECT status_id FROM hotel_bookings')).rows[0].status_id,null,'flight updates never target the hotel table');
await db.exec('DELETE FROM flight_bookings WHERE id=\''+booking+'\'');
await assert.rejects(call(),/Booking not found or not accessible/);
const privileges = await db.query(`SELECT has_function_privilege('anon','public.update_booking_status(uuid,text,uuid,uuid,text)','execute') AS anon_allowed,
  has_function_privilege('authenticated','public.update_booking_status(uuid,text,uuid,uuid,text)','execute') AS authenticated_allowed,
  (SELECT prosecdef FROM pg_proc WHERE proname='update_booking_status') AS definer`);
assert.equal(privileges.rows[0].anon_allowed,false);
assert.equal(privileges.rows[0].authenticated_allowed,true);
assert.equal(privileges.rows[0].definer,false,'function must not bypass caller RLS');
await db.close();
console.log('Booking status SQL passed in isolated PostgreSQL: identity, tenant, permission, missing record/status, correct table and invoker/grants.');