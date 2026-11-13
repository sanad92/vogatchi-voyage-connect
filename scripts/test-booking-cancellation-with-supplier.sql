INSERT INTO public.bookings (id, organization_id, customer_id, supplier_id, currency, status, workflow_stage, booking_type)
VALUES (fixture_id(330), fixture_id(1), fixture_id(101), fixture_id(201), 'EGP', 'confirmed', 'confirmed', 'hotel'),
       (fixture_id(331), fixture_id(1), fixture_id(101), fixture_id(201), 'EGP', 'confirmed', 'confirmed', 'hotel');
INSERT INTO public.invoices (id, organization_id, booking_id, customer_id, invoice_number, subtotal, vat_rate, status, currency)
VALUES (fixture_id(530), fixture_id(1), fixture_id(330), fixture_id(101), 'ATOMIC-CANCEL', 100, 0, 'unpaid', 'EGP'),
       (fixture_id(531), fixture_id(1), fixture_id(331), fixture_id(101), 'STALE-SUPPLIER-CANCEL', 100, 0, 'unpaid', 'EGP');
INSERT INTO public.supplier_payment_orders
  (id, organization_id, supplier_id, booking_id, reference_number, amount, currency, approval_status, status, due_date, service_type)
VALUES (fixture_id(670),fixture_id(1),fixture_id(201),fixture_id(330),'ATOMIC-FREE',80,'EGP','pending','draft',CURRENT_DATE-1,'hotel'),
       (fixture_id(671),fixture_id(1),fixture_id(202),fixture_id(330),'NO-WAIVER',35,'USD','pending','pending',CURRENT_DATE-1,'hotel'),
       (fixture_id(672),fixture_id(1),fixture_id(201),fixture_id(331),'STALE-SUPPLIER',90,'EGP','approved','approved',CURRENT_DATE-1,'hotel'),
       (fixture_id(673),fixture_id(1),fixture_id(201),fixture_id(330),'PARTLY-PAID-SUPPLIER',45,'EGP','approved','approved',CURRENT_DATE-1,'hotel');
UPDATE public.supplier_invoices SET amount_paid = 1, status = 'partial' WHERE payment_order_id = fixture_id(673);
SET test.user_id = '00000000-0000-0000-0000-000000000010';

DO $$
DECLARE
  v_preview jsonb := public.get_booking_cancellation_with_supplier_preview(fixture_id(330));
  v_confirmations jsonb := jsonb_build_object(fixture_id(670)::text, 'HOTEL-WA-330');
  v_result jsonb;
BEGIN
  PERFORM fixture_assert(jsonb_array_length(v_preview->'supplier_orders') = 3, 'preview lost linked orders');
  PERFORM fixture_assert(EXISTS (SELECT FROM jsonb_array_elements(v_preview->'supplier_orders') o
    WHERE o->>'id' = fixture_id(673)::text AND o->>'blocked_reason' IS NOT NULL), 'partial payment is not flagged');

  BEGIN
    PERFORM public.settle_booking_cancellation_with_supplier(fixture_id(330), 'Free cancellation', '{}', v_preview,
      v_confirmations || jsonb_build_object(fixture_id(673)::text, 'NOT-ELIGIBLE'));
    RAISE EXCEPTION 'ineligible supplier closure was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM fixture_assert((SELECT status = 'confirmed' FROM bookings WHERE id = fixture_id(330)), 'rejected supplier confirmation changed the booking');

  -- Force an error after the customer invoice and booking have been updated.
  -- The request must roll back both sides together.
  CREATE FUNCTION public.test_fail_supplier_closure() RETURNS trigger LANGUAGE plpgsql AS $trigger$
  BEGIN RAISE EXCEPTION 'simulated accounting failure' USING ERRCODE = '23514'; END
  $trigger$;
  CREATE TRIGGER test_fail_supplier_closure BEFORE UPDATE OF status ON public.supplier_payment_orders
    FOR EACH ROW WHEN (NEW.reference_number = 'ATOMIC-FREE' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.test_fail_supplier_closure();
  BEGIN
    PERFORM public.settle_booking_cancellation_with_supplier(fixture_id(330), 'Free cancellation', '{}', v_preview, v_confirmations);
    RAISE EXCEPTION 'supplier posting error was ignored';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  DROP TRIGGER test_fail_supplier_closure ON public.supplier_payment_orders;
  DROP FUNCTION public.test_fail_supplier_closure();
  PERFORM fixture_assert((SELECT status = 'confirmed' FROM bookings WHERE id = fixture_id(330))
    AND (SELECT status = 'unpaid' AND remaining_amount = 100 FROM invoices WHERE id = fixture_id(530))
    AND NOT EXISTS (SELECT FROM booking_cancellation_settlements WHERE booking_id = fixture_id(330)),
    'supplier error did not roll back the customer and booking settlement');

  v_result := public.settle_booking_cancellation_with_supplier(fixture_id(330), 'Free cancellation', '{}', v_preview, v_confirmations);
  PERFORM fixture_assert((v_result #>> '{invoices,0,remaining}')::numeric = 0
    AND v_result #>> '{closed_supplier_orders,0,confirmation}' = 'HOTEL-WA-330', 'combined result is incomplete');
  PERFORM fixture_assert(v_result = public.settle_booking_cancellation_with_supplier(
    fixture_id(330), 'Free cancellation', '{}', v_preview, v_confirmations), 'same request is not safe to retry');
  PERFORM fixture_assert(v_result->'closed_supplier_orders' = public.get_booking_cancellation_with_supplier_preview(
    fixture_id(330))->'closed_supplier_orders', 'supplier confirmation was not persisted for reopening');
  PERFORM fixture_assert((SELECT status = 'cancelled' FROM bookings WHERE id = fixture_id(330))
    AND (SELECT status = 'cancelled' AND remaining_amount = 0 FROM invoices WHERE id = fixture_id(530))
    AND (SELECT status = 'cancelled' AND rejection_reason = 'HOTEL-WA-330' FROM supplier_payment_orders WHERE id = fixture_id(670))
    AND (SELECT status = 'cancelled' FROM supplier_invoices WHERE payment_order_id = fixture_id(670)), 'settlement did not close all eligible documents');
  PERFORM fixture_assert((SELECT status = 'pending' FROM supplier_payment_orders WHERE id = fixture_id(671))
    AND (SELECT status = 'approved' FROM supplier_payment_orders WHERE id = fixture_id(673)), 'other supplier payables were changed');
  PERFORM fixture_assert(NOT EXISTS (
    SELECT FROM journal_entries j JOIN supplier_invoices i ON i.id = j.source_id
    WHERE j.source_type = 'supplier_invoice' AND i.payment_order_id = fixture_id(670)
  ) AND NOT EXISTS (
    SELECT FROM get_supplier_aging_details_v2(fixture_id(1), CURRENT_DATE, 'EGP', fixture_id(201))
    WHERE invoice_number = 'SINV-ATOMIC-FREE'
  ), 'closed accrual still appears in the journal or supplier aging');

  v_preview := public.get_booking_cancellation_with_supplier_preview(fixture_id(331));
  UPDATE supplier_payment_orders SET amount = 100 WHERE id = fixture_id(672);
  BEGIN
    PERFORM public.settle_booking_cancellation_with_supplier(fixture_id(331), 'Stale supplier confirmation',
      '{}', v_preview, jsonb_build_object(fixture_id(672)::text, 'STALE-REF'));
    RAISE EXCEPTION 'stale supplier preview was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'أوامر دفع المورد اتغيرت%' THEN RAISE; END IF;
  END;
  PERFORM fixture_assert((SELECT status = 'confirmed' FROM bookings WHERE id = fixture_id(331)), 'stale confirmation changed booking');
END $$;

SET ROLE authenticated;
SET test.user_id = '00000000-0000-0000-0000-000000000020';
DO $$ BEGIN
  BEGIN
    PERFORM public.get_booking_cancellation_with_supplier_preview(fixture_id(330));
    RAISE EXCEPTION 'cross-tenant supplier preview permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.settle_booking_cancellation_with_supplier(fixture_id(331), 'Cross-tenant action', '{}', '{}', '{}');
    RAISE EXCEPTION 'cross-tenant supplier closure permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT fixture_assert(NOT has_function_privilege('anon',
  'public.settle_booking_cancellation_with_supplier(uuid,text,jsonb,jsonb,jsonb)','EXECUTE'), 'anonymous settlement permitted');
