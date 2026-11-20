import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(path, 'utf8');
const fixture = sql => sql.replace(/^\\set .+$/gm, '').replace(/^\\i (\S+)$/gm, (_, path) => fixture(read(path)));
const migration = stem => read('supabase/migrations/' +
  readdirSync('supabase/migrations').find(name => name.includes(stem)));
const section = (source, first, last) => source.slice(source.indexOf(first), source.indexOf(last));
const db = new PGlite();

try {
  const retail = read('scripts/test-pilgrimage-retail-registration.sql');
  await db.exec(fixture(retail.slice(0, retail.indexOf('DO $$'))));
  await db.exec(`
    ALTER TABLE public.customers ADD COLUMN archived_at timestamptz;
    ALTER TABLE public.pilgrims
      ADD COLUMN b2b_roster_entry_id uuid, ADD COLUMN gender text, ADD COLUMN phone text,
      ADD COLUMN birth_date date, ADD COLUMN nationality text, ADD COLUMN mahram_name text,
      ADD COLUMN mahram_relation text, ADD COLUMN room_group text, ADD COLUMN notes text,
      ADD COLUMN visa_number text, ADD COLUMN portal_barcode text,
      ADD COLUMN vaccination_done boolean, ADD COLUMN cancelled_at timestamptz;
    ALTER TABLE public.customer_payments ADD COLUMN amount_base numeric, ADD COLUMN booking_id uuid, ADD COLUMN invoice_id uuid;
    CREATE SCHEMA private;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE SCHEMA pilgrimage_operations_private;
    CREATE SCHEMA refund_balance_private;
    CREATE SCHEMA trip_amendment_private;
    CREATE FUNCTION public.can_org_write(org uuid) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org)';
    CREATE FUNCTION public.has_org_permission(org uuid, permission text) RETURNS boolean LANGUAGE sql STABLE
      AS 'SELECT public.user_belongs_to_org(auth.uid(), org) AND
          (permission <> ''bookings_cancel'' OR coalesce(current_setting(''test.deny_cancel'', true), '''') <> ''true'')';
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, customer_id uuid, booking_type text,
      currency text DEFAULT 'EGP', status text DEFAULT 'confirmed', is_demo boolean DEFAULT false, selling_price numeric);
    CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
      booking_id uuid, remaining_amount numeric, final_amount numeric, total_paid_amount numeric DEFAULT 0);
    GRANT SELECT ON public.invoices, public.bookings TO authenticated;
    CREATE TABLE public.fixture_supplier_docs (booking_id uuid PRIMARY KEY);
    CREATE TABLE public.fixture_closed_groups (booking_id uuid PRIMARY KEY);
    CREATE TABLE public.refund_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
      amount numeric, status text);
    CREATE TABLE public.refund_balance_settlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid, amount numeric);
    CREATE TABLE public.booking_timeline_events (organization_id uuid, booking_id uuid, kind text, actor_id uuid, summary text, payload jsonb);
  `);
  const rooming = migration('20261113191300_umrah_rooming_groups.sql');
  await db.exec(section(rooming, 'CREATE TABLE public.umrah_rooming_groups', 'DO $patch$'));
  const inventory = migration('20261117023644_umrah_departure_room_inventory.sql');
  await db.exec(section(inventory, 'ALTER TABLE public.pilgrimage_programs', 'CREATE FUNCTION pilgrimage_inventory_private.configure'));
  await db.exec(`
    ALTER TABLE public.umrah_inventory_bookings ADD COLUMN booking_id uuid, ADD COLUMN availability_sale_id uuid;
    CREATE TABLE pilgrimage_inventory_private.booking_staff (booking_id uuid PRIMARY KEY, organization_id uuid,
      operations_user_id uuid, seller_employee_id uuid, seller_name text);
    CREATE TABLE pilgrimage_inventory_private.booking_edit_requests (booking_id uuid, requested_by uuid,
      status text, expires_at timestamptz);
    CREATE FUNCTION private.pilgrimage_sales_ready(p public.pilgrimage_programs) RETURNS boolean
      LANGUAGE sql AS 'SELECT p.status = ''open''';
    CREATE FUNCTION private.pilgrimage_room_price(p public.pilgrimage_programs, category text) RETURNS numeric
      LANGUAGE sql AS 'SELECT CASE category WHEN ''quad'' THEN p.price_quad WHEN ''double'' THEN p.price_double END';
    CREATE FUNCTION pilgrimage_inventory_private.is_manual_allotment(org uuid, booking uuid) RETURNS boolean
      LANGUAGE sql AS 'SELECT EXISTS (SELECT FROM public.umrah_inventory_bookings
        WHERE organization_id = org AND id = booking AND availability_sale_id IS NOT NULL)';
  `);
  await db.exec(section(inventory, 'DO $patch$', "  SELECT pg_get_functiondef('private.guard_pilgrimage_sales_inventory()")
    .replace('NEW.total_price:=CASE WHEN NEW.b2b_roster_entry_id IS NULL THEN v_price ELSE 0 END;', 'NEW.total_price:=v_price;')
    + 'END $patch$;');

  const operations = migration('20261113185820_pilgrimage_operations.sql');
  await db.exec(section(operations, 'CREATE TABLE public.pilgrimage_operations', '-- Preserve existing quote'));
  await db.exec(`
    ALTER TABLE public.pilgrimage_operations ADD COLUMN unified_exchange boolean NOT NULL DEFAULT false,
      ADD COLUMN replacement_booking_id uuid REFERENCES public.bookings,
      ADD COLUMN reapplied_settlement_id uuid REFERENCES public.refund_balance_settlements,
      ADD COLUMN reapplied_amount numeric DEFAULT 0;
  `);
  const guard = migration('20261119165402_unify_availability_umrah_finance.sql');
  await db.exec(section(guard, 'CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.guard_passenger()', 'DO $update_functions$')
    .replace("a.action = 'cancel'", "(a.action = 'cancel' OR a.unified_exchange)"));
  await db.exec(`CREATE TRIGGER room_stock_guard BEFORE INSERT OR UPDATE OR DELETE ON public.pilgrims
    FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_passenger();`);
  const staff = migration('20261117164840_pilgrimage_staff_commissions_and_edit_approval.sql');
  await db.exec(section(staff, 'CREATE FUNCTION pilgrimage_inventory_private.guard_booked_passenger_edit()',
    'CREATE TRIGGER zz_pilgrimage_booking_edit_gate')
    .replace("o.action='cancel'", "(o.action='cancel' OR o.unified_exchange)"));
  await db.exec(`CREATE TRIGGER staff_booked_edit_guard BEFORE UPDATE ON public.pilgrims
    FOR EACH ROW WHEN (OLD.inventory_booking_id IS NOT NULL)
    EXECUTE FUNCTION pilgrimage_inventory_private.guard_booked_passenger_edit();`);
  await db.exec(section(migration('20261119154850_pilgrimage_availability_bookings.sql'),
    'CREATE FUNCTION pilgrimage_inventory_private.require_availability_booking',
    'CREATE FUNCTION pilgrimage_inventory_private.book_from_availability'));
  await db.exec(section(inventory, 'CREATE FUNCTION pilgrimage_inventory_private.create_booking(',
    'CREATE FUNCTION public.configure_umrah_room_inventory('));

  // The existing allocator and operations RPC run unmodified apart from their
  // released routing changes. Complicated finance tables are replaced with
  // transactional stand-ins, so this test can verify ordering and rollback.
  await db.exec(`
    CREATE FUNCTION pilgrimage_inventory_private.create_with_staff(org uuid, program uuid, booking uuid,
      customer uuid, room text, mode text, travelers jsonb, price numeric, seller uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      PERFORM pilgrimage_inventory_private.create_booking(org,program,booking,customer,room,mode,travelers,price);
      INSERT INTO public.bookings (id,organization_id,customer_id,booking_type,selling_price) VALUES(booking,org,customer,'umrah',price);
      INSERT INTO public.invoices (organization_id,booking_id,remaining_amount,final_amount) VALUES(org,booking,price,price);
      INSERT INTO pilgrimage_inventory_private.booking_staff VALUES(booking,org,auth.uid(),seller,NULL);
      UPDATE public.umrah_inventory_bookings SET booking_id=booking WHERE id=booking;
      RETURN booking;
    END $$;
    CREATE FUNCTION pilgrimage_inventory_private.book_from_availability(uuid,uuid,uuid,uuid,text,integer,text,numeric,text,date,date,text[])
    RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE FUNCTION refund_balance_private.settle(uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,text)
    RETURNS uuid LANGUAGE sql AS $$
      INSERT INTO public.refund_balance_settlements(invoice_id,amount) VALUES($7,$5) RETURNING id;
    $$;
    CREATE FUNCTION trip_amendment_private.can_settle_cancellation(org uuid) RETURNS boolean
    LANGUAGE sql AS 'SELECT public.has_org_permission(org, ''bookings_cancel'')';
    CREATE FUNCTION trip_amendment_private.cancellation_preview(b public.bookings) RETURNS jsonb
    LANGUAGE sql AS $$
      SELECT jsonb_build_object('invoices', jsonb_agg(jsonb_build_object('paid', i.total_paid_amount,'due',i.remaining_amount)))
      FROM public.invoices i WHERE i.booking_id=b.id AND i.organization_id=b.organization_id
    $$;
    CREATE FUNCTION trip_amendment_private.supplier_cancellation_preview(b public.bookings) RETURNS jsonb
    LANGUAGE sql AS $$
      SELECT CASE WHEN EXISTS (SELECT FROM public.fixture_supplier_docs WHERE booking_id=b.id)
        THEN '[{}]'::jsonb ELSE '[]'::jsonb END
    $$;
    CREATE FUNCTION simulate_cancelled_passenger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE refund uuid;
    BEGIN
      IF NEW.full_name = 'Female guest' THEN
        INSERT INTO public.refund_requests(organization_id,amount,status)
          VALUES(NEW.organization_id,1500,'approved') RETURNING id INTO refund;
        UPDATE public.pilgrimage_operations SET refund_id=refund
          WHERE pilgrim_id=NEW.id AND transaction_id=txid_current();
      END IF;
      IF EXISTS (SELECT FROM public.pilgrimage_operations WHERE pilgrim_id=NEW.id AND transaction_id=txid_current()
          AND request->>'scope'='private_room_group') THEN
        UPDATE public.invoices SET remaining_amount=remaining_amount-NEW.total_price WHERE booking_id=NEW.inventory_booking_id;
        UPDATE public.bookings SET selling_price=selling_price-NEW.total_price WHERE id=NEW.inventory_booking_id;
        -- The production trigger inserts a unique close record whenever it sees
        -- the last traveler leave. A bulk UPDATE would try that twice.
        IF NOT EXISTS (SELECT FROM public.pilgrims WHERE inventory_booking_id=NEW.inventory_booking_id AND status<>'cancelled') THEN
          INSERT INTO public.fixture_closed_groups VALUES(NEW.inventory_booking_id);
          UPDATE public.bookings SET status='cancelled' WHERE id=NEW.inventory_booking_id;
        END IF;
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER settle_cancellation AFTER UPDATE OF status ON public.pilgrims FOR EACH ROW
      WHEN (NEW.status='cancelled' AND OLD.status<>'cancelled') EXECUTE FUNCTION simulate_cancelled_passenger();
  `);
  await db.exec(section(operations, 'CREATE FUNCTION public.apply_pilgrimage_operations(',
      'CREATE FUNCTION public.get_pilgrimage_operation_refunds(')
    .replace("    refund_amount := greatest(net_paid", `    IF action_name <> 'cancel' AND pilgrimage_inventory_private.is_manual_allotment(passenger.organization_id, passenger.inventory_booking_id) THEN
      result := result || pilgrimage_inventory_private.exchange_allotment_passenger(passenger, destination, request, new_price);
      CONTINUE;
    END IF;
    refund_amount := greatest(net_paid`)
    .replace("'replacement_id', operation.replacement_id);",
      "'replacement_id', operation.replacement_id, 'replacement_booking_id', operation.replacement_booking_id);"));
  await db.exec(migration('amend_room_stock_pilgrimage_passengers.sql'));
  await db.exec(migration('amend_unpaid_private_pilgrimage_room_groups.sql'));

  const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const [org, foreign, manager, agent, customer, source, destination, blocked, nonStock,
    foreignProgram, groupDestination, travelerBooking, takenBooking, privateBooking] =
    [1, 2, 11, 12, 101, 601, 602, 603, 604, 605, 606, 611, 612, 613].map(id);
  const rows = async (sql, ...params) => (await db.query(sql, params)).rows;
  const value = async (sql, ...params) => Object.values((await rows(sql, ...params))[0])[0];
  for (const [program, company, stock] of [[source,org,true], [destination,org,true], [blocked,org,true],
    [nonStock,org,false], [foreignProgram,foreign,true], [groupDestination,org,true]]) {
    await db.query(`INSERT INTO public.pilgrimage_programs
      (id,organization_id,name,capacity,makkah_nights,madinah_nights,price_quad,price_double,departure_date,return_date,
       uses_room_inventory,inventory_private_prices)
      VALUES($1,$2,'Synthetic departure',3,3,2,2500,3000,current_date+7,current_date+12,$3,
        '{"quad":{"method":"fixed","per_person":{"2":3000}},"double":{"method":"supplement","per_empty_bed":0}}')`, [program,company,stock]);
  }
  for (const [program, category] of [[source,'quad'],[source,'double'],[destination,'quad'],[blocked,'quad'],
    [groupDestination,'quad'],[groupDestination,'double']]) {
    await db.query(`INSERT INTO public.umrah_rooming_groups(organization_id,program_id,city,gender,room_type,group_number,created_by,inventory_room)
      SELECT $1::uuid,$2::uuid,city,'male',$3,n,$4::uuid,true FROM unnest(ARRAY['makkah','madinah']) city
      CROSS JOIN generate_series(1,CASE WHEN $2=$5 AND $3='quad' THEN 2 ELSE 1 END) n`, [org,program,category,manager,source]);
  }
  await db.query("SELECT set_config('test.user_id',$1,false)", [manager]);
  const seed = (program, booking, mode, travelers, price) => db.query(
    "SELECT pilgrimage_inventory_private.create_with_staff($1,$2,$3,$4,'quad',$5,$6,$7,NULL)",
    [org, program, booking, customer, mode, JSON.stringify(travelers), price]);
  await seed(source, travelerBooking, 'shared', [{full_name:'Female guest',gender:'female'}], 2500);
  await seed(destination, takenBooking, 'shared', [{full_name:'Male occupant',gender:'male'}], 2500);
  // The same program keeps a separate full private allocation while the
  // shared passenger changes category and later moves away.
  await seed(source, privateBooking, 'private', [{full_name:'Parent guest',gender:'male'},
    {full_name:'Child guest',gender:'female'}], 6000);
  await assert.rejects(db.query("UPDATE public.pilgrims SET phone='fixture-phone' WHERE inventory_booking_id=$1", [travelerBooking]),
    /pilgrimage_booking_edit_locked/);
  const traveler = await value('SELECT id FROM public.pilgrims WHERE inventory_booking_id=$1', travelerBooking);
  const privateTraveler = await value('SELECT id FROM public.pilgrims WHERE inventory_booking_id=$1 ORDER BY id LIMIT 1', privateBooking);
  await db.exec("ALTER TABLE public.pilgrims DISABLE TRIGGER staff_booked_edit_guard");
  await db.query("UPDATE public.pilgrims SET phone='fixture-phone',visa_status='issued',documents_complete=true WHERE id=$1", [traveler]);
  await db.exec("ALTER TABLE public.pilgrims ENABLE TRIGGER staff_booked_edit_guard");
  const operation = (idNumber, pilgrim, action, target, current = 'quad', price = 2500, room = 'quad') => ({
    id:id(idNumber), pilgrim_id:pilgrim, action, reason:'Verified replacement', fee:0, room_type:room,
    target_program_id:target, expected_price:price, expected_new_price:room === 'double' ? 3000 : 2500,
    expected_net_paid:0, expected_room_type:current,
  });
  const apply = async req => value('SELECT public.apply_pilgrimage_operations($1,$2,$3)', org, source, JSON.stringify([req]));
  const status = pilgrim => value('SELECT status FROM public.pilgrims WHERE id=$1', pilgrim);

  await db.exec('SET ROLE authenticated');
  const move = operation(620, traveler, 'transfer', destination);
  await assert.rejects(apply(move), /umrah_inventory_rooms_exhausted/);
  assert.equal(await status(traveler), 'registered');
  assert.equal(await value('SELECT count(*)::int FROM public.pilgrimage_operations WHERE id=$1', move.id), 0);
  await db.query('UPDATE public.pilgrimage_programs SET capacity=1 WHERE id=$1', [destination]);
  await assert.rejects(apply(move), /umrah_inventory_air_seats_exhausted/);
  assert.equal(await status(traveler), 'registered');
  await assert.rejects(apply(operation(621, traveler, 'transfer', foreignProgram)), /pilgrimage_transfer_program_unavailable/);
  await assert.rejects(apply(operation(622, traveler, 'transfer', nonStock)), /pilgrimage_transfer_inventory_mode_mismatch/);
  await assert.rejects(apply(operation(623, privateTraveler, 'room_category', null, 'quad', 3000, 'double')),
    /pilgrimage_private_room_requires_group_amendment/);
  const change = operation(624, traveler, 'room_category', null, 'quad', 2500, 'double');
  await db.exec("SET test.deny_cancel='true'");
  await assert.rejects(apply(change), {code:'42501'});
  await db.exec("RESET test.deny_cancel");
  await db.query("SELECT set_config('test.user_id',$1,false)", [agent]);
  await assert.rejects(apply(change), {code:'42501'});
  await db.query("SELECT set_config('test.user_id',$1,false)", [manager]);
  const [changed] = await apply(change);
  assert.deepEqual(await apply(change), [changed]);
  await assert.rejects(apply({...change, reason:'Different payload'}), /pilgrimage_operation_id_used/);
  assert.equal(await status(traveler), 'cancelled');
  const [changedRow] = await rows(`SELECT p.room_type,p.gender,p.phone,p.visa_status,m.gender AS makkah,d.gender AS madinah
    FROM public.pilgrims p JOIN public.umrah_rooming_groups m ON m.id=p.makkah_rooming_group_id
    JOIN public.umrah_rooming_groups d ON d.id=p.madinah_rooming_group_id WHERE p.id=$1`, changed.replacement_id);
  assert.deepEqual(changedRow, {room_type:'double',gender:'female',phone:'fixture-phone',visa_status:'issued',makkah:'female',madinah:'female'});

  const accepted = operation(625, changed.replacement_id, 'transfer', blocked, 'double', 3000);
  const [transferred] = await apply(accepted);
  assert.deepEqual(await apply(accepted), [transferred]);
  const [moved] = await rows('SELECT program_id,gender,phone,visa_status,documents_complete FROM public.pilgrims WHERE id=$1', transferred.replacement_id);
  assert.deepEqual(moved, {program_id:blocked,gender:'female',phone:'fixture-phone',visa_status:'not_started',documents_complete:false});
  assert.equal(await status(changed.replacement_id), 'cancelled');
  await db.exec('RESET ROLE');
  assert.equal(await value('SELECT count(*)::int FROM public.refund_balance_settlements WHERE amount=1500'), 2);
  assert.equal(await value("SELECT count(*)::int FROM public.booking_timeline_events WHERE kind='umrah_passenger_amended'"), 4);
  assert.equal(await value("SELECT count(*)::int FROM public.pilgrims WHERE inventory_booking_id=$1 AND status='registered'", privateBooking), 2);
  assert.equal(await value('SELECT count(*)::int FROM public.refund_requests'), 2);
  assert.equal(await value('SELECT count(*)::int FROM public.pilgrimage_operations'), 2);
  console.log('Room-stock amendment, same-gender placement, atomic rollback, tenant gate, private-family guard and retry passed.');

  const groupAmend = (booking, operationId, target, room = 'quad', total = 6000, reason = 'Family agreed to move') =>
    value('SELECT public.amend_pilgrimage_private_group($1,$2,$3,$4,$5,$6,$7)', org, booking, id(operationId), target, room, total, reason);
  const groupStatus = booking => value('SELECT status FROM public.bookings WHERE id=$1', booking);
  const groupDue = booking => value('SELECT remaining_amount::int FROM public.invoices WHERE booking_id=$1', booking);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(groupAmend(privateBooking, 630, foreignProgram), /pilgrimage_transfer_program_unavailable/);
  await assert.rejects(groupAmend(privateBooking, 630, blocked), /umrah_inventory_rooms_exhausted/);
  assert.equal(await groupDue(privateBooking), 6000);
  assert.equal(await groupStatus(privateBooking), 'confirmed');
  assert.equal(await value('SELECT count(*)::int FROM public.pilgrimage_operations'), 2);

  await db.exec('RESET ROLE');
  await db.query('UPDATE public.invoices SET total_paid_amount=100,remaining_amount=5900 WHERE booking_id=$1', [privateBooking]);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(groupAmend(privateBooking, 630, groupDestination), /pilgrimage_private_group_finance_review_required/);
  await db.exec('RESET ROLE');
  await db.query('UPDATE public.invoices SET total_paid_amount=0,remaining_amount=6000 WHERE booking_id=$1', [privateBooking]);
  await db.query("INSERT INTO public.customer_payments(id,organization_id,booking_id,amount,status) VALUES($1,$2,$3,100,'pending')",
    [id(640), org, privateBooking]);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(groupAmend(privateBooking, 630, groupDestination), /pilgrimage_private_group_finance_review_required/);
  await db.exec('RESET ROLE');
  await db.query('DELETE FROM public.customer_payments WHERE id=$1', [id(640)]);
  await db.query('INSERT INTO fixture_supplier_docs VALUES($1)', [privateBooking]);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(groupAmend(privateBooking, 630, groupDestination), /pilgrimage_private_group_finance_review_required/);
  await db.exec('RESET ROLE');
  await db.query('DELETE FROM fixture_supplier_docs WHERE booking_id=$1', [privateBooking]);
  await db.query("UPDATE public.pilgrimage_programs SET inventory_private_prices=jsonb_set(inventory_private_prices,'{quad,per_person,2}','3100') WHERE id=$1",
    [groupDestination]);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(groupAmend(privateBooking, 630, groupDestination), /umrah_inventory_price_changed/);
  assert.equal(await groupDue(privateBooking), 6000);
  assert.equal(await groupStatus(privateBooking), 'confirmed');
  assert.equal(await value("SELECT count(*)::int FROM public.pilgrims WHERE inventory_booking_id=$1 AND status='registered'", privateBooking), 2);

  await db.query("SELECT set_config('test.user_id',$1,false)", [agent]);
  await assert.rejects(groupAmend(privateBooking, 630, source, 'double'), {code:'42501'});
  await db.query("SELECT set_config('test.user_id',$1,false)", [manager]);
  const category = await groupAmend(privateBooking, 630, source, 'double');
  assert.deepEqual(category, {id:id(630), replacement_booking_id:id(630), passenger_count:2});
  assert.deepEqual(await groupAmend(privateBooking, 630, source, 'double'), category);
  await assert.rejects(groupAmend(privateBooking, 630, source, 'double', 6000, 'Another reason'), /pilgrimage_operation_id_used/);
  assert.equal(await groupDue(privateBooking), 0);
  assert.equal(await groupStatus(privateBooking), 'cancelled');
  const movedGroup = await groupAmend(id(630), 631, groupDestination, 'double');
  assert.equal(movedGroup.passenger_count, 2);
  const [privateRooms] = await rows(`SELECT count(*)::int AS passengers, count(DISTINCT p.makkah_rooming_group_id)::int AS makkah,
      count(DISTINCT p.madinah_rooming_group_id)::int AS madinah, array_agg(DISTINCT p.gender ORDER BY p.gender) AS genders,
      array_agg(DISTINCT m.gender ORDER BY m.gender) AS makkah_modes
    FROM public.pilgrims p JOIN public.umrah_rooming_groups m ON m.id=p.makkah_rooming_group_id
    WHERE p.inventory_booking_id=$1 AND p.status='registered'`, id(631));
  assert.deepEqual(privateRooms, {passengers:2,makkah:1,madinah:1,genders:['female','male'],makkah_modes:['family']});
  assert.equal(await groupDue(id(631)), 6000);
  assert.equal(await value("SELECT count(*)::int FROM public.pilgrimage_operations WHERE request->>'group_operation_id'=$1", id(631)), 2);
  await db.exec('RESET ROLE');
  assert.equal(await value('SELECT count(*)::int FROM public.fixture_closed_groups'), 2);
  await db.exec('SET ROLE anon');
  await assert.rejects(groupAmend(privateBooking, 630, source, 'double'), {code:'42501'});
  console.log('Whole unpaid private room repricing rejection, stock rollback, equal-price change and move passed.');
} finally {
  await db.close();
}
