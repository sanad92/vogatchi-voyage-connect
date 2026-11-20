CREATE FUNCTION public.get_subscription_checkout_return(
  _organization_id uuid,
  _checkout_id uuid DEFAULT NULL,
  _order_id text DEFAULT NULL,
  _transaction_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_checkout public.payment_checkout_sessions%ROWTYPE;
  v_payment public.payment_transactions%ROWTYPE;
  v_subscription_current boolean;
BEGIN
  IF v_user_id IS NULL OR _organization_id IS NULL
    OR (_checkout_id IS NULL AND _order_id IS NULL AND _transaction_id IS NULL)
    OR (_order_id IS NOT NULL AND _order_id !~ '^[0-9]{1,32}$')
    OR (_transaction_id IS NOT NULL AND _transaction_id !~ '^[0-9]{1,32}$')
    OR NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = _organization_id AND m.user_id = v_user_id
        AND m.is_active IS TRUE AND m.role IN ('owner', 'manager')
    ) THEN
    RETURN NULL;
  END IF;

  SELECT c.* INTO v_checkout
  FROM public.payment_checkout_sessions c
  WHERE c.organization_id = _organization_id AND c.created_by = v_user_id
    AND (_checkout_id IS NULL OR c.id = _checkout_id)
    AND (_order_id IS NULL OR c.paymob_order_id = _order_id)
    AND (_checkout_id IS NOT NULL OR _order_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.payment_transactions p
      WHERE p.paymob_transaction_id = _transaction_id AND p.checkout_session_id = c.id
        AND p.organization_id = c.organization_id AND p.paymob_order_id = c.paymob_order_id
        AND p.hmac_valid IS TRUE
    ))
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT p.* INTO v_payment
  FROM public.payment_transactions p
  WHERE p.checkout_session_id = v_checkout.id AND p.organization_id = v_checkout.organization_id
    AND p.paymob_order_id = v_checkout.paymob_order_id AND p.plan_id = v_checkout.plan_id
    AND p.billing_cycle = v_checkout.billing_cycle AND p.currency = v_checkout.currency
    AND p.amount_cents = v_checkout.amount_cents AND p.expected_amount_cents = v_checkout.amount_cents
    AND p.hmac_valid IS TRUE
    AND p.paymob_transaction_id = COALESCE(_transaction_id, v_checkout.provider_transaction_id, p.paymob_transaction_id)
  ORDER BY p.created_at DESC, p.id DESC LIMIT 1;

  IF FOUND AND v_payment.status IN ('failed', 'voided', 'refunded') THEN
    RETURN pg_catalog.jsonb_build_object('state', v_payment.status);
  END IF;

  IF v_payment.status = 'success' AND v_payment.subscription_activated_at IS NOT NULL
    AND v_checkout.status = 'paid' AND v_checkout.provider_transaction_id = v_payment.paymob_transaction_id THEN
    SELECT COALESCE((
      SELECT s.status = 'active' AND s.expires_at > pg_catalog.now()
        AND s.paymob_transaction_id = v_payment.paymob_transaction_id AND s.plan_id = v_checkout.plan_id
      FROM public.subscriptions s
      WHERE s.organization_id = v_checkout.organization_id
      ORDER BY s.created_at DESC, s.id DESC LIMIT 1
    ), false) INTO v_subscription_current;

    RETURN pg_catalog.jsonb_build_object(
      'state', CASE WHEN v_subscription_current THEN 'activated' ELSE 'paid' END,
      'amount_cents', v_payment.amount_cents,
      'transaction_id', v_payment.paymob_transaction_id,
      'is_test', CASE COALESCE(v_payment.raw_payload->>'is_live',
        v_payment.raw_payload->'obj'->>'is_live', v_payment.raw_payload->'transaction'->>'is_live')
        WHEN 'true' THEN false WHEN 'false' THEN true ELSE NULL END
    );
  END IF;

  IF v_payment.status IS DISTINCT FROM 'success' AND v_checkout.expires_at <= pg_catalog.now() THEN
    RETURN pg_catalog.jsonb_build_object('state', 'expired');
  END IF;
  RETURN pg_catalog.jsonb_build_object('state', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.get_subscription_checkout_return(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_subscription_checkout_return(uuid, uuid, text, text) TO authenticated;
