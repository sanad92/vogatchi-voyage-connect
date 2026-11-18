BEGIN;

CREATE TABLE public.subscription_discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  percent integer NOT NULL CHECK (percent BETWEEN 1 AND 95),
  duration_months integer NOT NULL CHECK (duration_months BETWEEN 1 AND 24),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_discount_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscription_discount_codes TO authenticated;
CREATE POLICY platform_manages_subscription_discount_codes
ON public.subscription_discount_codes FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.subscription_discount_entitlements (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  discount_code_id uuid NOT NULL REFERENCES public.subscription_discount_codes(id),
  percent integer NOT NULL,
  duration_months integer NOT NULL,
  months_used integer NOT NULL CHECK (months_used > 0 AND months_used <= duration_months),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, discount_code_id)
);
ALTER TABLE private.subscription_discount_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.subscription_discount_entitlements FROM PUBLIC, anon, authenticated;

ALTER TABLE public.payment_checkout_sessions
  ADD COLUMN discount_code_id uuid REFERENCES public.subscription_discount_codes(id),
  ADD COLUMN discount_percent integer,
  ADD COLUMN discount_duration_months integer,
  ADD COLUMN original_amount_cents bigint,
  ADD COLUMN discount_recorded boolean NOT NULL DEFAULT false;

CREATE INDEX payment_checkout_sessions_pending_discount_idx
ON public.payment_checkout_sessions (organization_id, expires_at)
WHERE discount_code_id IS NOT NULL AND status = 'pending';

-- Record the benefit atomically with activation and keep later provider updates
-- from moving an already-paid checkout back to pending or failed.
CREATE FUNCTION private.record_paid_subscription_discount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_months integer := CASE WHEN NEW.billing_cycle = 'yearly' THEN 12 ELSE 1 END;
BEGIN
  IF OLD.discount_recorded THEN
    RETURN OLD;
  END IF;
  INSERT INTO private.subscription_discount_entitlements AS current_discount (
    organization_id, discount_code_id, percent, duration_months, months_used
  ) VALUES (
    NEW.organization_id, NEW.discount_code_id, NEW.discount_percent,
    NEW.discount_duration_months, v_months
  )
  ON CONFLICT (organization_id, discount_code_id) DO UPDATE
  SET months_used = current_discount.months_used + v_months
  WHERE current_discount.months_used + v_months <= current_discount.duration_months;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription discount period already used';
  END IF;
  NEW.discount_recorded := true;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_paid_subscription_discount() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_paid_subscription_discount
BEFORE UPDATE OF status ON public.payment_checkout_sessions
FOR EACH ROW WHEN (
  (NEW.status = 'paid' AND NEW.discount_code_id IS NOT NULL AND NOT OLD.discount_recorded)
  OR (OLD.discount_recorded AND OLD.status = 'paid' AND NEW.status IN ('pending', 'failed'))
)
EXECUTE FUNCTION private.record_paid_subscription_discount();

CREATE FUNCTION private.subscription_checkout_price(
  _organization_id uuid, _plan_id uuid, _billing_cycle text, _discount_code text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE
  v_code text := nullif(upper(btrim(coalesce(_discount_code, ''))), '');
  v_cycle text := lower(btrim(coalesce(_billing_cycle, '')));
  v_months integer := CASE WHEN v_cycle = 'yearly' THEN 12 ELSE 1 END;
  v_plan public.subscription_plans%ROWTYPE;
  v_offer public.subscription_discount_codes%ROWTYPE;
  v_entitlement private.subscription_discount_entitlements%ROWTYPE;
  v_discount_id uuid;
  v_percent integer;
  v_duration integer;
  v_original bigint;
  v_amount bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _organization_id AND user_id = auth.uid()
      AND is_active AND role::text IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية شراء اشتراك لهذه الشركة';
  END IF;
  IF v_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'دورة الفوترة غير متاحة';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = _plan_id AND is_active;
  IF NOT FOUND OR v_plan.price_monthly <= 0 OR v_plan.price_yearly <= 0 THEN
    RAISE EXCEPTION 'هذه الباقة غير متاحة';
  END IF;
  v_original := round((CASE WHEN v_cycle = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END) * 100);

  SELECT * INTO v_entitlement
  FROM private.subscription_discount_entitlements
  WHERE organization_id = _organization_id
    AND months_used < duration_months
    AND redeemed_at + make_interval(months => duration_months) > now()
  ORDER BY redeemed_at DESC
  LIMIT 1;

  IF v_entitlement.discount_code_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.subscription_discount_codes WHERE id = v_entitlement.discount_code_id;
    IF v_code IS NOT NULL AND v_code <> v_offer.code THEN
      RAISE EXCEPTION 'يوجد عرض خصم مفعّل لهذه الشركة';
    END IF;
    IF v_entitlement.months_used + v_months <= v_entitlement.duration_months THEN
      v_discount_id := v_offer.id;
      v_percent := v_entitlement.percent;
      v_duration := v_entitlement.duration_months;
    ELSIF v_code IS NOT NULL THEN
      RAISE EXCEPTION 'مدة الخصم المتبقية لا تكفي لدورة الفوترة المختارة';
    END IF;
  ELSIF v_code IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.subscription_discount_codes
    WHERE code = v_code AND is_active
      AND (expires_at IS NULL OR expires_at > now())
      AND (organization_id IS NULL OR organization_id = _organization_id);
    IF NOT FOUND OR EXISTS (
      SELECT 1 FROM private.subscription_discount_entitlements
      WHERE organization_id = _organization_id AND discount_code_id = v_offer.id
    ) THEN
      RAISE EXCEPTION 'كود الخصم غير صالح لهذه الشركة';
    END IF;
    IF v_months > v_offer.duration_months THEN
      RAISE EXCEPTION 'مدة الخصم لا تكفي لدورة الفوترة المختارة';
    END IF;
    v_discount_id := v_offer.id;
    v_percent := v_offer.percent;
    v_duration := v_offer.duration_months;
  END IF;

  v_amount := round(v_original::numeric * (100 - coalesce(v_percent, 0)) / 100);
  IF v_amount < 100 THEN
    RAISE EXCEPTION 'مبلغ الدفع أقل من الحد الأدنى';
  END IF;
  RETURN jsonb_build_object(
    'billing_cycle', v_cycle,
    'original_amount_cents', v_original,
    'amount_cents', v_amount,
    'discount_code_id', v_discount_id,
    'discount_code', CASE WHEN v_discount_id IS NOT NULL THEN v_offer.code END,
    'discount_percent', v_percent,
    'discount_duration_months', v_duration
  );
END;
$$;
REVOKE ALL ON FUNCTION private.subscription_checkout_price(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.quote_subscription_discount(
  _organization_id uuid, _plan_id uuid, _billing_cycle text, _discount_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT private.subscription_checkout_price(_organization_id, _plan_id, _billing_cycle, _discount_code)
    - 'discount_code_id';
$$;
REVOKE ALL ON FUNCTION public.quote_subscription_discount(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quote_subscription_discount(uuid, uuid, text, text) TO authenticated;

-- Keep the legacy three-argument RPC for clients during rollout.
CREATE FUNCTION public.prepare_subscription_checkout_with_discount(
  _organization_id uuid, _plan_id uuid, _billing_cycle text, _discount_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_price jsonb;
  v_pending public.payment_checkout_sessions%ROWTYPE;
  v_discount_id uuid;
  v_cycle text;
  v_amount bigint;
BEGIN
  -- Serialize with both other checkout preparations and Paymob activation.
  PERFORM pg_advisory_xact_lock(hashtextextended(_organization_id::text, 0));
  v_price := private.subscription_checkout_price(_organization_id, _plan_id, _billing_cycle, _discount_code);
  v_discount_id := (v_price ->> 'discount_code_id')::uuid;
  v_cycle := v_price ->> 'billing_cycle';
  v_amount := (v_price ->> 'amount_cents')::bigint;

  IF v_discount_id IS NOT NULL THEN
    SELECT * INTO v_pending FROM public.payment_checkout_sessions
    WHERE organization_id = _organization_id AND discount_code_id IS NOT NULL
      AND status = 'pending' AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1;

    IF FOUND AND (
      v_pending.created_by IS DISTINCT FROM auth.uid() OR
      v_pending.plan_id <> _plan_id OR v_pending.billing_cycle <> v_cycle OR
      v_pending.discount_code_id <> v_discount_id OR v_pending.amount_cents <> v_amount
    ) THEN
      RAISE EXCEPTION 'توجد عملية دفع بالخصم قيد الانتظار لهذه الشركة';
    END IF;
  END IF;

  IF v_pending.id IS NULL THEN
    INSERT INTO public.payment_checkout_sessions (
      organization_id, plan_id, billing_cycle, amount_cents, currency, merchant_order_id, created_by, status,
      discount_code_id, discount_percent, discount_duration_months, original_amount_cents
    ) VALUES (
      _organization_id, _plan_id, v_cycle, v_amount, 'EGP',
      'org_' || _organization_id::text || '_plan_' || _plan_id::text || '_' || v_cycle || '_' ||
        substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
      auth.uid(), 'pending', v_discount_id, (v_price ->> 'discount_percent')::integer,
      (v_price ->> 'discount_duration_months')::integer, (v_price ->> 'original_amount_cents')::bigint
    ) RETURNING * INTO v_pending;
  END IF;

  RETURN (v_price - 'discount_code_id') || jsonb_build_object(
    'checkout_session_id', v_pending.id,
    'organization_id', v_pending.organization_id,
    'plan_id', v_pending.plan_id,
    'currency', v_pending.currency,
    'merchant_order_id', v_pending.merchant_order_id,
    'expires_at', v_pending.expires_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_subscription_checkout_with_discount(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_subscription_checkout_with_discount(uuid, uuid, text, text) TO authenticated;

COMMIT;
