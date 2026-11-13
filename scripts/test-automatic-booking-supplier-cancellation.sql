SET test.user_id = '00000000-0000-0000-0000-000000000010';
INSERT INTO public.bookings (id, organization_id, customer_id, supplier_id, currency, booking_type, status, workflow_stage, cost_price)
SELECT fixture_id(n), fixture_id(1), fixture_id(101), fixture_id(201), 'EGP', 'hotel', 'confirmed', 'confirmed', 100
FROM generate_series(340, 346) n;
INSERT INTO public.invoices (id, organization_id, booking_id, customer_id, invoice_number, subtotal, status, currency)
SELECT fixture_id(n+300), fixture_id(1), fixture_id(n), fixture_id(101), 'AUTO-CXL-'||n, 100, 'unpaid', 'EGP'
FROM generate_series(340, 346) n;
INSERT INTO public.supplier_payment_orders (id, organization_id, supplier_id, booking_id, reference_number, service_type, amount, currency, approval_status, status)
SELECT fixture_id(n+400), fixture_id(1), fixture_id(201), fixture_id(n), 'AUTO-PO-'||n, 'hotel', 100, 'EGP', 'approved', 'approved'
FROM generate_series(340, 345) n;

INSERT INTO public.hotel_bookings (id, booking_id, organization_id, currency, supplier_id)
VALUES (fixture_id(740), fixture_id(340), fixture_id(1), 'EGP', fixture_id(201));
SELECT public.record_supplier_payment(fixture_id(741), 100, 'EGP', 1, 'cash', fixture_id(401));
SELECT public.record_supplier_payment(fixture_id(742), 20, 'EGP', 1, 'cash', fixture_id(401));
SELECT public.record_customer_payment(fixture_id(641), 40, 'EGP', 1, 'cash', fixture_id(401));
UPDATE public.journal_entries SET is_locked = true WHERE source_type = 'supplier_invoice' AND booking_id = fixture_id(340);

DO $$
DECLARE
  v_preview jsonb;
  v_terms jsonb;
  v_result jsonb;
  v_fee_order uuid;
  v_invoice uuid;
  v_cash numeric;
  v_n integer;
  v_fee numeric;
BEGIN
  SELECT current_balance INTO v_cash FROM public.bank_accounts WHERE id = fixture_id(401);
  FOR v_n IN 340..342 LOOP
    v_fee := CASE v_n WHEN 342 THEN 35 ELSE 0 END;
    v_preview := public.get_booking_cancellation_workflow(fixture_id(v_n));
    v_terms := jsonb_build_object(v_preview #>> '{suppliers,0,id}',
      jsonb_build_object('fee', v_fee, 'reference', 'SUP-CXL-'||v_n));
    v_result := public.settle_booking_cancellation_workflow(fixture_id(v_n), 'Confirmed supplier cancellation', '{}', v_terms, v_preview);
    PERFORM fixture_assert(public.settle_booking_cancellation_workflow(
      fixture_id(v_n), 'Confirmed supplier cancellation', '{}', v_terms, v_preview) = v_result, 'Cancellation should be safe to retry');
    PERFORM fixture_assert((SELECT status = 'cancelled' FROM public.supplier_payment_orders WHERE id = fixture_id(v_n+400)),
      'Original supplier order should close');
    PERFORM fixture_assert((SELECT status = 'cancelled' FROM public.supplier_invoices WHERE payment_order_id = fixture_id(v_n+400)),
      'Original supplier invoice should close');
    PERFORM fixture_assert((SELECT count(*) = 1 FROM public.journal_entries
      WHERE booking_id = fixture_id(v_n) AND source_type = 'supplier_invoice' AND is_locked), 'Original accrual should be preserved');
    PERFORM fixture_assert((SELECT status = 'cancelled' FROM public.bookings WHERE id = fixture_id(v_n)), 'Booking should close');
    PERFORM fixture_assert((get_booking_profit_cockpit(fixture_id(v_n)) #>> '{summary,supplier_remaining}')::numeric =
      CASE WHEN v_n = 342 THEN 15 ELSE 0 END, 'Cockpit should show the actual supplier amount due');
    PERFORM fixture_assert((get_booking_profit_cockpit(fixture_id(v_n)) #>> '{ledger,posted_cost}')::numeric = v_fee,
      format('Only the retained supplier fee should remain as posted cost for %s: %s', v_n, get_booking_profit_cockpit(fixture_id(v_n))->'ledger'));
  END LOOP;

  PERFORM fixture_assert((SELECT status_id = fixture_id(99) FROM public.hotel_bookings WHERE id = fixture_id(740)),
    'Linked hotel service should be cancelled with the booking');
  PERFORM fixture_assert((SELECT count(*) = 1 AND sum(c.amount) = 100 FROM public.supplier_refund_claims c
    JOIN public.supplier_invoices i ON i.id = c.supplier_invoice_id
    WHERE i.payment_order_id = fixture_id(741) AND c.confirmed_at IS NOT NULL), 'Paid supplier should generate one refund');
  PERFORM fixture_assert((SELECT count(*) = 1 AND sum(r.amount) = 40 FROM public.refund_requests r
    WHERE r.booking_id = fixture_id(341) AND r.status = 'approved'), 'Customer refund should post in the same workflow');
  PERFORM fixture_assert((SELECT current_balance = v_cash FROM public.bank_accounts WHERE id = fixture_id(401)),
    'Recognizing cancellation and refunds must not move treasury cash');

  PERFORM fixture_assert((SELECT sum(debit - credit) = -15 FROM public.get_supplier_ledger(fixture_id(201), NULL, NULL)
    WHERE booking_id IN (fixture_id(340), fixture_id(341), fixture_id(342))),
    'Supplier ledger should keep original payments and report only the remaining fee');
  PERFORM fixture_assert((SELECT outstanding_amount = 15 FROM public.get_supplier_aging_details_v2(fixture_id(1), CURRENT_DATE, 'EGP', fixture_id(201))
    WHERE booking_id = fixture_id(342)), 'Only the fee should remain in supplier aging');
  v_fee_order := (v_result #>> '{supplier_result,0,fee_order_id}')::uuid;
  PERFORM fixture_assert((SELECT amount = 15 AND status = 'pending' FROM public.supplier_payment_orders WHERE id = v_fee_order),
    'Only the unpaid portion of the fee should be payable');
  UPDATE public.supplier_payment_orders SET approval_status = 'approved', status = 'approved' WHERE id = v_fee_order;
  PERFORM public.record_supplier_payment(v_fee_order, 15, 'EGP', 1, 'cash', fixture_id(401));
  PERFORM fixture_assert((get_booking_profit_cockpit(fixture_id(342)) #>> '{summary,supplier_remaining}')::numeric = 0,
    'Paying the fee order should clear the balance');

  BEGIN
    UPDATE public.supplier_payment_orders SET status = 'approved' WHERE id = fixture_id(740);
    RAISE EXCEPTION 'settled payment order reopened';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM = 'settled payment order reopened' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.supplier_payment_orders (organization_id, supplier_id, booking_id, reference_number, amount, currency, status, source_type)
    VALUES (fixture_id(1), fixture_id(201), fixture_id(340), 'BYPASS', 100, 'EGP', 'draft', 'booking_cancellation_fee');
    RAISE EXCEPTION 'new payable on closed booking';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM = 'new payable on closed booking' THEN RAISE; END IF;
  END;

  v_preview := public.get_booking_cancellation_workflow(fixture_id(343));
  BEGIN
    PERFORM public.settle_booking_cancellation_workflow(fixture_id(343), 'No confirmed supplier terms', '{}', '{}', v_preview);
    RAISE EXCEPTION 'cancellation without terms succeeded';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM = 'cancellation without terms succeeded' THEN RAISE; END IF;
  END;
  PERFORM fixture_assert((SELECT status = 'confirmed' FROM public.bookings WHERE id = fixture_id(343))
    AND (SELECT remaining_amount = 100 FROM public.invoices WHERE id = fixture_id(643)), 'Missing supplier terms should roll back customer changes');

  PERFORM public.record_supplier_payment(fixture_id(743), 10, 'EGP', 1, 'cash', fixture_id(401));
  BEGIN
    PERFORM public.settle_booking_cancellation_workflow(fixture_id(343), 'Stale supplier preview', '{}',
      jsonb_build_object(v_preview #>> '{suppliers,0,id}', jsonb_build_object('fee', 0, 'reference', 'STALE')), v_preview);
    RAISE EXCEPTION 'stale supplier preview succeeded';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM = 'stale supplier preview succeeded' THEN RAISE; END IF;
  END;

  SELECT id INTO v_invoice FROM public.supplier_invoices WHERE payment_order_id = fixture_id(744);
  UPDATE public.supplier_payment_orders SET approval_status = 'rejected', status = 'pending' WHERE id = fixture_id(744);
  v_preview := public.get_booking_cancellation_workflow(fixture_id(344));
  v_terms := jsonb_build_object(v_invoice::text, jsonb_build_object('fee', 0, 'reference', 'PREVIOUSLY-REJECTED'));
  PERFORM public.settle_booking_cancellation_workflow(fixture_id(344), 'Confirmed supplier cancellation', '{}', v_terms, v_preview);
  PERFORM fixture_assert((SELECT status = 'cancelled' FROM public.supplier_payment_orders WHERE id = fixture_id(744)),
    'Already cancelled invoice should still close its rejected order');

  v_preview := public.get_booking_cancellation_workflow(fixture_id(346));
  v_terms := jsonb_build_object(fixture_id(346)::text, jsonb_build_object('fee', 0, 'reference', 'ESTIMATE-ONLY'));
  PERFORM public.settle_booking_cancellation_workflow(fixture_id(346), 'Confirmed supplier cancellation', '{}', v_terms, v_preview);
  PERFORM fixture_assert((get_booking_profit_cockpit(fixture_id(346)) #>> '{summary,supplier_remaining}')::numeric = 0,
    'A confirmed estimate-only cancellation should clear estimated payable');
END
$$;

SELECT fixture_assert(NOT has_function_privilege('authenticated', 'public.settle_booking_cancellation(uuid,text,jsonb,jsonb)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb)', 'EXECUTE'),
  'Legacy or anonymous calls can bypass supplier settlement');
SET ROLE authenticated;
SET test.user_id = '00000000-0000-0000-0000-000000000020';
DO $$ BEGIN
  PERFORM public.get_booking_cancellation_workflow(fixture_id(345));
  RAISE EXCEPTION 'cross-organization access succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;
