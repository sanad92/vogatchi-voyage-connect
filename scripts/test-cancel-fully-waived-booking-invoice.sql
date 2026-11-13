SET test.user_id = '00000000-0000-0000-0000-000000000010';
SELECT fixture_assert((SELECT status='cancelled' AND payment_status='cancelled'
  AND total_paid_amount=0 AND remaining_amount=0 FROM public.invoices WHERE id=fixture_id(520)),
  'previous fully credited invoice should be cancelled');
SELECT fixture_assert((SELECT count(*)=2 AND bool_and(is_locked)
  FROM public.journal_entries WHERE booking_id=fixture_id(320)
    AND source_type IN ('invoice','booking_cancellation_invoice_credit')),
  'original invoice journal and credit must both remain posted and locked');
SELECT fixture_assert((SELECT status='paid' FROM public.invoices WHERE id=fixture_id(521)),
  'invoice with a refund and retained fee should retain its settlement status');
SELECT fixture_assert((SELECT status='paid' FROM public.invoices WHERE id=fixture_id(522)),
  'invoice with a collected cancellation fee should remain paid');

INSERT INTO public.bookings (id, organization_id, customer_id, currency, status, workflow_stage)
VALUES (fixture_id(324),fixture_id(1),fixture_id(101),'EGP','confirmed','confirmed');
INSERT INTO public.invoices (id, organization_id, booking_id, customer_id, invoice_number, subtotal, vat_rate, status, currency)
VALUES (fixture_id(524),fixture_id(1),fixture_id(324),fixture_id(101),'CANCEL-NEW',100,10,'unpaid','EGP');
UPDATE public.journal_entries SET is_locked=true WHERE source_type='invoice' AND source_id=fixture_id(524);

DO $$
DECLARE v_preview jsonb;
BEGIN
  BEGIN
    UPDATE public.invoices SET status='cancelled' WHERE id=fixture_id(524);
    RAISE EXCEPTION 'uncredited locked invoice cancelled';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='uncredited locked invoice cancelled' THEN RAISE; END IF;
  END;

  v_preview := public.get_booking_cancellation_preview(fixture_id(324));
  PERFORM public.settle_booking_cancellation(fixture_id(324),'No cancellation fee',
    jsonb_build_object(fixture_id(524)::text,0.00),v_preview);

  PERFORM fixture_assert((SELECT status='cancelled' AND payment_status='cancelled'
    AND total_paid_amount=0 AND remaining_amount=0 FROM public.invoices WHERE id=fixture_id(524)),
    'new fully credited invoice should be cancelled');
  PERFORM fixture_assert((SELECT count(*)=2 AND bool_and(is_locked)
    FROM public.journal_entries WHERE booking_id=fixture_id(324)
      AND source_type IN ('invoice','booking_cancellation_invoice_credit')),
    'already locked invoice posting must remain alongside the credit');
  BEGIN
    UPDATE public.invoices SET status='unpaid' WHERE id=fixture_id(524);
    RAISE EXCEPTION 'waived invoice reactivated';
  EXCEPTION WHEN raise_exception OR invalid_parameter_value THEN
    IF SQLERRM='waived invoice reactivated' THEN RAISE; END IF;
  END;
END
$$;
