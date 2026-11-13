import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [org, other, manager, program, legacy, customer, sale] = [1, 2, 3, 4, 5, 6, 7].map(id);
await db.exec(`
  CREATE SCHEMA private;
  CREATE SCHEMA auth;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT ''${manager}''::uuid';
  CREATE FUNCTION user_belongs_to_org(uuid, uuid) RETURNS boolean LANGUAGE sql AS 'SELECT $2 = ''${org}''';
  CREATE FUNCTION has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql AS 'SELECT true';
  CREATE FUNCTION can_org_write(uuid) RETURNS boolean LANGUAGE sql AS 'SELECT true';
  CREATE TABLE pilgrimage_programs(id uuid PRIMARY KEY, organization_id uuid,
    name text DEFAULT 'Program', program_type text DEFAULT 'umrah', status text NOT NULL DEFAULT 'open',
    departure_date date, return_date date, makkah_hotel text, madinah_hotel text,
    currency text DEFAULT 'EGP', capacity int DEFAULT 0, price_quad numeric DEFAULT 0,
    price_triple numeric DEFAULT 0, price_double numeric DEFAULT 0, price_single numeric DEFAULT 0);
  CREATE TABLE pilgrimage_sales(id uuid PRIMARY KEY, organization_id uuid, program_id uuid,
    status text DEFAULT 'draft', departure_date date, return_date date, sale_model text, program_type text,
    fulfillment_role text, name text, buyer_customer_id uuid, party_size int, currency text, created_by uuid);
  CREATE TABLE pilgrimage_sale_items(organization_id uuid, sale_id uuid, item_kind text,
    room_type text, quantity int, unit_sell numeric, description text);
  CREATE TABLE pilgrims(id uuid PRIMARY KEY, organization_id uuid, program_id uuid, status text);
  CREATE TABLE pilgrimage_b2b_agreements(id uuid PRIMARY KEY, organization_id uuid, sale_id uuid, status text);
  CREATE TABLE pilgrimage_seat_allocations(id uuid PRIMARY KEY, organization_id uuid,
    program_id uuid, sale_id uuid, status text, hold_expires_at timestamptz);
  CREATE TABLE customers(id uuid PRIMARY KEY, organization_id uuid, archived_at timestamptz);
  INSERT INTO pilgrimage_programs(id, organization_id) VALUES ('${legacy}', '${org}');
  INSERT INTO pilgrims VALUES ('${id(8)}','${org}','${legacy}','registered');
  INSERT INTO customers VALUES ('${customer}','${org}', NULL);
  CREATE FUNCTION private.pilgrimage_occupied_seats(uuid,uuid,timestamptz,uuid DEFAULT NULL)
    RETURNS bigint LANGUAGE sql AS 'SELECT 0::bigint';
`);
const availability = readFileSync('scripts/deploy-pilgrimage-availability-search.sql', 'utf8');
await db.exec(availability.slice(availability.indexOf('CREATE FUNCTION private.pilgrimage_room_price'),
  availability.indexOf('CREATE FUNCTION public.search_pilgrimage_availability')));
await db.exec(readFileSync('supabase/migrations/20261113233232_pilgrimage_program_sales_confirmation.sql', 'utf8'));
const q = (sql, ...parameters) => db.query(sql, parameters);
const blocked = { message: 'pilgrimage_sales_confirmation_required', code: '22023' };
const registration = `INSERT INTO pilgrims VALUES ('${id(9)}','${org}','${program}','registered')`;
const hold = `INSERT INTO pilgrimage_seat_allocations VALUES ('${id(10)}','${org}','${program}','${sale}','held',now() + interval '2 hours')`;
const issue = () => q("UPDATE pilgrimage_sales SET status='quoted' WHERE id=$1", sale);
const open = () => q("UPDATE pilgrimage_programs SET status='open' WHERE id=$1", program);
const search = () => q('SELECT * FROM public.search_pilgrimage_availability($1)', org);
const draftFromSearch = () => q("SELECT public.create_pilgrimage_quote_from_availability($1,$2,$3,$4,1,'quad',1000,'EGP')", org, id(12), program, customer);

await q('UPDATE pilgrims SET status=$1 WHERE id=$2', 'documents_pending', id(8));
assert.equal((await search()).rows.length, 0);
await q('INSERT INTO pilgrimage_programs(id,organization_id,departure_date,return_date,price_quad) VALUES ($1,$2,current_date+7,current_date+12,1000)', program, org);
assert.equal((await q('SELECT status FROM pilgrimage_programs WHERE id=$1', program)).rows[0].status, 'draft');
await q("INSERT INTO pilgrimage_sales(id,organization_id,program_id,departure_date,return_date) VALUES ($1,$2,$3,current_date+7,current_date+12)", sale, org, program);
await q("INSERT INTO pilgrimage_sale_items VALUES ($1,$2,'program_seat','quad',1,1000,'Seat')", org, sale);
await q("INSERT INTO pilgrimage_b2b_agreements VALUES ($1,$2,$3,'draft')", id(11), org, sale);
const approve = () => q("UPDATE pilgrimage_b2b_agreements SET status='approved_internal' WHERE id=$1", id(11));

await assert.rejects(open(), blocked);
await assert.rejects(q('UPDATE pilgrimage_programs SET sales_confirmed_at=now() WHERE id=$1', program), blocked);
await assert.rejects(issue(), blocked);
await assert.rejects(db.exec(registration), blocked);
await assert.rejects(db.exec(hold), blocked);
await assert.rejects(approve(), blocked);
await assert.rejects(draftFromSearch(), /pilgrimage_quote_program_unavailable/);
assert.equal((await search()).rows.length, 0);

await q("UPDATE pilgrimage_programs SET status='open', capacity=4, sales_confirmed_at=now() WHERE id=$1", program);
assert.equal((await search()).rows[0].available_seats, 4);
await assert.rejects(q('SELECT * FROM public.search_pilgrimage_availability($1)', other), { code: '42501' });
await draftFromSearch();
await issue();
await db.exec(registration);
await db.exec(hold);
await approve();

await q('UPDATE pilgrimage_programs SET departure_date=current_date+8 WHERE id=$1', program);
assert.equal((await q('SELECT sales_confirmed_at FROM pilgrimage_programs WHERE id=$1', program)).rows[0].sales_confirmed_at, null);
assert.equal((await search()).rows.length, 0);
await assert.rejects(q("UPDATE pilgrimage_seat_allocations SET status='allocated' WHERE id=$1", id(10)), blocked);
await q("UPDATE pilgrimage_seat_allocations SET status='released' WHERE id=$1", id(10));
await q('UPDATE pilgrimage_programs SET sales_confirmed_at=now() WHERE id=$1', program);
await assert.rejects(q("UPDATE pilgrimage_seat_allocations SET status='held' WHERE id=$1", id(10)), /pilgrimage_quote_dates_changed/);
await db.close();
console.log('Pilgrimage sales confirmation, availability, quotes, retail registration, seat allocation, B2B approval and existing records passed.');
