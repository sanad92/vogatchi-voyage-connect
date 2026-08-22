-- Paid-only launch catalog. The 14-day trial remains a subscription status,
-- not a permanently free plan.
UPDATE public.subscription_plans
SET
  is_active = false,
  updated_at = now()
WHERE name = 'Free';

UPDATE public.subscription_plans
SET
  name_ar = 'الانطلاق',
  price_monthly = 2490,
  price_yearly = 24900,
  max_users = 5,
  max_bookings_per_month = 300,
  max_storage_mb = 5120,
  duration_days = 30,
  is_active = true,
  features = '["basic_crm", "sop_workflow", "quotes", "hotel_bookings", "flight_bookings", "car_rentals", "transport", "suppliers", "invoices", "documents", "reports"]'::jsonb,
  updated_at = now()
WHERE name = 'Basic';

UPDATE public.subscription_plans
SET
  name_ar = 'النمو',
  price_monthly = 4990,
  price_yearly = 49900,
  max_users = 15,
  max_bookings_per_month = 1500,
  max_storage_mb = 25600,
  duration_days = 30,
  is_active = true,
  features = '["basic_crm", "sop_workflow", "quotes", "hotel_bookings", "flight_bookings", "car_rentals", "transport", "suppliers", "invoices", "documents", "reports", "finance", "advanced_reports", "whatsapp", "automation", "marketing", "ai_assistant", "audit_log", "multi_branch", "commissions", "priority_support"]'::jsonb,
  updated_at = now()
WHERE name = 'Pro';

UPDATE public.subscription_plans
SET
  name_ar = 'الأعمال',
  price_monthly = 9990,
  price_yearly = 99900,
  max_users = 50,
  max_bookings_per_month = 5000,
  max_storage_mb = 102400,
  duration_days = 30,
  is_active = true,
  features = '["all_features"]'::jsonb,
  updated_at = now()
WHERE name = 'Enterprise';

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_active_paid_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_active_paid_check
  CHECK (NOT is_active OR (price_monthly > 0 AND price_yearly > 0));

-- Return the plan feature set with the existing subscription enforcement RPC.
-- The frontend uses it to hide and block modules that are outside the plan.
CREATE OR REPLACE FUNCTION public.check_subscription_limits(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

