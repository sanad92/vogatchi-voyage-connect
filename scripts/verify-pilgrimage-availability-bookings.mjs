import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(path, 'utf8');
const fixture = sql => sql.replace(/^\\set .+$/gm, '').replace(/^\\i (\S+)$/gm, (_, path) => fixture(read(path)));
const db = new PGlite();
try {
  const retail = read('scripts/test-pilgrimage-retail-registration.sql');
  await db.exec(fixture(retail.slice(0, retail.indexOf('DO $$'))));
  await db.exec(`
    ALTER TABLE public.customers ADD COLUMN archived_at timestamptz;
    ALTER TABLE public.pilgrims ADD COLUMN b2b_roster_entry_id uuid;
    ALTER TABLE public.pilgrimage_programs ADD COLUMN makkah_hotel text, ADD COLUMN madinah_hotel text,
      ADD COLUMN uses_room_inventory boolean NOT NULL DEFAULT false;
    CREATE TABLE public.pilgrimage_b2b_agreements (id uuid PRIMARY KEY, sale_id uuid, organization_id uuid, status text);
    CREATE SCHEMA pilgrimage_inventory_private;
    GRANT USAGE ON SCHEMA pilgrimage_inventory_private TO authenticated;
    CREATE FUNCTION public.can_org_write(org uuid) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org)';
    CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org) AND permission <> ''quotes_create''';
  `);
  const availability = read('scripts/deploy-pilgrimage-availability-search.sql');
  await db.exec(availability.replace(/\$old\$[\s\S]+?\$old\$/g, before =>
    before.replace(' AND g.b2b_roster_entry_id IS NULL', '')));
  await db.exec(read('supabase/migrations/20261113233232_pilgrimage_program_sales_confirmation.sql'));
  await db.exec(read('supabase/migrations/20261119154850_pilgrimage_availability_bookings.sql'));

  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const [org, foreignOrg, manager, agent, customer, program, booking, hold, overflow, expired, inventory] =
    [1, 2, 11, 12, 101, 601, 602, 603, 604, 605, 606].map(id);
  const q = (sql, ...params) => db.query(sql, params);
  const rows = async (sql, ...params) => (await q(sql, ...params)).rows;
  const [dates] = await rows(`SELECT (current_date + 7)::text AS departure, (current_date + 12)::text AS return`);
  await q(`INSERT INTO public.pilgrimage_programs
    (id, organization_id, name, status, capacity, price_quad, departure_date, return_date, sales_confirmed_at)
    VALUES ($1, $2, 'Search booking fixture', 'open', 3, 33500, $3, $4, now()),
           ($5, $2, 'Room inventory fixture', 'open', 3, 33500, $3, $4, now())`, program, org, dates.departure, dates.return, inventory);
  await q('UPDATE pilgrimage_programs SET uses_room_inventory=true WHERE id=$1', inventory);
  const actor = async user => {
    await db.exec('SET ROLE authenticated');
    await q("SELECT set_config('test.user_id', $1, false)", user);
  };
  const book = (request, action, names, options = {}) => q(
    'SELECT public.book_pilgrimage_from_availability($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    options.org ?? org, request, options.program ?? program, customer, action, options.party ?? names.length, 'quad',
    options.price ?? 33500, 'EGP', dates.departure, dates.return, names);
  const confirm = (holdId, names) => q('SELECT public.confirm_pilgrimage_availability_hold($1,$2,$3)', org, holdId, names);
  const available = async () => Number((await rows(
    'SELECT available_seats FROM public.search_pilgrimage_availability($1,_program_id => $2)', org, program))[0].available_seats);

  await actor(manager);
  await assert.rejects(book(overflow, 'hold', [], { org: foreignOrg, party: 1 }), { code: '42501' });
  await assert.rejects(book(overflow, 'book', ['Wrong price'], { price: 30000 }), /pilgrimage_booking_price_changed/);
  await assert.rejects(book(overflow, 'book', ['Inventory passenger'], { program: inventory }), /pilgrimage_booking_program_unavailable/);
  assert.equal(await available(), 3);

  const held = await book(hold, 'hold', [], { party: 2 });
  assert.equal(await available(), 1);
  assert.equal((await rows(`SELECT abs(extract(epoch FROM hold_expires_at - updated_at) - 7200) < 2 AS two_hours
    FROM pilgrimage_seat_allocations WHERE sale_id=$1`, hold))[0].two_hours, true);
  assert.deepEqual((await book(hold, 'hold', [], { party: 2 })).rows, held.rows);
  assert.equal((await rows("SELECT count(*)::int AS n FROM pilgrims WHERE program_id=$1", program))[0].n, 0);
  await assert.rejects(book(overflow, 'book', ['Too many one', 'Too many two']), { code: '22023' });
  assert.equal((await rows('SELECT id FROM pilgrimage_sales WHERE id=$1', overflow)).length, 0);

  await book(booking, 'book', ['Direct traveler']);
  await book(booking, 'book', ['Direct traveler']);
  assert.equal(await available(), 0);
  await assert.rejects(confirm(hold, ['First traveler']), /pilgrimage_booking_invalid_selection/);
  assert.equal(await available(), 0);
  const confirmed = await confirm(hold, ['First traveler', 'Second traveler']);
  assert.deepEqual((await confirm(hold, ['First traveler', 'Second traveler'])).rows, confirmed.rows);
  assert.equal(await available(), 0);
  assert.deepEqual(await rows("SELECT full_name, total_price::int AS price FROM pilgrims WHERE program_id=$1 ORDER BY full_name", program), [
    { full_name: 'Direct traveler', price: 33500 },
    { full_name: 'First traveler', price: 33500 },
    { full_name: 'Second traveler', price: 33500 },
  ]);

  await db.exec('RESET ROLE');
  await q('UPDATE pilgrimage_programs SET capacity=5,sales_confirmed_at=clock_timestamp() WHERE id=$1', program);
  await actor(manager);
  await assert.rejects(q("SELECT public.transition_pilgrimage_seat_allocation($1,'hold',120)", hold), { code: '23514' });
  await book(expired, 'hold', [], { party: 1 });
  await db.exec('RESET ROLE');
  await q("UPDATE pilgrimage_seat_allocations SET hold_expires_at=now()-interval '1 minute' WHERE sale_id=$1", expired);
  await actor(manager);
  assert.equal(await available(), 2);
  await assert.rejects(confirm(expired, ['Expired traveler']), /active_unexpired_hold_required/);

  await actor(agent);
  await assert.rejects(book(overflow, 'hold', ['Agent request']), { code: '42501' });
  await db.exec('SET ROLE anon');
  await assert.rejects(book(overflow, 'hold', ['Anonymous request']), { code: '42501' });
  console.log('Direct pilgrimage booking, two-hour hold, confirmation, expiry, retries, pricing, capacity and authorization passed.');
} finally {
  await db.close();
}
