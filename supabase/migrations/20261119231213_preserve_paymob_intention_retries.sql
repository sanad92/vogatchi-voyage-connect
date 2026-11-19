BEGIN;

CREATE TABLE private.paymob_intention_credentials (
  checkout_id uuid PRIMARY KEY REFERENCES public.payment_checkout_sessions(id) ON DELETE CASCADE,
  client_secret text
);

ALTER TABLE private.paymob_intention_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.paymob_intention_credentials FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.claim_paymob_checkout_intention(p_checkout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_checkout public.payment_checkout_sessions%ROWTYPE;
  v_credential private.paymob_intention_credentials%ROWTYPE;
BEGIN
  SELECT * INTO v_checkout
  FROM public.payment_checkout_sessions
  WHERE id = p_checkout_id
  FOR UPDATE;
  IF NOT FOUND OR v_checkout.status NOT IN ('pending', 'failed') OR v_checkout.expires_at <= now() THEN
    RETURN jsonb_build_object('state', 'closed');
  END IF;

  SELECT * INTO v_credential FROM private.paymob_intention_credentials WHERE checkout_id = p_checkout_id;
  IF v_credential.client_secret IS NOT NULL AND v_checkout.paymob_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('state', 'ready', 'client_secret', v_credential.client_secret,
      'order_id', v_checkout.paymob_order_id);
  END IF;
  IF v_credential.checkout_id IS NOT NULL OR v_checkout.paymob_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('state', 'in_progress');
  END IF;

  INSERT INTO private.paymob_intention_credentials(checkout_id) VALUES (p_checkout_id);
  RETURN jsonb_build_object('state', 'claimed');
END;
$$;

CREATE FUNCTION public.complete_paymob_checkout_intention(
  p_checkout_id uuid, p_paymob_order_id text, p_client_secret text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_checkout public.payment_checkout_sessions%ROWTYPE;
  v_secret text;
BEGIN
  IF p_paymob_order_id IS NULL OR p_paymob_order_id !~ '^[0-9]+$'
    OR nullif(p_client_secret, '') IS NULL
  THEN
    RAISE EXCEPTION 'Invalid provider intention response' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_checkout FROM public.payment_checkout_sessions WHERE id = p_checkout_id FOR UPDATE;
  IF NOT FOUND OR v_checkout.status NOT IN ('pending', 'failed')
    OR (v_checkout.paymob_order_id IS NOT NULL AND v_checkout.paymob_order_id IS DISTINCT FROM p_paymob_order_id)
  THEN
    RAISE EXCEPTION 'Provider intention does not match checkout' USING ERRCODE = '22023';
  END IF;

  SELECT client_secret INTO v_secret FROM private.paymob_intention_credentials WHERE checkout_id = p_checkout_id;
  IF NOT FOUND OR (v_secret IS NOT NULL AND v_secret IS DISTINCT FROM p_client_secret) THEN
    RAISE EXCEPTION 'Provider intention was not claimed' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_checkout_sessions
  SET paymob_order_id = p_paymob_order_id, updated_at = now()
  WHERE id = p_checkout_id AND paymob_order_id IS NULL;
  UPDATE private.paymob_intention_credentials
  SET client_secret = p_client_secret
  WHERE checkout_id = p_checkout_id AND client_secret IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_paymob_checkout_intention(uuid),
  public.complete_paymob_checkout_intention(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paymob_checkout_intention(uuid),
  public.complete_paymob_checkout_intention(uuid, text, text) TO service_role;

CREATE FUNCTION private.preserve_paymob_checkout_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.merchant_order_id IS DISTINCT FROM OLD.merchant_order_id
    OR (OLD.paymob_order_id IS NOT NULL AND NEW.paymob_order_id IS DISTINCT FROM OLD.paymob_order_id)
  THEN
    RAISE EXCEPTION 'A checkout provider reference cannot be replaced' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.preserve_paymob_checkout_reference() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_preserve_paymob_checkout_reference
  BEFORE UPDATE OF merchant_order_id, paymob_order_id ON public.payment_checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION private.preserve_paymob_checkout_reference();

-- A rejected card attempt does not close a live intention. A subsequent
-- signed receipt can settle the same immutable provider order.
CREATE OR REPLACE FUNCTION public._enrich_paymob_transaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_session public.payment_checkout_sessions%ROWTYPE;
  v_merchant_order_id text;
  v_valid boolean:=false;
BEGIN
  v_merchant_order_id:=NEW.raw_payload #>> '{obj,order,merchant_order_id}';
  IF NEW.checkout_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public.payment_checkout_sessions
    WHERE id=NEW.checkout_session_id
    FOR UPDATE;
  ELSIF nullif(v_merchant_order_id,'') IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public.payment_checkout_sessions
    WHERE merchant_order_id=v_merchant_order_id
    FOR UPDATE;
  END IF;

  IF v_session.id IS NOT NULL THEN
    v_valid:=
      v_session.expires_at>=now()
      AND (
        v_session.status IN ('pending', 'failed')
        OR (
          v_session.status='paid'
          AND v_session.provider_transaction_id=NEW.paymob_transaction_id
        )
      )
      AND v_session.paymob_order_id IS NOT NULL
      AND v_session.paymob_order_id=NEW.paymob_order_id
      AND v_session.amount_cents=NEW.amount_cents
      AND v_session.currency=upper(COALESCE(NEW.currency,''));

    NEW.organization_id:=v_session.organization_id;
    NEW.checkout_session_id:=v_session.id;
    NEW.plan_id:=v_session.plan_id;
    NEW.billing_cycle:=v_session.billing_cycle;
    NEW.expected_amount_cents:=v_session.amount_cents;
  END IF;

  IF NEW.hmac_valid IS TRUE AND NEW.status='success' AND NOT v_valid THEN
    NEW.status:='invalid_checkout';
    NEW.error_message:='Verified Paymob transaction does not match a live server checkout session';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
