ALTER TABLE public.supplier_payment_orders ADD COLUMN pilgrimage_b2b_agreement_id uuid,
  ADD COLUMN rejection_reason text, ADD COLUMN approved_by uuid, ADD COLUMN approved_at timestamptz;

-- Use the real payment-order, supplier-invoice and posting triggers.
INSERT INTO public.supplier_payment_orders
  (id, organization_id, supplier_id, booking_id, reference_number, amount, currency, approval_status, status, due_date, service_type)
VALUES
  (fixture_id(660),fixture_id(1),fixture_id(201),fixture_id(324),'FREE-CREDIT-HOTEL',107460,'EGP','approved','approved',CURRENT_DATE-2,'hotel'),
  (fixture_id(661),fixture_id(1),fixture_id(201),fixture_id(324),'LOCKED-HOTEL',70,'USD','approved','approved',CURRENT_DATE-2,'hotel'),
  (fixture_id(662),fixture_id(1),fixture_id(201),fixture_id(324),'PARTIAL-HOTEL',50,'EGP','approved','approved',CURRENT_DATE+2,'hotel'),
  (fixture_id(663),fixture_id(1),fixture_id(201),fixture_id(323),'OTHER-ACTIVE-HOTEL',80,'USD','approved','approved',CURRENT_DATE+2,'hotel');

UPDATE public.journal_entries SET is_locked = true
WHERE source_type = 'supplier_invoice' AND source_id = (SELECT id FROM supplier_invoices WHERE payment_order_id = fixture_id(661));
UPDATE public.supplier_invoices SET amount_paid = 1, status = 'partial' WHERE payment_order_id = fixture_id(662);
ALTER TABLE public.suppliers ADD COLUMN name text;
ALTER TABLE public.supplier_payment_allocations ADD COLUMN created_at timestamptz DEFAULT now();

CREATE FUNCTION public.assert_supplier_order_cancel_denied(_id uuid, _message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM public.close_unpaid_supplier_order(_id, 'SUPPLIER-REF');
  EXCEPTION WHEN invalid_parameter_value OR insufficient_privilege THEN
    IF position(_message IN SQLERRM) > 0 THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Unexpected successful cancellation for %', _id;
END $$;

SET ROLE authenticated;
SET test.user_id = '00000000-0000-0000-0000-000000000020';
SELECT assert_supplier_order_cancel_denied(fixture_id(660), 'لا توجد صلاحية');
SET test.user_id = '00000000-0000-0000-0000-000000000011';
SELECT assert_supplier_order_cancel_denied(fixture_id(660), 'لا توجد صلاحية');
SET test.user_id = '00000000-0000-0000-0000-000000000012';
SELECT assert_supplier_order_cancel_denied(fixture_id(660), 'لا توجد صلاحية');
SET test.user_id = '00000000-0000-0000-0000-000000000010';
SELECT assert_supplier_order_cancel_denied(fixture_id(661), 'عليه سداد أو تسوية أو قيد مقفل');
SELECT assert_supplier_order_cancel_denied(fixture_id(662), 'عليه سداد أو تسوية أو قيد مقفل');
SELECT assert_supplier_order_cancel_denied(fixture_id(663), 'الإقفال متاح لأمر دفع مرتبط بحجز ملغى');
SELECT fixture_assert(EXISTS (SELECT FROM get_supplier_aging_details_v2(fixture_id(1),CURRENT_DATE,'EGP',fixture_id(201))
  WHERE invoice_number = 'SINV-FREE-CREDIT-HOTEL' AND outstanding_amount = 107460 AND days_overdue = 2),
  'confirmed deferred cost was absent from supplier aging before cancellation');
SELECT close_unpaid_supplier_order(fixture_id(660), 'HOTEL-WA-123');
SELECT close_unpaid_supplier_order(fixture_id(660), 'HOTEL-WA-123');
SELECT fixture_assert(NOT EXISTS (SELECT FROM get_supplier_aging_details_v2(fixture_id(1),CURRENT_DATE,'EGP',fixture_id(201))
  WHERE invoice_number = 'SINV-FREE-CREDIT-HOTEL'), 'cancelled deferred cost remained in supplier aging');
RESET ROLE;

SELECT fixture_assert((SELECT status = 'cancelled' AND rejection_reason = 'HOTEL-WA-123' FROM supplier_payment_orders WHERE id=fixture_id(660)),
  'supplier order is not void or confirmation is missing');
SELECT fixture_assert((SELECT status = 'cancelled' AND amount_paid = 0 FROM supplier_invoices WHERE payment_order_id=fixture_id(660)),
  'supplier invoice is not void');
SELECT fixture_assert(NOT EXISTS (SELECT FROM journal_entries WHERE source_type='supplier_invoice'
  AND source_id=(SELECT id FROM supplier_invoices WHERE payment_order_id=fixture_id(660))), 'supplier accrual was not removed');
SELECT fixture_assert((SELECT status='approved' FROM supplier_payment_orders WHERE id=fixture_id(661))
  AND (SELECT status='approved' FROM supplier_payment_orders WHERE id=fixture_id(662))
  AND (SELECT status='approved' FROM supplier_payment_orders WHERE id=fixture_id(663)),
  'locked, partly paid or unrelated order was cancelled');
SELECT fixture_assert(NOT has_function_privilege('anon','public.close_unpaid_supplier_order(uuid,text)','EXECUTE'),
  'public grant permits anonymous supplier cancellation');
