-- New organizations get exactly seven days of trial access.
CREATE OR REPLACE FUNCTION public.auto_assign_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id
  INTO v_plan_id
  FROM public.subscription_plans
  WHERE name = 'Pro' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id
    INTO v_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
      AND price_monthly > 0
    ORDER BY price_monthly DESC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'لا توجد خطة مدفوعة نشطة لبدء الفترة التجريبية';
  END IF;

  INSERT INTO public.subscriptions (
    organization_id, plan_id, status, starts_at, expires_at, grace_period_days, notes
  ) VALUES (
    NEW.id,
    v_plan_id,
    'trialing',
    now(),
    now() + interval '168 hours',
    0,
    'فترة تجريبية لمدة 7 أيام على خطة مدفوعة'
  );

  RETURN NEW;
END;
$function$;

-- Paid activations can reuse the trial row, which carries zero trial grace.
CREATE OR REPLACE FUNCTION public.restore_paid_subscription_grace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.grace_period_days := 2;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_paid_subscription_grace ON public.subscriptions;
CREATE TRIGGER trg_restore_paid_subscription_grace
BEFORE UPDATE OF status ON public.subscriptions
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM 'active'
  AND NEW.status = 'active'
  AND OLD.grace_period_days = 0
  AND NEW.grace_period_days = 0
  AND OLD.notes = 'فترة تجريبية لمدة 7 أيام على خطة مدفوعة'
)
EXECUTE FUNCTION public.restore_paid_subscription_grace();

REVOKE EXECUTE ON FUNCTION public.restore_paid_subscription_grace() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_subscription_limits(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_users integer;
  v_max_bookings integer;
  v_max_storage integer;
  v_plan_name text;
  v_plan_name_ar text;
  v_features jsonb;
  v_member_count integer;
  v_booking_count integer;
  v_sub_active boolean;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_status text;
  v_is_trialing boolean;
  v_trial_days_remaining integer;
  v_in_grace boolean;
  v_fully_expired boolean;
  v_grace_period_days integer;
BEGIN
  SELECT
    s.status IN ('active', 'trialing') AND (
      s.expires_at IS NULL
      OR s.expires_at + (COALESCE(s.grace_period_days, 2) || ' days')::interval > now()
    ),
    s.starts_at,
    s.expires_at,
    s.status,
    COALESCE(s.grace_period_days, 2),
    sp.max_users,
    sp.max_bookings_per_month,
    sp.max_storage_mb,
    sp.name,
    sp.name_ar,
    COALESCE(sp.features, '[]'::jsonb)
  INTO
    v_sub_active,
    v_starts_at,
    v_expires_at,
    v_status,
    v_grace_period_days,
    v_max_users,
    v_max_bookings,
    v_max_storage,
    v_plan_name,
    v_plan_name_ar,
    v_features
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
      'features', '[]'::jsonb,
      'error', 'لا يوجد اشتراك لهذه المؤسسة'
    );
  END IF;

  v_is_trialing := v_status = 'trialing';
  v_in_grace := v_expires_at IS NOT NULL
    AND v_expires_at < now()
    AND v_expires_at + (v_grace_period_days || ' days')::interval > now();
  v_fully_expired := v_expires_at IS NOT NULL
    AND v_expires_at + (v_grace_period_days || ' days')::interval <= now();

  IF v_is_trialing AND v_expires_at IS NOT NULL THEN
    v_trial_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM v_expires_at - now()) / 86400)::integer);
  ELSE
    v_trial_days_remaining := NULL;
  END IF;

  v_member_count := public.count_org_members(_org_id);
  v_booking_count := public.count_org_bookings_this_month(_org_id);

  RETURN jsonb_build_object(
    'active', COALESCE(v_sub_active, false),
    'expired', COALESCE(v_fully_expired, true),
    'starts_at', v_starts_at,
    'expires_at', v_expires_at,
    'status', v_status,
    'is_trialing', v_is_trialing,
    'trial_days_remaining', v_trial_days_remaining,
    'in_grace_period', COALESCE(v_in_grace, false),
    'grace_period_days', v_grace_period_days,
    'plan_name', v_plan_name,
    'plan_name_ar', v_plan_name_ar,
    'features', v_features,
    'limits', jsonb_build_object(
      'max_users', v_max_users,
      'max_bookings', v_max_bookings,
      'max_storage_mb', v_max_storage
    ),
    'usage', jsonb_build_object(
      'users', v_member_count,
      'bookings_this_month', v_booking_count
    ),
    'can_add_user', v_member_count < v_max_users AND COALESCE(v_sub_active, false),
    'can_add_booking', v_booking_count < v_max_bookings AND COALESCE(v_sub_active, false)
  );
END;
$function$;
