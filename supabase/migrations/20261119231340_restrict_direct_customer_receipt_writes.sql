-- Both the receipt RPC and the temporary cached-browser path share these checks.
CREATE OR REPLACE FUNCTION operations_private.prepare_pilgrimage_passenger_receipt(
  _pilgrim_id uuid, _amount numeric, _exchange_rate numeric, _method text,
  _treasury_account_id uuid, _payment_date date, _reference text, _client_ref text
) RETURNS public.customer_payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  passenger public.pilgrims%ROWTYPE;
  program public.pilgrimage_programs%ROWTYPE;
  receipt public.customer_payments%ROWTYPE;
  treasury public.bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO passenger FROM public.pilgrims
  WHERE id = _pilgrim_id AND auth.uid() IS NOT NULL
    AND public.can_process_org_payments(organization_id)
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
      RETURN receipt;
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


  receipt.organization_id := passenger.organization_id;
  receipt.pilgrim_id := passenger.id;
  receipt.customer_id := passenger.customer_id;
  receipt.amount := _amount;
  receipt.amount_base := round(_amount * _exchange_rate, 2);
  receipt.exchange_rate := _exchange_rate;
  receipt.currency := program.currency;
  receipt.payment_method := _method;
  receipt.treasury_account_id := treasury.id;
  receipt.reference_number := _reference;
  receipt.payment_date := _payment_date;
  receipt.notes := concat_ws(' · ', program.name, passenger.full_name);
  receipt.status := 'completed';
  receipt.client_ref := _client_ref;
  receipt.created_by := auth.uid();
  RETURN receipt;
END;
$function$;

REVOKE ALL ON FUNCTION operations_private.prepare_pilgrimage_passenger_receipt(uuid, numeric, numeric, text, uuid, date, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_pilgrimage_passenger_receipt(
  _pilgrim_id uuid, _amount numeric, _exchange_rate numeric, _method text,
  _treasury_account_id uuid, _payment_date date, _reference text, _client_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  receipt public.customer_payments%ROWTYPE;
BEGIN
  receipt := operations_private.prepare_pilgrimage_passenger_receipt(
    _pilgrim_id, _amount, _exchange_rate, _method, _treasury_account_id, _payment_date, _reference, _client_ref
  );
  IF receipt.id IS NOT NULL THEN RETURN to_jsonb(receipt); END IF;

  INSERT INTO public.customer_payments (
    organization_id, pilgrim_id, customer_id, amount, amount_base, exchange_rate, currency,
    payment_method, treasury_account_id, reference_number, payment_date, notes, status, client_ref, created_by
  ) VALUES (
    receipt.organization_id, receipt.pilgrim_id, receipt.customer_id, receipt.amount, receipt.amount_base,
    receipt.exchange_rate, receipt.currency, receipt.payment_method, receipt.treasury_account_id,
    receipt.reference_number, receipt.payment_date, receipt.notes, receipt.status, receipt.client_ref, receipt.created_by
  ) RETURNING * INTO receipt;
  RETURN to_jsonb(receipt);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_pilgrimage_passenger_receipt(uuid, numeric, numeric, text, uuid, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pilgrimage_passenger_receipt(uuid, numeric, numeric, text, uuid, date, text, text)
  TO authenticated;

-- The previously published pilgrimage page inserts standalone traveler receipts directly.
-- Keep just that insert shape for cached tabs and validate it exactly like the RPC.
CREATE OR REPLACE FUNCTION operations_private.guard_cached_pilgrimage_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  draft public.customer_payments%ROWTYPE;
BEGIN
  IF NEW.pilgrim_id IS NULL OR NEW.booking_id IS NOT NULL OR NEW.invoice_id IS NOT NULL
    OR NEW.status IS DISTINCT FROM 'completed' OR NEW.is_demo IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Use the authorized receipt posting procedure' USING ERRCODE = '42501';
  END IF;
  draft := operations_private.prepare_pilgrimage_passenger_receipt(
    NEW.pilgrim_id, NEW.amount, NEW.exchange_rate, NEW.payment_method,
    NEW.treasury_account_id, NEW.payment_date, NEW.reference_number, NEW.client_ref
  );
  IF (NEW.organization_id, NEW.customer_id, NEW.currency) IS DISTINCT FROM
     (draft.organization_id, draft.customer_id, draft.currency) THEN
    RAISE EXCEPTION 'Receipt does not match the traveler organization or currency' USING ERRCODE = '42501';
  END IF;

  -- Let the existing unique request constraint reject an exact retry. Cached clients
  -- already handle that conflict by reading and checking the first receipt.
  NEW.id := gen_random_uuid();
  NEW.amount_base := draft.amount_base;
  NEW.notes := draft.notes;
  NEW.created_by := auth.uid();
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION operations_private.guard_cached_pilgrimage_receipt() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER guard_cached_pilgrimage_receipt BEFORE INSERT ON public.customer_payments
FOR EACH ROW WHEN (CURRENT_USER = 'authenticated')
EXECUTE FUNCTION operations_private.guard_cached_pilgrimage_receipt();

DROP POLICY IF EXISTS cp_write ON public.customer_payments;
DROP POLICY IF EXISTS cp_cached_pilgrimage_insert ON public.customer_payments;
CREATE POLICY cp_cached_pilgrimage_insert ON public.customer_payments FOR INSERT TO authenticated
WITH CHECK (
  pilgrim_id IS NOT NULL AND booking_id IS NULL AND invoice_id IS NULL
  AND public.can_process_org_payments(organization_id)
);
DROP POLICY IF EXISTS cpa_write ON public.customer_payment_allocations;
REVOKE UPDATE, DELETE, TRUNCATE ON public.customer_payments FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.customer_payments FROM PUBLIC, anon;
GRANT INSERT ON public.customer_payments TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.customer_payment_allocations
  FROM PUBLIC, anon, authenticated;
