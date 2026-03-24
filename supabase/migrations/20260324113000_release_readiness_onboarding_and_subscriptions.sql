-- Release readiness fixes for onboarding and subscription enforcement.
-- These definitions intentionally override earlier broken migration outputs
-- so a fresh migration produces a working SaaS onboarding flow.

INSERT INTO public.subscription_plans (
  name,
  name_ar,
  price_monthly,
  price_yearly,
  max_users,
  max_bookings_per_month,
  max_storage_mb,
  duration_days,
  features,
  is_active
)
SELECT
  seed.name,
  seed.name_ar,
  seed.price_monthly,
  seed.price_yearly,
  seed.max_users,
  seed.max_bookings_per_month,
  seed.max_storage_mb,
  seed.duration_days,
  seed.features,
  true
FROM (
  VALUES
    (
      'Free',
      'Free',
      0::numeric,
      0::numeric,
      2,
      20,
      500,
      30,
      '["basic_crm","hotel_bookings"]'::jsonb
    ),
    (
      'Basic',
      'Basic',
      299::numeric,
      2990::numeric,
      5,
      100,
      2000,
      30,
      '["basic_crm","hotel_bookings","flight_bookings","invoices","reports"]'::jsonb
    ),
    (
      'Pro',
      'Pro',
      599::numeric,
      5990::numeric,
      15,
      500,
      5000,
      30,
      '["basic_crm","hotel_bookings","flight_bookings","car_rentals","transport","invoices","reports","marketing","commissions"]'::jsonb
    ),
    (
      'Enterprise',
      'Enterprise',
      999::numeric,
      9990::numeric,
      50,
      9999,
      20000,
      30,
      '["all_features"]'::jsonb
    )
) AS seed(
  name,
  name_ar,
  price_monthly,
  price_yearly,
  max_users,
  max_bookings_per_month,
  max_storage_mb,
  duration_days,
  features
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscription_plans existing
  WHERE existing.name = seed.name
);

CREATE OR REPLACE FUNCTION public.count_org_bookings_this_month(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE((
      SELECT COUNT(*)
      FROM public.hotel_bookings
      WHERE organization_id = _org_id
        AND created_at >= date_trunc('month', now())
    ), 0)
    + COALESCE((
      SELECT COUNT(*)
      FROM public.flight_bookings
      WHERE organization_id = _org_id
        AND created_at >= date_trunc('month', now())
    ), 0)
    + COALESCE((
      SELECT COUNT(*)
      FROM public.car_rentals
      WHERE organization_id = _org_id
        AND created_at >= date_trunc('month', now())
    ), 0)
    + COALESCE((
      SELECT COUNT(*)
      FROM public.transport_bookings
      WHERE organization_id = _org_id
        AND created_at >= date_trunc('month', now())
    ), 0)
  )::integer
$$;

CREATE OR REPLACE FUNCTION public.auto_add_org_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    v_user_id,
    'owner',
    true
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role = 'owner',
    is_active = true;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id
  INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = 'Pro'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id
    INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.subscriptions
      WHERE organization_id = NEW.id
        AND status IN ('active', 'trialing')
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      notes,
      activated_by,
      grace_period_days
    )
    VALUES (
      NEW.id,
      v_plan_id,
      'trialing',
      now(),
      now() + interval '14 days',
      'First-login onboarding trial',
      auth.uid(),
      2
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  _name text,
  _slug text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _email text DEFAULT NULL,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_plan_id uuid;
  v_base_slug text;
  v_slug_candidate text;
  v_attempt integer := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF COALESCE(BTRIM(_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  v_base_slug := COALESCE(NULLIF(BTRIM(_slug), ''), BTRIM(_name));
  v_base_slug := LOWER(v_base_slug);
  v_base_slug := regexp_replace(v_base_slug, '[^a-z0-9\s-]', '', 'g');
  v_base_slug := regexp_replace(v_base_slug, '\s+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '-+', '-', 'g');
  v_base_slug := BTRIM(v_base_slug, '-');

  IF v_base_slug = '' THEN
    v_base_slug := 'org';
  END IF;

  LOOP
    EXIT WHEN v_attempt > 20;

    v_slug_candidate := CASE
      WHEN v_attempt = 0 THEN v_base_slug
      ELSE v_base_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6)
    END;

    BEGIN
      INSERT INTO public.organizations (
        name,
        slug,
        phone,
        email,
        address
      )
      VALUES (
        BTRIM(_name),
        v_slug_candidate,
        NULLIF(BTRIM(_phone), ''),
        NULLIF(BTRIM(_email), ''),
        NULLIF(BTRIM(_address), '')
      )
      RETURNING id INTO v_org_id;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_attempt := v_attempt + 1;
    END;
  END LOOP;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Could not create organization. Please try again.';
  END IF;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    is_active
  )
  VALUES (
    v_org_id,
    v_user_id,
    'owner',
    true
  )
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role = 'owner',
    is_active = true;

  SELECT id
  INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = 'Pro'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id
    INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription plan is configured';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE organization_id = v_org_id
      AND status IN ('active', 'trialing')
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    INSERT INTO public.subscriptions (
      organization_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      notes,
      activated_by,
      grace_period_days
    )
    VALUES (
      v_org_id,
      v_plan_id,
      'trialing',
      now(),
      now() + interval '14 days',
      'First-login onboarding trial',
      v_user_id,
      2
    );
  END IF;

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_subscription_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = _org_id
      AND s.status IN ('active', 'trialing')
      AND (
        s.expires_at IS NULL
        OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.check_subscription_limits(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count integer;
  v_booking_count integer;
  v_sub_active boolean;
  v_expires_at timestamptz;
  v_status text;
  v_is_trialing boolean;
  v_trial_days_remaining integer;
  v_in_grace boolean;
  v_fully_expired boolean;
  v_grace_period_days integer;
  v_max_users integer;
  v_max_bookings integer;
  v_max_storage_mb integer;
  v_plan_name text;
  v_plan_name_ar text;
BEGIN
  SELECT
    s.status IN ('active', 'trialing') AND (
      s.expires_at IS NULL
      OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now()
    ),
    s.expires_at,
    s.status,
    COALESCE(s.grace_period_days, 2),
    sp.max_users,
    sp.max_bookings_per_month,
    sp.max_storage_mb,
    sp.name,
    sp.name_ar
  INTO
    v_sub_active,
    v_expires_at,
    v_status,
    v_grace_period_days,
    v_max_users,
    v_max_bookings,
    v_max_storage_mb,
    v_plan_name,
    v_plan_name_ar
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = _org_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_plan_name IS NULL THEN
    RETURN jsonb_build_object(
      'active', false,
      'expired', true,
      'status', 'none',
      'error', 'No subscription found for this organization'
    );
  END IF;

  v_is_trialing := v_status = 'trialing';
  v_in_grace := v_expires_at IS NOT NULL
    AND v_expires_at < now()
    AND v_expires_at + (v_grace_period_days || ' days')::interval > now();
  v_fully_expired := v_expires_at IS NOT NULL
    AND v_expires_at + (v_grace_period_days || ' days')::interval <= now();

  IF v_is_trialing AND v_expires_at IS NOT NULL THEN
    v_trial_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_expires_at - now())::integer);
  ELSE
    v_trial_days_remaining := NULL;
  END IF;

  v_member_count := public.count_org_members(_org_id);
  v_booking_count := public.count_org_bookings_this_month(_org_id);

  RETURN jsonb_build_object(
    'active', COALESCE(v_sub_active, false),
    'expired', COALESCE(v_fully_expired, true),
    'expires_at', v_expires_at,
    'status', v_status,
    'is_trialing', v_is_trialing,
    'trial_days_remaining', v_trial_days_remaining,
    'in_grace_period', COALESCE(v_in_grace, false),
    'grace_period_days', v_grace_period_days,
    'plan_name', v_plan_name,
    'plan_name_ar', v_plan_name_ar,
    'limits', jsonb_build_object(
      'max_users', v_max_users,
      'max_bookings', v_max_bookings,
      'max_storage_mb', v_max_storage_mb
    ),
    'usage', jsonb_build_object(
      'users', v_member_count,
      'bookings_this_month', v_booking_count
    ),
    'can_add_user', v_member_count < v_max_users AND COALESCE(v_sub_active, false),
    'can_add_booking', v_booking_count < v_max_bookings AND COALESCE(v_sub_active, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_onboarding(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_limits(uuid) TO authenticated;
