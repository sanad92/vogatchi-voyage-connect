INSERT INTO public.bookings (id, organization_id, customer_id, currency, status, workflow_stage)
VALUES
  (fixture_id(320), fixture_id(1), fixture_id(101), 'EGP', 'cancelled', 'cancelled'),
  (fixture_id(321), fixture_id(1), fixture_id(101), 'EGP', 'confirmed', 'confirmed'),
  (fixture_id(322), fixture_id(1), fixture_id(101), 'EGP', 'confirmed', 'confirmed'),
  (fixture_id(323), fixture_id(1), fixture_id(101), 'EGP', 'confirmed', 'confirmed');

INSERT INTO public.invoices (id, organization_id, booking_id, customer_id, invoice_number, subtotal, vat_rate, status, currency)
VALUES
  (fixture_id(520), fixture_id(1), fixture_id(320), fixture_id(101), 'CANCEL-LEGACY', 106800, 0, 'unpaid', 'EGP'),
  (fixture_id(521), fixture_id(1), fixture_id(321), fixture_id(101), 'CANCEL-PARTIAL', 100, 10, 'unpaid', 'EGP'),
  (fixture_id(522), fixture_id(1), fixture_id(322), fixture_id(101), 'CANCEL-FEE', 100, 0, 'unpaid', 'EGP'),
  (fixture_id(523), fixture_id(1), fixture_id(323), fixture_id(101), 'CANCEL-STALE', 100, 0, 'unpaid', 'EGP');

UPDATE public.bank_accounts SET current_balance=500 WHERE id=fixture_id(401);
SET test.user_id = '00000000-0000-0000-0000-000000000010';
SELECT public.record_customer_payment(fixture_id(521), 60, 'EGP', 1, 'cash', fixture_id(401));

DO $$
DECLARE
  v_preview jsonb;
  v_result jsonb;
  v_refund uuid;
  v_fees jsonb;
BEGIN
  BEGIN
    UPDATE public.bookings SET workflow_stage='cancelled' WHERE id=fixture_id(323);
    RAISE EXCEPTION 'direct workflow cancellation bypassed settlement';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    UPDATE public.bookings SET status='cancelled' WHERE id=fixture_id(323);
    RAISE EXCEPTION 'direct status cancellation bypassed settlement';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  v_preview := public.get_booking_cancellation_preview(fixture_id(320));
  v_result := public.settle_booking_cancellation(fixture_id(320), 'Supplier approved cancellation', '{}', v_preview);
  PERFORM fixture_assert((v_result->0->>'due_reduction')::numeric = 106800 AND (v_result->0->>'refund')::numeric = 0,
    'unpaid legacy cancellation must clear receivable without wallet credit');
  PERFORM fixture_assert(public.settle_booking_cancellation(fixture_id(320), 'Supplier approved cancellation', '{}', v_preview) = v_result,
    'same request should be safe to retry');
  PERFORM fixture_assert((SELECT remaining_amount = 0 AND total_paid_amount = 0 FROM public.invoices WHERE id=fixture_id(520)),
    'legacy receivable or payment amount incorrect');
  BEGIN
    INSERT INTO public.invoices (organization_id, booking_id, customer_id, invoice_number, subtotal, status)
    VALUES (fixture_id(1), fixture_id(320), fixture_id(101), 'CANCEL-NEW-INVOICE', 100, 'unpaid');
    RAISE EXCEPTION 'cancelled booking accepted a new invoice';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  v_preview := public.get_booking_cancellation_preview(fixture_id(321));
  v_fees := jsonb_build_object(fixture_id(521)::text, 30);
  v_result := public.settle_booking_cancellation(fixture_id(321), 'Partial customer refund', v_fees, v_preview);
  v_refund := (v_result->0->>'refund_id')::uuid;
  PERFORM fixture_assert((v_result->0->>'due_reduction')::numeric = 50 AND (v_result->0->>'refund')::numeric = 30,
    'paid cancellation must split receivable and refund');
  PERFORM fixture_assert((SELECT amount = 30 AND status = 'approved' AND invoice_id = fixture_id(521)
    FROM public.refund_requests WHERE id=v_refund), 'approved customer wallet credit missing');
  PERFORM fixture_assert((SELECT status = 'cancelled' AND workflow_stage = 'cancelled' AND status_id=fixture_id(99)
    FROM public.bookings WHERE id=fixture_id(321)), 'booking status and stage must both be cancelled');
  PERFORM fixture_assert((SELECT current_balance = 560 FROM public.bank_accounts WHERE id=fixture_id(401)),
    'recognizing a refund must not move treasury');
  PERFORM fixture_assert((SELECT count(*) = 2 FROM public.get_customer_trip_invoice_credits(fixture_id(1),fixture_id(101)) WHERE customer_invoice_id IN (fixture_id(520),fixture_id(521))),
    'customer ledger must include cancellation credits');

  v_preview := public.get_booking_cancellation_preview(fixture_id(322));
  v_result := public.settle_booking_cancellation(fixture_id(322), 'Unpaid cancellation fee',
    jsonb_build_object(fixture_id(522)::text, 20), v_preview);
  PERFORM fixture_assert((v_result->0->>'remaining')::numeric = 20 AND (v_result->0->>'refund')::numeric = 0,
    'unpaid cancellation fee must remain collectible');
  PERFORM public.record_customer_payment(fixture_id(522), 20, 'EGP', 1, 'cash', fixture_id(401));
  PERFORM fixture_assert((SELECT total_paid_amount = 20 AND remaining_amount = 0
    FROM public.invoices WHERE id=fixture_id(522)), 'invoice allocations must respect the settlement credit');

  v_preview := public.get_booking_cancellation_preview(fixture_id(323));
  PERFORM public.record_customer_payment(fixture_id(523), 10, 'EGP', 1, 'cash', fixture_id(401));
  BEGIN
    PERFORM public.settle_booking_cancellation(fixture_id(323), 'Stale preview attempt', '{}', v_preview);
    RAISE EXCEPTION 'stale preview accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'stale preview accepted' THEN RAISE; END IF;
  END;
  PERFORM fixture_assert((SELECT workflow_stage='confirmed' FROM public.bookings WHERE id=fixture_id(323)),
    'failed settlement must not cancel booking');
END $$;

SET ROLE authenticated;
SET test.user_id = '00000000-0000-0000-0000-000000000020';
DO $$ BEGIN
  BEGIN
    PERFORM public.get_booking_cancellation_preview(fixture_id(321));
    RAISE EXCEPTION 'cross-tenant preview allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.settle_booking_cancellation(fixture_id(323), 'Cross-tenant action', '{}', '{}');
    RAISE EXCEPTION 'cross-tenant cancellation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
