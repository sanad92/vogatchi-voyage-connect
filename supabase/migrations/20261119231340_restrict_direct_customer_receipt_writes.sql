-- Ordinary and standalone pilgrimage receipts enter through server-validated posting paths.
CREATE FUNCTION public.record_pilgrimage_passenger_receipt(
  _pilgrim_id uuid, _amount numeric, _exchange_rate numeric, _method text,
  _treasury_account_id uuid, _payment_date date, _reference text, _client_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  passenger public.pilgrims%ROWTYPE;
  program public.pilgrimage_programs%ROWTYPE;
  receipt public.customer_payments%ROWTYPE;
  treasury public.bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO passenger FROM public.pilgrims
  WHERE id = _pilgrim_id AND public.can_process_org_payments(organization_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pilgrimage receipt not authorized' USING ERRCODE = '42501';
  END IF;

  IF _client_ref IS NULL OR length(btrim(_client_ref)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'A valid receipt request reference is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('customer-payment:' || passenger.organization_id::text || ':' || _client_ref, 0));
  SELECT * INTO receipt FROM public.customer_payments
  WHERE organization_id = passenger.organization_id AND client_ref = _client_ref;
  IF FOUND THEN
    IF (receipt.pilgrim_id, receipt.amount, receipt.exchange_rate, receipt.payment_method, receipt.treasury_account_id,
        receipt.payment_date, receipt.reference_number, receipt.status) IS NOT DISTINCT FROM
       (_pilgrim_id, _amount, _exchange_rate, _method, _treasury_account_id, _payment_date, _reference, 'completed'::text) THEN
      RETURN to_jsonb(receipt);
    END IF;
    RAISE EXCEPTION 'Receipt request reference is already in use' USING ERRCODE = '22023';
  END IF;

  IF passenger.b2b_roster_entry_id IS NOT NULL OR passenger.status = 'cancelled' OR EXISTS (
    SELECT 1 FROM public.umrah_inventory_bookings WHERE id = passenger.inventory_booking_id AND booking_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Use the authorized collection path for this passenger' USING ERRCODE = '22023';
  END IF;
  IF _amount IS NULL OR NOT (_amount > 0 AND _amount < 'Infinity'::numeric) OR _amount <> round(_amount, 2)
     OR _exchange_rate IS NULL OR NOT (_exchange_rate > 0 AND _exchange_rate < 'Infinity'::numeric)
     OR _exchange_rate <> round(_exchange_rate, 6) OR _payment_date IS NULL OR _method IS NULL
     OR _method NOT IN ('cash', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid receipt amount, exchange rate, date or method' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO program FROM public.pilgrimage_programs
  WHERE id = passenger.program_id AND organization_id = passenger.organization_id;
  IF NOT FOUND OR _amount > greatest(passenger.total_price - coalesce(passenger.paid_amount, 0), 0) THEN
    RAISE EXCEPTION 'Receipt amount exceeds the passenger balance' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO treasury FROM public.bank_accounts
  WHERE id = _treasury_account_id AND organization_id = passenger.organization_id AND is_active
  FOR NO KEY UPDATE;
  IF NOT FOUND OR treasury.currency IS DISTINCT FROM program.currency OR treasury.treasury_kind IS DISTINCT FROM
     (CASE WHEN _method = 'cash' THEN 'cash' ELSE 'bank' END) THEN
    RAISE EXCEPTION 'Treasury account does not match receipt currency or method' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.customer_payments (
    organization_id, pilgrim_id, customer_id, amount, amount_base, exchange_rate, currency,
    payment_method, treasury_account_id, reference_number, payment_date, notes, status, client_ref, created_by
  ) VALUES (
    passenger.organization_id, passenger.id, passenger.customer_id, _amount, round(_amount * _exchange_rate, 2),
    _exchange_rate, program.currency, _method, treasury.id, _reference, _payment_date,
    concat_ws(' · ', program.name, passenger.full_name), 'completed', _client_ref, auth.uid()
  ) RETURNING * INTO receipt;

  RETURN to_jsonb(receipt);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_pilgrimage_passenger_receipt(uuid, numeric, numeric, text, uuid, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pilgrimage_passenger_receipt(uuid, numeric, numeric, text, uuid, date, text, text)
  TO authenticated;

DROP POLICY IF EXISTS cp_write ON public.customer_payments;
DROP POLICY IF EXISTS cpa_write ON public.customer_payment_allocations;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.customer_payments, public.customer_payment_allocations
  FROM PUBLIC, anon, authenticated;
