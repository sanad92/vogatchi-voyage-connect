import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(read('src/lib/travelDocuments.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { buildVoucherModel, fmtDate, getTravelServiceSections, voucherCopyIsStale } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const linked = (kind, id, details, cancelled = false) =>
  ({ kind, id, itinerary: { [kind]: details }, cancelled, updatedAt: '2026-11-20T12:00:00Z' });
const source = {
  booking: { booking_number: 'BK-TEST', destination: 'Cairo', start_date: '2026-11-23', end_date: '2026-11-27' },
  itinerary: { flight: { id: 'native-flight', airline: 'Synthetic Air', flight_number: 'SA21',
    return_flight_number: 'SA22', return_departure_airport: 'LXR', return_arrival_airport: 'CAI',
    return_arrival_date: '2026-11-27', return_arrival_time: '18:30', cost_amount: 894341 } },
  linkedServices: [
    linked('hotel', 'hotel', { hotel_name: 'Synthetic Hotel', meal_plan: 'HB', room_type: 'Family suite', adults: 2, children: 1 }),
    linked('flight', 'linked-flight', { airline: 'Synthetic Flight', departure_airport: 'CAI', arrival_airport: 'LXR',
      flight_class: 'اقتصادي', ticket_numbers: ['TEST-TICKET-A', 'TEST-TICKET-B'] }),
    linked('transport', 'transport', { pickup_point: 'Synthetic Gate', dropoff_point: 'Synthetic Pier', pickup_time: '14:15' }),
    linked('car', 'car', { car_type: 'Synthetic Car', pickup_location: 'Terminal 3', insurance_included: true }),
    linked('hotel', 'hotel-cancelled', { hotel_name: 'Cancelled Hotel' }, true),
  ],
  amendments: [
    { service_kind: 'flight', service_id: 'linked-flight', service_source: 'linked', operation: 'cancel',
      ticket_number: 'TEST-TICKET-A', applied_at: '2026-11-21T12:00:00Z' },
    { service_kind: 'car', service_id: 'car', service_source: 'detail', operation: 'cancel', ticket_number: null },
  ],
  specialRequests: [
    { booking_id: 'hotel', special_request_type: { name: 'Cot' } },
    { booking_id: 'hotel', custom_request_text: 'Step-free room' },
    { booking_id: 'hotel', custom_request_text: 'Step-free room' },
    { booking_id: 'hotel-cancelled', custom_request_text: 'Cancelled request' },
  ],
};
const voucher = buildVoucherModel('VCH-TEST', source);
const encoded = JSON.stringify(voucher);
assert.equal(voucher.sections.length, 5);
for (const expected of ['Synthetic Hotel', 'Family suite', 'نصف إقامة', 'Synthetic Air', 'Synthetic Flight',
  'Synthetic Gate', '14:15', 'Synthetic Car', 'SA22', '18:30', 'TEST-TICKET-B']) {
  assert.ok(encoded.includes(expected), expected + ' should appear in the voucher');
}
for (const forbidden of ['894341', 'TEST-TICKET-A', 'Cancelled Hotel', 'Cancelled request']) {
  assert.ok(!encoded.includes(forbidden), forbidden + ' should stay outside the voucher');
}
assert.deepEqual(voucher.specialRequests, ['Cot', 'Step-free room']);
assert.ok(getTravelServiceSections(source).some(s => s.serviceId === 'hotel-cancelled' && s.cancelled));
assert.equal(voucherCopyIsStale(source, '2026-11-21T11:59:59Z'), true);
assert.equal(voucherCopyIsStale(source, '2026-11-21T12:00:01Z'), false);
assert.equal(buildVoucherModel('VCH-TEST', {
  booking: source.booking, linkedServices: [source.linkedServices.at(-1)],
}).sections.length, 0, 'an all-cancelled itinerary must not regrow a generic active service');
const mirrored = {
  booking: { ...source.booking, legacy_table: 'hotel_bookings', legacy_id: 'hotel' },
  itinerary: { hotel: { id: 'snapshot-hotel', hotel_name: 'Synthetic Hotel' } },
  linkedServices: [source.linkedServices[0]],
};
assert.equal(getTravelServiceSections(mirrored).length, 1, 'represent a legacy mirror once');
assert.equal(buildVoucherModel('VCH-TEST', {
  ...mirrored,
  amendments: [{ service_kind: 'hotel', service_id: 'snapshot-hotel', service_source: 'detail', operation: 'cancel', ticket_number: null }],
}).sections.length, 0, 'a cancellation on the original snapshot must also remove its mirror from the voucher');
assert.equal(fmtDate('2026-11-20'), '20 Nov 2026');
console.log('Workspace and voucher projection checks passed.');

const db = new PGlite();
const ids = {
  org: '10000000-0000-0000-0000-000000000001',
  foreignOrg: '10000000-0000-0000-0000-000000000002',
  booking: '20000000-0000-0000-0000-000000000001',
  foreignBooking: '20000000-0000-0000-0000-000000000002',
  member: '30000000-0000-0000-0000-000000000001',
  ownMember: '30000000-0000-0000-0000-000000000002',
  unassignedMember: '30000000-0000-0000-0000-000000000003',
  request: '40000000-0000-0000-0000-000000000001',
  invalidRequest: '40000000-0000-0000-0000-000000000002',
  existingHotel: '50000000-0000-0000-0000-000000000001',
};

try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA operations_private;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('test.user_id', true), '')::uuid $$;
    CREATE TABLE public.organization_members (organization_id uuid, user_id uuid, is_active boolean, scope text);
    CREATE FUNCTION public.can_org_write(uuid) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT EXISTS (SELECT FROM public.organization_members WHERE organization_id = $1 AND user_id = auth.uid() AND is_active AND scope = 'organization') $$;
    CREATE FUNCTION public.has_org_permission(uuid, text) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT public.can_org_write($1) $$;
    CREATE FUNCTION public._org_permission_state(uuid, uuid, text)
      RETURNS TABLE(granted boolean, data_scope text) LANGUAGE sql STABLE
      AS $$ SELECT true, scope FROM public.organization_members WHERE organization_id = $1 AND user_id = $2 $$;
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, status text, workflow_stage text);
    CREATE FUNCTION operations_private.owns_booking(uuid, uuid) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT $1 = '${ids.booking}'::uuid AND $2 = '${ids.ownMember}'::uuid $$;
    CREATE TABLE public.hotel_bookings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid REFERENCES public.bookings(id),
      customer_id uuid, customer_name text, booking_agent_name text, booking_agent_id uuid, hotel_id uuid,
      hotel_name text, hotel_star_rating int, destination_city text, check_in_date date, check_out_date date,
      number_of_nights int, number_of_rooms int, room_type text, room_view text, number_of_adults int,
      number_of_children int, children_ages text, meal_plan text, booking_reference_supplier text, cancellation_policy text,
      supplier_id uuid, supplier_name text, cost_per_night numeric, selling_price_per_night numeric, additional_costs numeric,
      vat_amount numeric, vat_included boolean, commission_amount numeric, total_cost_customer numeric, total_profit numeric,
      currency text, payment_method text, paid_amount numeric, remaining_amount numeric, payment_due_date date, status_id uuid,
      booking_source text, internal_notes text, attachment_urls text[]
    );
    CREATE TABLE public.special_request_types(id uuid PRIMARY KEY);
    CREATE TABLE public.booking_special_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, booking_id uuid REFERENCES public.hotel_bookings(id),
      special_request_type_id uuid REFERENCES public.special_request_types(id), custom_request_text text
    );
    CREATE TABLE public.trip_service_amendments (
      id uuid, service_kind text, service_id uuid, service_source text, ticket_number text, terms jsonb,
      resolved_at timestamptz, booking_id uuid, organization_id uuid, status text
    );
    GRANT SELECT ON public.organization_members, public.bookings TO authenticated;
    GRANT SELECT, UPDATE, INSERT, DELETE ON public.hotel_bookings, public.booking_special_requests TO authenticated;
    ALTER TABLE public.booking_special_requests ENABLE ROW LEVEL SECURITY;
    CREATE POLICY request_fixture_tenant ON public.booking_special_requests FOR ALL TO authenticated
      USING (public.can_org_write(organization_id)) WITH CHECK (public.can_org_write(organization_id));
    INSERT INTO public.organization_members VALUES
      ('${ids.org}', '${ids.member}', true, 'organization'),
      ('${ids.org}', '${ids.ownMember}', true, 'own'),
      ('${ids.org}', '${ids.unassignedMember}', true, 'own');
    INSERT INTO public.bookings VALUES ('${ids.booking}', '${ids.org}', 'confirmed', 'confirmed'),
      ('${ids.foreignBooking}', '${ids.foreignOrg}', 'confirmed', 'confirmed');
    INSERT INTO public.hotel_bookings (id, organization_id) VALUES ('${ids.existingHotel}', '${ids.org}');
    INSERT INTO public.booking_special_requests (booking_id, custom_request_text) VALUES ('${ids.existingHotel}', 'Historical request');
    INSERT INTO public.special_request_types VALUES ('${ids.request}');
    INSERT INTO public.trip_service_amendments VALUES (gen_random_uuid(), 'hotel', '${ids.existingHotel}', 'linked', null,
      '{"operation":"cancel","customer_fee":900}', now(), '${ids.booking}', '${ids.org}', 'applied');
  `);
  await db.exec(read('supabase/migrations/20261120135555_repair_booking_itinerary_documents.sql'));
  const act = async user => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('test.user_id', $1, false)", [user]);
    await db.exec('SET ROLE authenticated');
  };
  await act(ids.member);
  const history = async booking => (await db.query('SELECT * FROM public.get_trip_service_amendment_history($1)', [booking])).rows;
  assert.equal((await history(ids.booking))[0].operation, 'cancel');
  assert.ok(!(await history(ids.booking))[0].terms);
  await assert.rejects(history(ids.foreignBooking), /booking_itinerary_access_denied/);
  const requestRows = async hotel => (await db.query('SELECT * FROM public.booking_special_requests WHERE booking_id = $1', [hotel])).rows;
  assert.equal((await requestRows(ids.existingHotel))[0].organization_id, ids.org);
  const create = (booking, requests, custom) => db.query(
    'SELECT public.create_hotel_booking_with_requests($1, $2::jsonb, $3::uuid[], $4) AS hotel',
    [ids.org, JSON.stringify({ booking_id: booking, customer_name: 'Synthetic Customer', hotel_name: 'Synthetic Hotel' }), requests, custom],
  );
  await assert.rejects(create(ids.foreignBooking, [], 'wrong tenant'), /hotel_parent_access_denied/);
  await assert.rejects(create(ids.booking, [ids.invalidRequest], 'invalid request'), /foreign key constraint/);
  const failedHotel = await db.query('SELECT id FROM public.hotel_bookings WHERE booking_id = $1', [ids.booking]);
  assert.equal(failedHotel.rows.length, 0, 'the request failure must roll back the new hotel');

  const result = await create(ids.booking, [ids.request, ids.request], '  Step-free room  ');
  const hotel = result.rows[0].hotel;
  assert.equal(hotel.booking_id, ids.booking);
  const savedRequests = await requestRows(hotel.id);
  assert.equal(savedRequests.length, 2);
  assert.ok(savedRequests.every(request => request.organization_id === ids.org));
  assert.ok(savedRequests.some(request => request.custom_request_text === 'Step-free room'));
  await assert.rejects(db.query('SELECT public.save_hotel_special_requests($1, $2, $3::uuid[], $4)',
    [ids.org, hotel.id, [ids.invalidRequest], null]), /foreign key constraint/);
  assert.equal((await requestRows(hotel.id)).length, 2, 'the replacement failure must preserve prior requests');
  await act(ids.ownMember);
  assert.equal((await history(ids.booking)).length, 1);
  await act(ids.unassignedMember);
  await assert.rejects(history(ids.booking), /booking_itinerary_access_denied/);
  await assert.rejects(create(ids.booking, [ids.request], null), /hotel_requests_access_denied/);
} finally {
  await db.close();
}
console.log('Hotel request atomicity, historical ownership and amendment visibility checks passed.');
