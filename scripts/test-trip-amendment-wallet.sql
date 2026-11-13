ALTER TABLE public.bookings ADD COLUMN status text, ADD COLUMN workflow_stage text, ADD COLUMN is_demo boolean DEFAULT false, ADD COLUMN supplier_id uuid;
ALTER TABLE public.invoices ALTER COLUMN id SET DEFAULT gen_random_uuid(), ADD COLUMN pilgrimage_b2b_agreement_id uuid, ADD COLUMN created_by uuid, ADD COLUMN notes text;
ALTER TABLE public.supplier_payment_orders ALTER COLUMN id SET DEFAULT gen_random_uuid(), ALTER COLUMN approval_status SET DEFAULT 'pending',
  ADD COLUMN service_type text, ADD COLUMN source_type text, ADD COLUMN source_id uuid, ADD COLUMN notes text;
CREATE TABLE public.invoice_items (invoice_id uuid, organization_id uuid, description text, quantity numeric, unit_price numeric, total_price numeric);
CREATE TABLE public.booking_statuses (id uuid PRIMARY KEY, name text);
CREATE FUNCTION public.get_booking_status_id(_name text) RETURNS uuid LANGUAGE sql AS $$
  SELECT id FROM public.booking_statuses WHERE lower(name) = lower(_name);
$$;
INSERT INTO public.booking_statuses VALUES (fixture_id(99), 'Cancelled');
CREATE TABLE public.hotel_bookings (id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status_id uuid, currency text, supplier_id uuid,
  check_in_date date, check_out_date date, total_cost_customer numeric, number_of_nights int DEFAULT 1);
CREATE TABLE public.flight_bookings (id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status_id uuid, currency text,
  departure_date date, arrival_date date, total_cost numeric, ticket_numbers jsonb);
CREATE TABLE public.car_rentals (id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status_id uuid, rental_start_date date, rental_end_date date);
CREATE TABLE public.transport_bookings (id uuid PRIMARY KEY, booking_id uuid, organization_id uuid, status_id uuid, departure_date date, arrival_date date);
CREATE TABLE public.booking_hotel_details (id uuid PRIMARY KEY, booking_id uuid, check_in date, check_out date, nights int, selling_amount numeric);
CREATE TABLE public.booking_flight_details (id uuid PRIMARY KEY, booking_id uuid, departure_date date, arrival_date date, ticket_number text);
CREATE TABLE public.booking_car_details (id uuid PRIMARY KEY, booking_id uuid, pickup_date date, dropoff_date date);
CREATE TABLE public.booking_transport_details (id uuid PRIMARY KEY, booking_id uuid);
INSERT INTO public.hotel_bookings (id, booking_id, organization_id, status_id, currency, supplier_id, check_in_date, check_out_date, total_cost_customer) VALUES
  (fixture_id(701), fixture_id(301), fixture_id(1), NULL, 'EGP', fixture_id(201), '2027-01-01', '2027-01-02', 110),
  (fixture_id(702), fixture_id(302), fixture_id(1), NULL, 'EGP', fixture_id(201), '2027-01-01', '2027-01-02', 100),
  (fixture_id(703), fixture_id(302), fixture_id(1), NULL, 'EGP', fixture_id(201), '2027-01-01', '2027-01-02', 100),
  (fixture_id(704), fixture_id(303), fixture_id(2), NULL, 'EGP', NULL, '2027-01-01', '2027-01-02', 100),
  (fixture_id(706), fixture_id(303), fixture_id(1), NULL, 'EGP', fixture_id(202), '2027-01-01', '2027-01-02', 100);
INSERT INTO public.flight_bookings VALUES (fixture_id(705), fixture_id(302), fixture_id(1), NULL, 'EGP', '2027-01-01', '2027-01-01', 100, '["T001", "T002"]');
INSERT INTO public.organization_members VALUES (fixture_id(1), fixture_id(13), 'owner', true);
UPDATE public.bookings SET status = 'confirmed', workflow_stage = 'confirmed', supplier_id = fixture_id(201);

-- Amendment tests
CREATE FUNCTION public.trip_terms(
  _op text, _rule text, _cancel numeric DEFAULT 0, _fee numeric DEFAULT 0, _fare numeric DEFAULT 0,
  _customer_invoice uuid DEFAULT NULL, _supplier_credit numeric DEFAULT 0, _supplier_invoice uuid DEFAULT NULL,
  _supplier_fee numeric DEFAULT 0, _supplier_fare numeric DEFAULT 0, _new_ticket text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('operation', _op, 'rule', _rule, 'cancel_value', _cancel, 'customer_fee', _fee,
    'fare_delta', _fare, 'customer_invoice_id', _customer_invoice, 'customer_currency', 'EGP', 'policy', 'Provider policy',
    'supplier_wallet', _supplier_credit, 'supplier_invoice_id', _supplier_invoice, 'supplier_currency', 'EGP',
    'supplier_fee', _supplier_fee, 'supplier_fare_delta', _supplier_fare, 'new_ticket', _new_ticket,
    'start_date', CASE WHEN _op = 'change' THEN '2027-02-01' END, 'end_date', CASE WHEN _op = 'change' THEN '2027-02-02' END)
$$;

SET test.user_id = '00000000-0000-0000-0000-000000000010';
SELECT public.record_customer_payment(fixture_id(501),60,'EGP',1,'cash',fixture_id(401));
SELECT public.record_supplier_payment(fixture_id(601),100,'EGP',1,'cash',fixture_id(401));
SELECT create_trip_service_amendment(fixture_id(801),fixture_id(301),'hotel','linked',fixture_id(701),NULL,
  trip_terms('cancel','partial',110,30,0,fixture_id(501),75,(SELECT id FROM supplier_invoices WHERE payment_order_id=fixture_id(601)),25));
SELECT create_trip_service_amendment(fixture_id(802),fixture_id(302),'hotel','linked',fixture_id(702),NULL,trip_terms('cancel','nonrefundable',100,100));
SELECT create_trip_service_amendment(fixture_id(803),fixture_id(302),'hotel','linked',fixture_id(703),NULL,trip_terms('change','free'));
SELECT create_trip_service_amendment(fixture_id(804),fixture_id(302),'flight','linked',fixture_id(705),'T001',
  trip_terms('change','repriced',0,10,20,fixture_id(502),0,(SELECT id FROM supplier_invoices WHERE payment_order_id=fixture_id(602)),5,10,'T003'));

DO $$ BEGIN
  BEGIN
    PERFORM resolve_trip_service_amendment(fixture_id(801),true,'customer','supplier',NULL,50);
    RAISE EXCEPTION 'self review was permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM create_trip_service_amendment(fixture_id(805),fixture_id(303),'hotel','linked',fixture_id(704),NULL,trip_terms('change','free'));
    RAISE EXCEPTION 'cross-organization service was permitted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'cross-organization service was permitted' THEN RAISE; END IF;
  END;
END $$;

SELECT create_trip_service_amendment(fixture_id(806),fixture_id(303),'hotel','linked',fixture_id(706),NULL,
  trip_terms('cancel','full',100,0,0,fixture_id(503)));
SET test.user_id = '00000000-0000-0000-0000-000000000013';
DO $$ BEGIN
  BEGIN
    PERFORM resolve_trip_service_amendment(fixture_id(801),true,'customer','supplier',NULL,49);
    RAISE EXCEPTION 'stale preview was permitted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'stale preview was permitted' THEN RAISE; END IF;
  END;
END $$;
SELECT resolve_trip_service_amendment(fixture_id(801),true,'customer','supplier',NULL,50);
SELECT resolve_trip_service_amendment(fixture_id(801),true,'customer','supplier',NULL,50);
SELECT resolve_trip_service_amendment(fixture_id(802),true,'customer','supplier',NULL,NULL);
SELECT resolve_trip_service_amendment(fixture_id(803),true,'customer','supplier',NULL,NULL);
SELECT resolve_trip_service_amendment(fixture_id(804),true,'customer','supplier',NULL,NULL);
SELECT resolve_trip_service_amendment(fixture_id(806),true,'customer','supplier',NULL,100);
SELECT fixture_assert((SELECT customer_refund_id IS NULL AND customer_due_reduction=100 FROM trip_service_amendments WHERE id=fixture_id(806)),
  'unpaid cancellation created a wallet balance instead of clearing the receivable');
SELECT fixture_assert((SELECT total_paid_amount=60 AND remaining_amount=0 AND final_amount=110 FROM invoices WHERE id=fixture_id(501)), 'wrong effective invoice balance');
SELECT fixture_assert((SELECT amount=30 AND status='approved' AND invoice_id=fixture_id(501) FROM refund_requests
  WHERE id=(SELECT customer_refund_id FROM trip_service_amendments WHERE id=fixture_id(801))), 'customer wallet did not receive only paid amount');
SELECT fixture_assert((SELECT amount=75 AND confirmed_at IS NOT NULL FROM supplier_refund_claims WHERE id=fixture_id(801)), 'supplier wallet amount or status incorrect');
SELECT fixture_assert((SELECT count(*)=1 FROM supplier_payment_orders WHERE source_type='trip_service_amendment'), 'cancellation supplier penalty was charged twice');
SELECT fixture_assert((SELECT customer_refund_id IS NULL AND supplier_claim_id IS NULL AND customer_due_reduction=0 FROM trip_service_amendments WHERE id=fixture_id(802)), 'non-refundable created a credit');
SELECT fixture_assert((SELECT check_in_date='2027-02-01' AND total_cost_customer=100 FROM hotel_bookings WHERE id=fixture_id(703)), 'free date change altered pricing or failed to update date');
SELECT fixture_assert((SELECT departure_date='2027-01-01' AND ticket_numbers='["T003","T002"]' AND status_id IS NULL FROM flight_bookings WHERE id=fixture_id(705)), 'ticket reissue altered the shared itinerary or another ticket');
SELECT fixture_assert((SELECT final_amount=30 AND remaining_amount=30 FROM invoices WHERE id=(SELECT additional_invoice_id FROM trip_service_amendments WHERE id=fixture_id(804))), 'price difference invoice incorrect');
SELECT fixture_assert((SELECT amount=15 AND status='draft' FROM supplier_payment_orders WHERE id=(SELECT supplier_order_id FROM trip_service_amendments WHERE id=fixture_id(804))), 'supplier charge order incorrect');
SELECT fixture_assert((SELECT current_balance=460 FROM bank_accounts WHERE id=fixture_id(401)), 'approval caused cash movement');
SELECT fixture_assert((SELECT count(*)=2 FROM journal_entries WHERE source_type='trip_amendment_invoice_credit'), 'credit was posted twice');
SELECT fixture_assert((SELECT count(*)=3 FROM get_trip_service_amendment_history(fixture_id(302))), 'history invalid');
SET ROLE authenticated;
SELECT fixture_assert((SELECT count(*)=5 FROM trip_service_amendments), 'organization user cannot read amendments');
SET test.user_id = '00000000-0000-0000-0000-000000000020';
SELECT fixture_assert((SELECT count(*)=0 FROM trip_service_amendments), 'other organization can read amendments');
SELECT fixture_assert((SELECT count(*)=0 FROM get_trip_service_amendment_history(fixture_id(302))), 'other organization can read operation history');
RESET ROLE;
SET test.user_id = '00000000-0000-0000-0000-000000000013';
SELECT public.record_customer_payment(fixture_id(501),10,'EGP',1,'cash',fixture_id(401));
SELECT fixture_assert((SELECT total_paid_amount=60 AND remaining_amount=0 FROM invoices WHERE id=fixture_id(501)), 'new payment was incorrectly allocated on closed receivable');

SELECT fixture_assert((SELECT count(*)=1 AND sum(customer_due_reduction)=50
  FROM get_customer_trip_invoice_credits(fixture_id(1), fixture_id(101))), 'customer ledger did not receive the amendment credit');
DO $$
DECLARE v_refund uuid := (SELECT customer_refund_id FROM trip_service_amendments WHERE id=fixture_id(801));
BEGIN
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(901),10,_refund=>v_refund,_treasury=>fixture_id(401));
  PERFORM public.settle_refund_balance(fixture_id(1),fixture_id(902),25,_claim=>fixture_id(801),_treasury=>fixture_id(401),_reference=>'supplier transfer');
  PERFORM fixture_assert((SELECT sum(amount)=35 AND count(*)=2 FROM refund_balance_settlements
    WHERE customer_refund_id=v_refund OR supplier_claim_id=fixture_id(801)), 'amendment wallets could not be settled normally');
  PERFORM fixture_assert((SELECT status='approved' FROM refund_requests WHERE id=v_refund), 'partially settled customer credit closed early');
  PERFORM fixture_assert((SELECT current_balance=485 FROM bank_accounts WHERE id=fixture_id(401)), 'wallet settlement treasury movements incorrect');
END $$;
