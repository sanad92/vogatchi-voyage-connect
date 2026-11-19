BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN cancellation_scheduled_at timestamptz;

CREATE FUNCTION public.schedule_subscription_cancellation(
  p_organization_id uuid, p_subscription_id uuid
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    WHERE member.organization_id = p_organization_id
      AND member.user_id = auth.uid()
      AND member.is_active
      AND member.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Only an active organization owner or manager can schedule cancellation' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text, 0));
  SELECT * INTO v_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.organization_id = p_organization_id
  ORDER BY subscription.created_at DESC, subscription.id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_subscription.id IS DISTINCT FROM p_subscription_id
    OR v_subscription.status <> 'active'
    OR v_subscription.expires_at IS NULL OR v_subscription.expires_at <= v_now
    OR NOT EXISTS (
      SELECT 1 FROM public.subscription_plans AS plan
      WHERE plan.id = v_subscription.plan_id AND (plan.price_monthly > 0 OR plan.price_yearly > 0)
    )
  THEN
    RAISE EXCEPTION 'No current subscription with a remaining term' USING ERRCODE = '22023';
  END IF;

  IF v_subscription.cancellation_scheduled_at IS NULL THEN
    UPDATE public.subscriptions
    SET cancellation_scheduled_at = v_now, grace_period_days = 0, updated_at = v_now
    WHERE id = v_subscription.id;
  END IF;
  RETURN v_subscription.expires_at;
END;
$$;

CREATE FUNCTION public.clear_subscription_cancellation_on_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.cancellation_scheduled_at IS NOT NULL AND NEW.status = 'active'
    AND NEW.expires_at > now()
    AND NEW.payment_method IN ('paymob', 'bank_transfer')
    AND NEW.payment_reference IS NOT NULL
    AND (NEW.payment_method, NEW.payment_reference)
        IS DISTINCT FROM (OLD.payment_method, OLD.payment_reference)
  THEN
    NEW.cancellation_scheduled_at := NULL;
    IF NEW.grace_period_days = 0 THEN
      NEW.grace_period_days := 2;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clear_subscription_cancellation_on_payment
  BEFORE UPDATE OF payment_method, payment_reference, expires_at ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.clear_subscription_cancellation_on_payment();

CREATE FUNCTION public.platform_extend_subscription(p_subscription_id uuid, p_days integer)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_organization_id uuid;
  v_subscription public.subscriptions%ROWTYPE;
  v_expires_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin(auth.uid()) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Only a platform administrator can extend a subscription' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 3660 THEN
    RAISE EXCEPTION 'Invalid extension duration' USING ERRCODE = '22023';
  END IF;

  SELECT organization_id INTO v_organization_id FROM public.subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_organization_id::text, 0));
  SELECT * INTO v_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.organization_id = v_organization_id
  ORDER BY subscription.created_at DESC, subscription.id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_subscription.id IS DISTINCT FROM p_subscription_id THEN
    RAISE EXCEPTION 'Only the current subscription can be extended' USING ERRCODE = '22023';
  END IF;

  v_expires_at := greatest(v_subscription.expires_at, now()) + pg_catalog.make_interval(days => p_days);
  UPDATE public.subscriptions
  SET expires_at = v_expires_at, status = 'active', updated_at = now()
  WHERE id = v_subscription.id;
  RETURN v_expires_at;
END;
$$;

CREATE FUNCTION public.get_subscription_checkout_status(p_checkout_id uuid)
RETURNS TABLE (status text, amount_cents bigint, currency text, transaction_id text, activated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN checkout.status IN ('voided', 'refunded') THEN checkout.status
    WHEN receipt.subscription_activated_at IS NOT NULL
      AND checkout.status = 'paid'
      AND checkout.provider_transaction_id = receipt.paymob_transaction_id THEN 'confirmed'
    WHEN receipt.paymob_transaction_id IS NOT NULL THEN 'activating'
    WHEN checkout.status = 'failed' THEN 'failed'
    WHEN checkout.status = 'expired' OR checkout.expires_at <= now() THEN 'expired'
    ELSE 'pending'
  END,
  checkout.amount_cents, checkout.currency, receipt.paymob_transaction_id, receipt.subscription_activated_at
  FROM public.payment_checkout_sessions AS checkout
  LEFT JOIN LATERAL (
    SELECT tx.paymob_transaction_id, tx.subscription_activated_at
    FROM public.payment_transactions AS tx
    WHERE tx.checkout_session_id = checkout.id
      AND tx.organization_id = checkout.organization_id
      AND tx.plan_id = checkout.plan_id
      AND tx.billing_cycle = checkout.billing_cycle
      AND tx.paymob_order_id = checkout.paymob_order_id
      AND tx.amount_cents = checkout.amount_cents
      AND tx.expected_amount_cents = checkout.amount_cents
      AND tx.currency = checkout.currency
      AND tx.status = 'success'
      AND tx.hmac_valid IS TRUE
    ORDER BY (tx.paymob_transaction_id = checkout.provider_transaction_id) DESC NULLS LAST,
      tx.subscription_activated_at DESC NULLS LAST, tx.created_at DESC
    LIMIT 1
  ) AS receipt ON true
  WHERE checkout.id = p_checkout_id
    AND EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.organization_id = checkout.organization_id
        AND member.user_id = auth.uid()
        AND member.is_active
        AND member.role IN ('owner', 'manager')
    );
$$;

REVOKE ALL ON FUNCTION public.schedule_subscription_cancellation(uuid, uuid),
  public.platform_extend_subscription(uuid, integer), public.get_subscription_checkout_status(uuid),
  public.clear_subscription_cancellation_on_payment() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.schedule_subscription_cancellation(uuid, uuid),
  public.platform_extend_subscription(uuid, integer), public.get_subscription_checkout_status(uuid) TO authenticated;

COMMIT;
