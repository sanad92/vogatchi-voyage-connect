BEGIN;

-- A server-created checkout session freezes the selected plan, billing cycle,
-- and expected amount.  The Paymob webhook must match this row before it can
-- activate a subscription; browser-supplied prices are never trusted.
CREATE TABLE IF NOT EXISTS public.payment_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  amount_cents bigint NOT NULL CHECK (amount_cents>0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency='EGP'),
  merchant_order_id text NOT NULL UNIQUE,
  paymob_order_id text UNIQUE,
  provider_transaction_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','voided','refunded','expired')),
  created_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_checkout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_checkout_sessions_select_org ON public.payment_checkout_sessions;
CREATE POLICY payment_checkout_sessions_select_org
ON public.payment_checkout_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id=payment_checkout_sessions.organization_id
      AND om.user_id=auth.uid()
      AND om.is_active
  )
  OR public.is_platform_admin(auth.uid())
);

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS checkout_session_id uuid
    REFERENCES public.payment_checkout_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_id uuid
    REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS expected_amount_cents bigint,
  ADD COLUMN IF NOT EXISTS subscription_activated_at timestamptz;

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_billing_cycle_check;
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_billing_cycle_check
  CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','yearly')) NOT VALID;
ALTER TABLE public.payment_transactions
  VALIDATE CONSTRAINT payment_transactions_billing_cycle_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_transactions
    WHERE paymob_transaction_id IS NOT NULL
    GROUP BY paymob_transaction_id
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Duplicate Paymob transaction IDs must be resolved before launch';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_paymob_txn_uidx
ON public.payment_transactions(paymob_transaction_id);

CREATE INDEX IF NOT EXISTS payment_checkout_sessions_org_created_idx
ON public.payment_checkout_sessions(organization_id,created_at DESC);

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
  IF v_session.amount_cents<>v_tx.amount_cents
     OR v_session.amount_cents<>v_tx.expected_amount_cents
     OR v_session.currency<>upper(COALESCE(v_tx.currency,''))
     OR v_session.organization_id IS DISTINCT FROM v_tx.organization_id
     OR v_session.plan_id IS DISTINCT FROM v_tx.plan_id
     OR v_session.billing_cycle IS DISTINCT FROM v_tx.billing_cycle THEN
    RAISE EXCEPTION 'Payment does not match checkout session';
  END IF;

  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id=v_session.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription plan not found'; END IF;
  IF v_session.billing_cycle='yearly' THEN
    v_days:=365;
  ELSE
    v_days:=COALESCE(v_plan.duration_days,30);
  END IF;

  -- Serialize subscription changes per organization, including concurrent
  -- webhook retries for different payment transactions.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_session.organization_id::text,0));

  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id=v_session.organization_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_base:=CASE
      WHEN v_subscription.plan_id=v_session.plan_id
       AND v_subscription.status IN ('active','trialing')
       AND v_subscription.expires_at>now()
      THEN v_subscription.expires_at
      ELSE now()
    END;
    UPDATE public.subscriptions
    SET plan_id=v_session.plan_id,
        status='active',
        starts_at=CASE
          WHEN v_subscription.plan_id=v_session.plan_id THEN v_subscription.starts_at
          ELSE now()
        END,
        expires_at=v_base+make_interval(days=>v_days),
        payment_method='paymob',
        payment_reference=_paymob_transaction_id,
        paymob_transaction_id=_paymob_transaction_id,
        grace_period_days=2,
        updated_at=now()
    WHERE id=v_subscription.id;
  ELSE
    INSERT INTO public.subscriptions (
      organization_id,plan_id,status,starts_at,expires_at,payment_method,
      payment_reference,paymob_transaction_id,grace_period_days
    ) VALUES (
      v_session.organization_id,v_session.plan_id,'active',now(),
      now()+make_interval(days=>v_days),'paymob',_paymob_transaction_id,
      _paymob_transaction_id,2
    );
  END IF;

  UPDATE public.payment_checkout_sessions
  SET status='paid',provider_transaction_id=_paymob_transaction_id,updated_at=now()
  WHERE id=v_session.id;
  UPDATE public.payment_transactions
  SET subscription_activated_at=now(),updated_at=now()
  WHERE id=v_tx.id;
  RETURN true;
END;
$$;

REVOKE ALL ON TABLE public.payment_checkout_sessions FROM PUBLIC,anon;
GRANT SELECT ON TABLE public.payment_checkout_sessions TO authenticated;
GRANT ALL ON TABLE public.payment_checkout_sessions TO service_role;

REVOKE ALL ON FUNCTION public.activate_subscription_from_paymob(text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_from_paymob(text)
TO service_role;

COMMIT;
