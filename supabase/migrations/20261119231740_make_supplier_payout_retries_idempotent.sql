CREATE SCHEMA IF NOT EXISTS supplier_payment_private;
REVOKE ALL ON SCHEMA supplier_payment_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS supplier_payment_private.payout_requests (
  order_id uuid NOT NULL REFERENCES public.supplier_payment_orders(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  PRIMARY KEY (order_id, request_id)
);
ALTER TABLE supplier_payment_private.payout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON supplier_payment_private.payout_requests FROM PUBLIC, anon, authenticated;

-- Keep the existing approved-order posting path, including specialized B2B rules.
CREATE OR REPLACE FUNCTION public.record_supplier_payout(
  _po_id uuid, _request_id uuid, _amount numeric, _currency text, _exchange_rate numeric,
  _method text, _treasury_account_id uuid, _payment_date date, _reference text, _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  payment_order public.supplier_payment_orders%ROWTYPE;
  previous supplier_payment_private.payout_requests%ROWTYPE;
  payment uuid;
  requested jsonb := jsonb_build_array(_amount, _currency, _exchange_rate, _method,
    _treasury_account_id, _payment_date, _reference, _notes);
BEGIN
  IF _request_id IS NULL THEN RAISE EXCEPTION 'A payout request ID is required' USING ERRCODE = '22023'; END IF;

  SELECT * INTO payment_order FROM public.supplier_payment_orders
  WHERE id = _po_id AND public.can_process_org_payments(organization_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier payout not authorized' USING ERRCODE = '42501'; END IF;

  -- Pilgrimage B2B checks its narrower access and retries by transfer reference.
  IF to_jsonb(payment_order)->>'pilgrimage_b2b_agreement_id' IS NOT NULL THEN
    RETURN public.record_supplier_payment(_po_id, _amount, _currency, _exchange_rate, _method,
      _treasury_account_id, _payment_date, _reference, _notes);
  END IF;

  SELECT * INTO previous FROM supplier_payment_private.payout_requests
  WHERE order_id = _po_id AND request_id = _request_id;
  IF FOUND THEN
    IF previous.payload IS DISTINCT FROM requested THEN
      RAISE EXCEPTION 'Payout request ID is already in use' USING ERRCODE = '22023';
    END IF;
    RETURN previous.payment_id;
  END IF;

  payment := public.record_supplier_payment(_po_id, _amount, _currency, _exchange_rate, _method,
    _treasury_account_id, _payment_date, _reference, _notes);
  INSERT INTO supplier_payment_private.payout_requests (order_id, request_id, payment_id, payload)
  VALUES (_po_id, _request_id, payment, requested);
  RETURN payment;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_supplier_payout(uuid, uuid, numeric, text, numeric, text, uuid, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payout(uuid, uuid, numeric, text, numeric, text, uuid, date, text, text)
  TO authenticated;
