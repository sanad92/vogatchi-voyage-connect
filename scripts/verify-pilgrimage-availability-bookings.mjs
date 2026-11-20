import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(path, 'utf8');
const fixture = sql => sql.replace(/^\\set .+$/gm, '').replace(/^\\i (\S+)$/gm, (_, path) => fixture(read(path)));
const migration = file => read(`supabase/migrations/${file}.sql`);
const section = (source, start, end) => source.slice(source.indexOf(start), end ? source.indexOf(end) : undefined);
const db = new PGlite();
try {
  const retail = read('scripts/test-pilgrimage-retail-registration.sql');
  await db.exec(fixture(retail.slice(0, retail.indexOf('DO $$'))));
  await db.exec(`
    ALTER TABLE public.customers ADD COLUMN archived_at timestamptz, ADD COLUMN name text NOT NULL DEFAULT 'QA Buyer';
    ALTER TABLE public.pilgrims ADD COLUMN b2b_roster_entry_id uuid, ADD COLUMN gender text,
      ADD COLUMN room_group text, ADD COLUMN cancelled_at timestamptz;
    ALTER TABLE public.pilgrimage_programs ADD COLUMN makkah_hotel text, ADD COLUMN madinah_hotel text;
    CREATE TABLE public.pilgrimage_b2b_agreements (id uuid PRIMARY KEY, sale_id uuid, organization_id uuid, status text);
    CREATE TABLE public.refund_requests (id uuid PRIMARY KEY, amount numeric, status text);
    CREATE FUNCTION public.can_org_write(org uuid) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org)';
    CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org) AND permission <> ''quotes_create''
        AND permission IS DISTINCT FROM current_setting(''test.block_permission'', true)';
    GRANT USAGE ON SCHEMA auth TO authenticated;
  `);
  const operations = migration('20261113185820_pilgrimage_operations');
  await db.exec(section(operations, 'CREATE TABLE public.pilgrimage_operations', '-- Preserve existing quote'));
  await db.exec('ALTER TABLE public.pilgrimage_operations ADD COLUMN replacement_booking_id uuid');
  await db.exec(section(operations, 'CREATE FUNCTION pilgrimage_operations_private.guard_room()', '\nCOMMIT;'));
  const rooming = migration('20261113191300_umrah_rooming_groups');
  await db.exec(section(rooming, 'CREATE TABLE public.umrah_rooming_groups', 'DO $patch$'));
  const roomStock = migration('20261117023644_umrah_departure_room_inventory');
  await db.exec(section(roomStock, 'ALTER TABLE public.pilgrimage_programs', 'CREATE FUNCTION pilgrimage_inventory_private.configure('));
  await db.exec(`DO $patch$ DECLARE definition text; needle text; BEGIN
    ${section(roomStock, "  SELECT pg_get_functiondef('pilgrimage_operations_private.guard_umrah_rooming()", "  SELECT pg_get_functiondef('private.guard_pilgrimage_sales_inventory()")}
  END $patch$;`);
  // Exercise the production conversion and booking-to-invoice checks. Only the
  // underlying booking automation and accounting storage are represented by fixtures.
  await db.exec(`
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, booking_number text, status_id uuid,
      booking_type text, customer_id uuid, customer_name text, selling_price numeric, base_selling_price numeric,
      cost_price numeric, base_cost_price numeric, currency text, start_date date, end_date date,
      status text, workflow_stage text, revenue_recognition_mode text, notes text);
    CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
      booking_id uuid UNIQUE, booking_type text, customer_id uuid, currency text, final_amount numeric,
      remaining_amount numeric, vat_amount numeric DEFAULT 0, invoice_number text);
    CREATE TABLE public.invoice_items (invoice_id uuid, organization_id uuid, description text, quantity integer,
      unit_price numeric, total_price numeric);
    CREATE TABLE public.journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
      source_type text, source_id uuid, status text, fx_rate numeric DEFAULT 1);
    CREATE TABLE public.journal_entry_lines (journal_entry_id uuid, account_id uuid, debit numeric);
    CREATE TABLE public.booking_cancellation_settlements (booking_id uuid PRIMARY KEY, organization_id uuid,
      reason text, fees jsonb, result jsonb, settled_by uuid);
    CREATE TABLE public.booking_timeline_events (organization_id uuid, booking_id uuid, kind text, actor_id uuid,
      summary text, payload jsonb);
    CREATE SCHEMA trip_amendment_private;
    CREATE FUNCTION trip_amendment_private.can_settle_cancellation(org uuid) RETURNS boolean LANGUAGE sql
      AS 'SELECT public.has_org_permission(org, ''bookings_cancel'')';
    CREATE FUNCTION trip_amendment_private.cancellation_preview(b public.bookings) RETURNS jsonb LANGUAGE sql
      AS 'SELECT ''{}''::jsonb';
    CREATE FUNCTION public.get_org_account_route(uuid,text) RETURNS uuid LANGUAGE sql
      AS 'SELECT gen_random_uuid()';
    CREATE FUNCTION public.get_booking_status_id(text) RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE SCHEMA refund_balance_private;
    CREATE FUNCTION refund_balance_private.post(uuid,text,uuid,uuid,text,numeric,uuid[],numeric[],uuid,text)
      RETURNS uuid LANGUAGE sql AS
      'INSERT INTO public.journal_entries (organization_id, source_type, source_id, status) VALUES ($1,$2,$3,''posted'') RETURNING id';
    CREATE FUNCTION public.fixture_invoice_automation() RETURNS trigger LANGUAGE plpgsql AS $body$
    DECLARE invoice_id uuid; journal_id uuid;
    BEGIN
      INSERT INTO public.invoices (organization_id, booking_id, booking_type, customer_id, currency, final_amount, remaining_amount)
      VALUES (NEW.organization_id, NEW.id, NEW.booking_type, NEW.customer_id, NEW.currency, NEW.selling_price, NEW.selling_price)
      RETURNING id INTO invoice_id;
      IF current_setting('test.fail_posting', true) IS DISTINCT FROM 'true' THEN
        INSERT INTO public.journal_entries (organization_id, source_type, source_id, status)
        VALUES (NEW.organization_id, 'invoice', invoice_id, 'posted') RETURNING id INTO journal_id;
        INSERT INTO public.journal_entry_lines VALUES (journal_id, gen_random_uuid(), NEW.selling_price);
      END IF;
      RETURN NEW;
    END;
    $body$;
    CREATE TRIGGER fixture_invoice_automation AFTER INSERT ON public.bookings
      FOR EACH ROW EXECUTE FUNCTION public.fixture_invoice_automation();
    ALTER TABLE public.umrah_inventory_bookings ADD COLUMN booking_id uuid UNIQUE REFERENCES public.bookings(id);
    CREATE TABLE pilgrimage_inventory_private.booking_staff (booking_id uuid PRIMARY KEY, organization_id uuid, operations_user_id uuid);
    CREATE TABLE pilgrimage_inventory_private.booking_edit_requests (booking_id uuid, requested_by uuid, status text, expires_at timestamptz);
  `);
  const staff = migration('20261117164840_pilgrimage_staff_commissions_and_edit_approval');
  await db.exec(section(staff, 'CREATE FUNCTION pilgrimage_inventory_private.guard_booked_passenger_edit()', 'CREATE FUNCTION pilgrimage_inventory_private.read_booking_staff'));
  const finance = migration('20261117135404_unify_umrah_booking_accounting');
  await db.exec(section(finance, 'CREATE FUNCTION pilgrimage_inventory_private.create_unified_reference', 'CREATE FUNCTION pilgrimage_inventory_private.guard_unified_booking')
    .replace("reservation.id, reservation.organization_id, 'UMR-' || reservation.booking_number, 'umrah',",
      "reservation.id, reservation.organization_id, (CASE program.program_type WHEN 'hajj' THEN 'HAJ-' ELSE 'UMR-' END) || reservation.booking_number, program.program_type,"));
  await db.exec(section(finance, 'CREATE TABLE public.umrah_booking_invoice_credits', 'CREATE OR REPLACE FUNCTION trip_amendment_private.invoice_credit'));
  await db.exec(section(finance, 'CREATE FUNCTION pilgrimage_inventory_private.settle_cancelled_passenger()'));
  await db.exec(`
    DO $patch$
    BEGIN
      EXECUTE replace(pg_get_functiondef('public.apply_pilgrimage_operations(uuid,uuid,jsonb)'::regprocedure),
        'program.program_type <> ''umrah''',
        '(program.program_type <> ''umrah'' AND NOT (program.program_type = ''hajj'' AND program.uses_room_inventory))');
    END
    $patch$;
  `);
  const availability = read('scripts/deploy-pilgrimage-availability-search.sql');
  await db.exec(availability.replace(/\$old\$[\s\S]+?\$old\$/g, before =>
    before.replace(' AND g.b2b_roster_entry_id IS NULL', '')));
  await db.exec(read('supabase/migrations/20261113233232_pilgrimage_program_sales_confirmation.sql'));
  await db.exec(read('supabase/migrations/20261119154850_pilgrimage_availability_bookings.sql'));
  const availabilityFinance = migration('20261119165402_unify_availability_umrah_finance');
  await db.exec(section(availabilityFinance, 'ALTER TABLE public.umrah_inventory_bookings'));
  await db.exec(`DO $patch$ DECLARE definition text; BEGIN
    ${section(migration('20261119170806_amend_unified_umrah_passengers'),
      "  SELECT pg_get_functiondef('public.apply_pilgrimage_operations", 'END\n$patch$;')}
  END $patch$;`);
  await db.exec(migration('20261120135614_unify_availability_hajj_finance'));
  await db.exec(`CREATE TRIGGER fixture_linked_passenger_guard BEFORE INSERT OR UPDATE OR DELETE ON public.pilgrims
    FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_passenger();`);

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

  await db.exec('RESET ROLE');
  const hajjProgram = id(701);
  const [hajjDirect, hajjHold, failed] = [702, 703, 704].map(id);
  await q(`INSERT INTO public.pilgrimage_programs
    (id, organization_id, program_type, name, status, capacity, price_quad, departure_date, return_date, sales_confirmed_at)
    VALUES ($1, $2, 'hajj', 'Hajj finance fixture', 'open', 4, 33500, $3, $4, now())`, hajjProgram, org, dates.departure, dates.return);
  await actor(manager);
  await q("SET test.block_permission = 'invoices_create'");
  await assert.rejects(book(failed, 'book', ['Unpermitted traveler'], { program: hajjProgram }), /umrah_unified_invoice_permission/);
  await book(hajjHold, 'hold', [], { program: hajjProgram, party: 2 });
  await assert.rejects(confirm(hajjHold, ['Held traveler one', 'Held traveler two']), /umrah_unified_invoice_permission/);
  assert.equal((await rows('SELECT status FROM pilgrimage_seat_allocations WHERE sale_id=$1', hajjHold))[0].status, 'held');
  assert.equal((await rows('SELECT count(*)::int AS n FROM pilgrims WHERE program_id=$1', hajjProgram))[0].n, 0);
  await q('RESET test.block_permission');
  await q("SET test.fail_posting = 'true'");
  await assert.rejects(book(failed, 'book', ['Booking without journal'], { program: hajjProgram }), /umrah_unified_invoice_not_created/);
  assert.deepEqual(await rows('SELECT id FROM pilgrimage_sales WHERE id=$1', failed), []);
  await q('RESET test.fail_posting');

  await book(hajjDirect, 'book', ['Direct Hajj traveler'], { program: hajjProgram });
  await book(hajjDirect, 'book', ['Direct Hajj traveler'], { program: hajjProgram });
  const [hajjConfirmed] = (await confirm(hajjHold, ['Held traveler one', 'Held traveler two'])).rows;
  assert.deepEqual((await confirm(hajjHold, ['Held traveler one', 'Held traveler two'])).rows, [hajjConfirmed]);
  const hajjConfirmedId = Object.values(hajjConfirmed)[0];
  await q(`UPDATE pilgrims SET makkah_room='501', gender='female' WHERE inventory_booking_id=$1`, hajjDirect);
  assert.deepEqual(await rows('SELECT makkah_room, gender FROM pilgrims WHERE inventory_booking_id=$1', hajjDirect),
    [{ makkah_room: '501', gender: 'female' }]);
  await assert.rejects(q("UPDATE pilgrims SET status='cancelled' WHERE inventory_booking_id=$1", hajjDirect), /umrah_inventory_room_change_required/);

  await db.exec('RESET ROLE');
  for (const [reference, type, passengers] of [
    [booking, 'umrah', 1], [Object.values(confirmed.rows[0])[0], 'umrah', 2],
    [hajjDirect, 'hajj', 1], [hajjConfirmedId, 'hajj', 2],
  ]) {
    const [linked] = await rows(`SELECT b.id, b.booking_type, b.booking_number, b.customer_id, b.currency,
      i.final_amount::int AS amount, i.booking_type AS invoice_type, u.passenger_count,
      (SELECT count(*)::int FROM pilgrims g WHERE g.inventory_booking_id=u.id) AS registered,
      (SELECT count(*)::int FROM journal_entries j WHERE j.source_id=i.id AND j.status='posted') AS posted,
      (SELECT count(*)::int FROM invoice_items x WHERE x.invoice_id=i.id) AS lines
      FROM umrah_inventory_bookings u JOIN bookings b ON b.id=u.booking_id JOIN invoices i ON i.booking_id=b.id
      WHERE u.availability_sale_id=$1`, reference);
    assert.deepEqual({ ...linked, booking_number: linked.booking_number.split('-')[0] }, {
      id: reference, booking_type: type, booking_number: type === 'hajj' ? 'HAJ' : 'UMR', customer_id: customer,
      currency: 'EGP', amount: passengers * 33500, invoice_type: type, passenger_count: passengers,
      registered: passengers, posted: 1, lines: 1,
    });
  }
  assert.deepEqual(await rows('SELECT id FROM bookings WHERE id=ANY($1::uuid[])', [hold, hajjHold, failed]), []);
  const legacyHajj = id(705);
  await q(`INSERT INTO pilgrims (id, organization_id, program_id, customer_id, full_name, room_type)
    VALUES ($1,$2,$3,$4,'Legacy Hajj traveler','quad')`, legacyHajj, org, hajjProgram, customer);
  const [hajjTraveler] = await rows('SELECT id FROM pilgrims WHERE inventory_booking_id=$1', hajjDirect);
  await actor(manager);
  const operation = (id, passenger, action = 'cancel') => q(`
    SELECT public.apply_pilgrimage_operations($1,$2,$3::jsonb)`, org, hajjProgram, [{
      id, pilgrim_id: passenger, action, reason: 'QA cancellation', expected_price: 33500,
      expected_net_paid: 0, expected_room_type: 'quad', fee: 500,
    }]);
  await assert.rejects(operation(id(706), legacyHajj), { code: '42501' });
  await assert.rejects(operation(id(707), hajjTraveler.id, 'transfer'), { code: '42501' });
  await q("SET test.block_permission = 'bookings_cancel'");
  await assert.rejects(operation(id(708), hajjTraveler.id), { code: '42501' });
  await q('RESET test.block_permission');
  for (const attempt of [await operation(id(709), hajjTraveler.id), await operation(id(709), hajjTraveler.id)]) {
    const [cancellation] = attempt.rows[0].apply_pilgrimage_operations;
    assert.equal(cancellation.id, id(709));
    assert.equal(cancellation.refund_id, null);
  }
  await db.exec('RESET ROLE');
  assert.deepEqual(await rows(`SELECT b.status, b.selling_price::int AS sale_amount, i.remaining_amount::int AS balance,
    (SELECT count(*)::int FROM journal_entries j WHERE j.source_type='booking_cancellation_invoice_credit' AND j.source_id=$2) AS credits
    FROM bookings b JOIN invoices i ON i.booking_id=b.id WHERE b.id=$1`, hajjDirect, id(709)),
    [{ status: 'cancelled', sale_amount: 500, balance: 500, credits: 1 }]);
  assert.equal((await rows('SELECT status FROM pilgrims WHERE id=$1', legacyHajj))[0].status, 'registered');
  console.log('Hajj and Umrah direct and held availability, finance links, rollback, retries, permissions, Hajj rooming and scoped cancellation passed.');
} finally {
  await db.close();
}
