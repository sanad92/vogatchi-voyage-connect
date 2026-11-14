-- Run with the candidate migration and qa.terms_{org,user,customer,supplier_a,supplier_b}
-- in a single transaction, then roll it back.
DO $test$
DECLARE
  org uuid := current_setting('qa.terms_org')::uuid;
  customer uuid := current_setting('qa.terms_customer')::uuid;
  supplier_a uuid := current_setting('qa.terms_supplier_a')::uuid;
  supplier_b uuid := current_setting('qa.terms_supplier_b')::uuid;
  base_terms jsonb := '{
    "timezone":"Africa/Cairo","payment_due":"2027-01-18T18:00","planned_payment":"",
    "supplier":{"kind":"free_until","free_until":"2027-01-18T18:00","unit":"percent","value":"25","rules":[{"from":"2027-01-19T18:00","unit":"fixed","value":"200"}]},
    "customer":{"kind":"penalty","unit":"percent","value":"20","rules":[]}
  }';
  terms_b jsonb;
  payload jsonb;
  preview jsonb;
  estimates jsonb;
  result jsonb;
  booking uuid;
  invoice uuid;
  order_id uuid;
  quote uuid;
  request uuid := gen_random_uuid();
  ref text;
  failed boolean := false;
  pending_terms jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('qa.terms_user'),true);
  payload := jsonb_build_object('booking_type','hotel','customer_id',customer,'supplier_id',supplier_a,
    'selling_price',1500,'cost_price',900,'currency','EGP','start_date','2027-01-20','end_date','2027-01-22',
    'hotelDetails',jsonb_build_object('hotel_name','QA terms hotel'),'cancellation_terms',base_terms);
  result := public.create_booking_atomic(org,request,payload);
  booking := (result->>'id')::uuid;
  invoice := (result->>'invoice_id')::uuid;
  IF (public.create_booking_atomic(org,request,payload)->>'id')::uuid <> booking THEN RAISE EXCEPTION 'Booking retry duplicated'; END IF;
  IF (SELECT cancellation_terms #> '{0,terms}' FROM public.bookings WHERE id=booking) IS DISTINCT FROM base_terms THEN
    RAISE EXCEPTION 'Terms were not saved as a booking snapshot';
  END IF;
  SELECT id INTO STRICT order_id FROM public.supplier_payment_orders WHERE booking_id=booking;
  IF NOT EXISTS (SELECT FROM public.supplier_payment_orders o JOIN public.supplier_invoices i ON i.payment_order_id=o.id
    WHERE o.id=order_id AND o.supplier_due_at='2027-01-18 16:00:00+00' AND o.supplier_due_timezone='Africa/Cairo'
      AND o.due_date='2027-01-18' AND i.due_date=o.due_date AND o.planned_payment_date='2027-01-17'
      AND o.schedule_date=o.planned_payment_date) THEN RAISE EXCEPTION 'Supplier due/plan not propagated to financial documents'; END IF;
  IF NOT EXISTS (SELECT FROM public.get_supplier_aging_details_v2(org,CURRENT_DATE,'EGP',supplier_a)
      WHERE booking_id=booking AND due_date='2027-01-18' AND days_overdue=0) THEN
    RAISE EXCEPTION 'Supplier aging should use the contractual due date';
  END IF;
  BEGIN
    UPDATE public.bookings SET cancellation_terms='[]' WHERE id=booking;
    RAISE EXCEPTION 'Snapshot unexpectedly mutable';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  preview := public.get_booking_cancellation_workflow(booking);
  ref := preview #>> '{suppliers,0,id}';
  SELECT trip_amendment_private.cancellation_policy_estimates(b,preview,'2027-01-18 15:59:59+00')
    INTO estimates FROM public.bookings b WHERE b.id=booking;
  IF estimates #> ARRAY['suppliers',ref] <> '0' OR estimates #> ARRAY['customer',invoice::text] <> '300' THEN
    RAISE EXCEPTION 'Free period or customer fee calculation failed';
  END IF;
  SELECT trip_amendment_private.cancellation_policy_estimates(b,preview,'2027-01-18 16:00:00+00')
    INTO estimates FROM public.bookings b WHERE b.id=booking;
  IF estimates #> ARRAY['suppliers',ref] <> '225' THEN RAISE EXCEPTION 'Free deadline boundary failed'; END IF;
  SELECT trip_amendment_private.cancellation_policy_estimates(b,preview,'2027-01-19 16:00:00+00')
    INTO estimates FROM public.bookings b WHERE b.id=booking;
  IF estimates #> ARRAY['suppliers',ref] <> '200' THEN RAISE EXCEPTION 'Fee tier failed'; END IF;

  BEGIN
    PERFORM public.settle_booking_cancellation_workflow(booking,'QA terms settlement',jsonb_build_object(invoice::text,300),
      jsonb_build_object(ref,jsonb_build_object('fee',20,'reference','QA-FEE')),preview);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'سجّل سبب اختلاف%' THEN RAISE; END IF;
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Unexplained override accepted'; END IF;
  result := public.settle_booking_cancellation_workflow(booking,'QA terms settlement',jsonb_build_object(invoice::text,300),
    jsonb_build_object(ref,jsonb_build_object('fee',20,'reference','QA-FEE','override_reason','Supplier confirmed new fee')),preview);
  IF result #>> '{supplier_result,0,override_reason}' IS DISTINCT FROM 'Supplier confirmed new fee'
    OR EXISTS (SELECT FROM public.supplier_payment_orders WHERE id=order_id AND status <> 'cancelled')
    OR NOT EXISTS (SELECT FROM public.supplier_payment_orders WHERE booking_id=booking
      AND source_type='booking_cancellation_fee' AND amount=20 AND status='pending') THEN
    RAISE EXCEPTION 'Settlement did not retain the fee and audit reason';
  END IF;

  terms_b := jsonb_set(jsonb_set(base_terms,'{payment_due}','"2027-01-16T12:00"'),'{planned_payment}','"2027-01-16"');
  payload := jsonb_build_object('customer_id',customer,'currency','EGP','customer_name','QA policy quote',
    'travel_date','2027-01-20','return_date','2027-01-22','status','draft','number_of_travelers',1,'discount_amount',50,'vat_rate',10,
    'items',jsonb_build_array(
      jsonb_build_object('item_type','hotel','description','QA policy hotel','supplier_id',supplier_a,'quantity',1,'cost_price',300,'selling_price',500,
        'details',jsonb_build_object('cancellation_terms',base_terms)),
      jsonb_build_object('item_type','flight','description','QA policy flight','supplier_id',supplier_b,'quantity',1,'cost_price',100,'selling_price',200,
        'details',jsonb_build_object('cancellation_terms',terms_b))));
  quote := (public.create_quote_atomic(org,gen_random_uuid(),payload)->>'id')::uuid;
  result := public.convert_quote_atomic(org,quote);
  booking := (result->>'booking_id')::uuid;
  invoice := (result->>'invoice_id')::uuid;
  IF (SELECT count(*) FROM public.supplier_payment_orders WHERE booking_id=booking
    AND ((supplier_id=supplier_a AND due_date='2027-01-18' AND schedule_date='2027-01-17')
      OR (supplier_id=supplier_b AND due_date='2027-01-16' AND schedule_date='2027-01-16'))) <> 2 THEN
    RAISE EXCEPTION 'Quote service deadlines not copied per supplier';
  END IF;
  preview := public.get_booking_cancellation_workflow(booking);
  IF preview #> ARRAY['policy_estimates','customer',invoice::text] IS DISTINCT FROM '143'::jsonb THEN
    RAISE EXCEPTION 'Discounted quote customer fee should be 20 percent of 715, got %', preview->'policy_estimates';
  END IF;
  pending_terms := jsonb_set(jsonb_set(base_terms,'{supplier,kind}','"pending"'),'{payment_due}','""');
  result := public.create_booking_atomic(org,gen_random_uuid(),jsonb_set(
    jsonb_build_object('booking_type','hotel','customer_id',customer,'supplier_id',supplier_a,'selling_price',1500,
      'cost_price',900,'currency','EGP','start_date','2027-01-20','end_date','2027-01-22','hotelDetails',
      jsonb_build_object('hotel_name','QA terms pending')), '{cancellation_terms}', pending_terms));
  booking := (result->>'id')::uuid;
  preview := public.get_booking_cancellation_workflow(booking);
  IF preview #> '{policy_estimates,suppliers}' IS DISTINCT FROM '{}'::jsonb OR EXISTS (
    SELECT FROM public.supplier_payment_orders WHERE booking_id=booking AND schedule_date IS NOT NULL
  ) THEN RAISE EXCEPTION 'Unknown deadlines or terms must stay unknown'; END IF;
  RAISE NOTICE 'Booking terms, deadlines, tiers, quote conversion, and cancellation overrides verified';
END
$test$;
SELECT true AS passed;
