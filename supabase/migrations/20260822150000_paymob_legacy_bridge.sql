BEGIN;

-- The hosted project can briefly run an older Edge Function while a new Git
-- commit is syncing.  This RPC freezes a checkout in the database first, so
-- both the old and the hardened Edge Function receive server-calculated data.
CREATE OR REPLACE FUNCTION public.prepare_subscription_checkout(
  _organization_id uuid,
  _plan_id uuid,
  _billing_cycle text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_plan public.subscription_plans%ROWTYPE;
  v_amount_cents bigint;
  v_session public.payment_checkout_sessions%ROWTYPE;
  v_cycle text:=lower(trim(COALESCE(_billing_cycle,'')));
BEGIN
  IF v_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Billing cycle must be monthly or yearly';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id=_organization_id
      AND om.user_id=auth.uid()
      AND om.is_active
      AND om.role::text IN ('owner','manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to purchase this organization subscription';
  END IF;

  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id=_plan_id AND is_active;
  IF NOT FOUND OR v_plan.price_monthly<=0 OR v_plan.price_yearly<=0 THEN
    RAISE EXCEPTION 'Subscription plan is not available';
  END IF;
  v_amount_cents:=round(
    CASE WHEN v_cycle='yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END*100
  );

  INSERT INTO public.payment_checkout_sessions(
    organization_id,plan_id,billing_cycle,amount_cents,currency,
    merchant_order_id,created_by,status
  ) VALUES (
    _organization_id,_plan_id,v_cycle,v_amount_cents,'EGP',
    'org_'||_organization_id::text||'_plan_'||_plan_id::text||'_'||v_cycle||'_'||
      substr(replace(gen_random_uuid()::text,'-',''),1,8),
    auth.uid(),'pending'
  ) RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'checkout_session_id',v_session.id,
    'organization_id',v_session.organization_id,
    'plan_id',v_session.plan_id,
    'billing_cycle',v_session.billing_cycle,
    'amount_cents',v_session.amount_cents,
    'currency',v_session.currency,
    'merchant_order_id',v_session.merchant_order_id,
    'expires_at',v_session.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._enrich_paymob_transaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
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
    IF v_session.paymob_order_id IS NULL
       AND NEW.paymob_order_id IS NOT NULL
       AND NEW.hmac_valid IS TRUE THEN
      UPDATE public.payment_checkout_sessions
      SET paymob_order_id=NEW.paymob_order_id,updated_at=now()
      WHERE id=v_session.id;
      v_session.paymob_order_id:=NEW.paymob_order_id;
    END IF;
    v_valid:=
      v_session.expires_at>=now()
      AND (
        v_session.status='pending'
        OR (
          v_session.status='paid'
          AND v_session.provider_transaction_id=NEW.paymob_transaction_id
        )
      )
      AND v_session.paymob_order_id IS NOT DISTINCT FROM NEW.paymob_order_id
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

DROP TRIGGER IF EXISTS trg_enrich_paymob_transaction ON public.payment_transactions;
CREATE TRIGGER trg_enrich_paymob_transaction
BEFORE INSERT OR UPDATE OF raw_payload,status,hmac_valid,amount_cents,currency,
  paymob_order_id,checkout_session_id
ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public._enrich_paymob_transaction();

CREATE OR REPLACE FUNCTION public.activate_subscription_from_paymob(
  _paymob_transaction_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
  v_session public.payment_checkout_sessions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_days integer;
  v_base timestamptz;
  v_has_subscription boolean;
BEGIN
  IF nullif(trim(COALESCE(_paymob_transaction_id,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Paymob transaction ID is required';
  END IF;
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE paymob_transaction_id=_paymob_transaction_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment transaction not found'; END IF;
  IF v_tx.subscription_activated_at IS NOT NULL THEN RETURN false; END IF;
  IF v_tx.status<>'success' OR v_tx.hmac_valid IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Payment is not a verified successful transaction';
  END IF;
  IF v_tx.checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'Payment has no verified checkout session';
  END IF;

  SELECT * INTO v_session
  FROM public.payment_checkout_sessions
  WHERE id=v_tx.checkout_session_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout session not found'; END IF;
  IF v_session.expires_at<now() THEN RAISE EXCEPTION 'Checkout session expired'; END IF;
  IF v_session.paymob_order_id IS DISTINCT FROM v_tx.paymob_order_id
     OR v_session.amount_cents<>v_tx.amount_cents
     OR v_session.amount_cents<>v_tx.expected_amount_cents
     OR v_session.currency<>upper(COALESCE(v_tx.currency,''))
     OR v_session.organization_id IS DISTINCT FROM v_tx.organization_id
     OR v_session.plan_id IS DISTINCT FROM v_tx.plan_id
     OR v_session.billing_cycle IS DISTINCT FROM v_tx.billing_cycle THEN
    RAISE EXCEPTION 'Payment does not match checkout session';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id=v_session.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription plan not found'; END IF;
  v_days:=CASE WHEN v_session.billing_cycle='yearly' THEN 365
               ELSE COALESCE(v_plan.duration_days,30) END;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_session.organization_id::text,0));
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id=v_session.organization_id
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;
  v_has_subscription:=FOUND;

  PERFORM set_config('app.paymob_activation','1',true);
  IF v_has_subscription THEN
    v_base:=CASE
      WHEN v_subscription.plan_id=v_session.plan_id
       AND v_subscription.status IN ('active','trialing')
       AND v_subscription.expires_at>now()
      THEN v_subscription.expires_at ELSE now() END;
    UPDATE public.subscriptions
    SET plan_id=v_session.plan_id,status='active',
        starts_at=CASE WHEN v_subscription.plan_id=v_session.plan_id
                       THEN v_subscription.starts_at ELSE now() END,
        expires_at=v_base+make_interval(days=>v_days),
        payment_method='paymob',payment_reference=_paymob_transaction_id,
        paymob_transaction_id=_paymob_transaction_id,grace_period_days=2,
        updated_at=now()
    WHERE id=v_subscription.id;
  ELSE
    INSERT INTO public.subscriptions(
      organization_id,plan_id,status,starts_at,expires_at,payment_method,
      payment_reference,paymob_transaction_id,grace_period_days
    ) VALUES (
      v_session.organization_id,v_session.plan_id,'active',now(),
      now()+make_interval(days=>v_days),'paymob',_paymob_transaction_id,
      _paymob_transaction_id,2
    );
  END IF;
  PERFORM set_config('app.paymob_activation','0',true);

  UPDATE public.payment_checkout_sessions
  SET status='paid',provider_transaction_id=_paymob_transaction_id,updated_at=now()
  WHERE id=v_session.id;
  UPDATE public.payment_transactions
  SET subscription_activated_at=now(),updated_at=now()
  WHERE id=v_tx.id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public._activate_verified_paymob_transaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NEW.status='success'
     AND NEW.hmac_valid IS TRUE
     AND NEW.checkout_session_id IS NOT NULL
     AND NEW.subscription_activated_at IS NULL THEN
    BEGIN
      PERFORM public.activate_subscription_from_paymob(NEW.paymob_transaction_id);
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.payment_transactions
      SET error_message='Subscription activation failed: '||SQLERRM,updated_at=now()
      WHERE id=NEW.id;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_verified_paymob_transaction
ON public.payment_transactions;
CREATE TRIGGER trg_activate_verified_paymob_transaction
AFTER INSERT OR UPDATE OF status,hmac_valid,checkout_session_id
ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public._activate_verified_paymob_transaction();

-- The legacy webhook attempted a second, plan-unaware 30-day extension after
-- inserting the transaction.  The trigger above already activated the exact
-- frozen checkout, so suppress only that service-role duplicate write.
CREATE OR REPLACE FUNCTION public._guard_legacy_paymob_subscription_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
BEGIN
  IF COALESCE(current_setting('app.paymob_activation',true),'0')='1' THEN
    RETURN NEW;
  END IF;
  IF auth.role()='service_role'
     AND NEW.payment_method='paymob'
     AND NEW.paymob_transaction_id IS NOT NULL THEN
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE paymob_transaction_id=NEW.paymob_transaction_id;
    IF v_tx.id IS NULL
       OR v_tx.status<>'success'
       OR v_tx.hmac_valid IS DISTINCT FROM true
       OR v_tx.checkout_session_id IS NULL
       OR v_tx.subscription_activated_at IS NOT NULL THEN
      RETURN OLD;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_legacy_paymob_subscription_update
ON public.subscriptions;
CREATE TRIGGER trg_guard_legacy_paymob_subscription_update
BEFORE UPDATE OF plan_id,expires_at,payment_method,payment_reference,
  paymob_transaction_id
ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public._guard_legacy_paymob_subscription_update();

REVOKE ALL ON FUNCTION public.prepare_subscription_checkout(uuid,uuid,text)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_subscription_checkout(uuid,uuid,text)
TO authenticated;

REVOKE ALL ON FUNCTION public._enrich_paymob_transaction()
FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public._activate_verified_paymob_transaction()
FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public._guard_legacy_paymob_subscription_update()
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._enrich_paymob_transaction() TO service_role;
GRANT EXECUTE ON FUNCTION public._activate_verified_paymob_transaction() TO service_role;
GRANT EXECUTE ON FUNCTION public._guard_legacy_paymob_subscription_update() TO service_role;

COMMIT;
