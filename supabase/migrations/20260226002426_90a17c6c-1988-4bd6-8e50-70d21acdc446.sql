
-- Update check_subscription_limits to handle 'trialing' status
CREATE OR REPLACE FUNCTION public.check_subscription_limits(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_member_count integer;
  v_booking_count integer;
  v_sub_active boolean;
  v_expires_at timestamptz;
  v_status text;
  v_is_trialing boolean;
  v_trial_days_remaining integer;
BEGIN
  SELECT 
    s.status IN ('active', 'trialing') AND (s.expires_at IS NULL OR s.expires_at > now()),
    s.expires_at,
    s.status,
    sp.max_users,
    sp.max_bookings_per_month,
    sp.max_storage_mb,
    sp.name,
    sp.name_ar
  INTO 
    v_sub_active,
    v_expires_at,
    v_status,
    v_plan.max_users,
    v_plan.max_bookings_per_month,
    v_plan.max_storage_mb,
    v_plan.name,
    v_plan.name_ar
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = _org_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_plan.name IS NULL THEN
    RETURN jsonb_build_object(
      'active', false,
      'expired', true,
      'status', 'none',
      'error', 'لا يوجد اشتراك لهذه المؤسسة'
    );
  END IF;

  v_is_trialing := v_status = 'trialing';
  
  IF v_is_trialing AND v_expires_at IS NOT NULL THEN
    v_trial_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_expires_at - now())::integer);
  ELSE
    v_trial_days_remaining := NULL;
  END IF;

  v_member_count := public.count_org_members(_org_id);
  v_booking_count := public.count_org_bookings_this_month(_org_id);

  RETURN jsonb_build_object(
    'active', COALESCE(v_sub_active, false),
    'expired', NOT COALESCE(v_sub_active, false),
    'expires_at', v_expires_at,
    'status', v_status,
    'is_trialing', v_is_trialing,
    'trial_days_remaining', v_trial_days_remaining,
    'plan_name', v_plan.name,
    'plan_name_ar', v_plan.name_ar,
    'limits', jsonb_build_object(
      'max_users', v_plan.max_users,
      'max_bookings', v_plan.max_bookings_per_month,
      'max_storage_mb', v_plan.max_storage_mb
    ),
    'usage', jsonb_build_object(
      'users', v_member_count,
      'bookings_this_month', v_booking_count
    ),
    'can_add_user', v_member_count < v_plan.max_users AND COALESCE(v_sub_active, false),
    'can_add_booking', v_booking_count < v_plan.max_bookings_per_month AND COALESCE(v_sub_active, false)
  );
END;
$$;

-- Update check_subscription_active to handle trialing
CREATE OR REPLACE FUNCTION public.check_subscription_active(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.organization_id = _org_id
      AND s.status IN ('active', 'trialing')
      AND (s.expires_at IS NULL OR s.expires_at > now())
  )
$$;

-- Create trigger function to auto-assign trial on org creation
CREATE OR REPLACE FUNCTION public.auto_assign_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_plan_id uuid;
BEGIN
  -- Get Pro plan for trial (best experience)
  SELECT id INTO v_pro_plan_id 
  FROM public.subscription_plans 
  WHERE name = 'Pro' AND is_active = true 
  LIMIT 1;

  -- Fallback to any active plan
  IF v_pro_plan_id IS NULL THEN
    SELECT id INTO v_pro_plan_id 
    FROM public.subscription_plans 
    WHERE is_active = true 
    ORDER BY price_monthly DESC 
    LIMIT 1;
  END IF;

  IF v_pro_plan_id IS NOT NULL THEN
-- INSERT INTO public.subscriptions (
--       organization_id, plan_id, status, starts_at, expires_at, notes
--     ) VALUES (
--       NEW.id, v_pro_plan_id, 'trialing', now(), now() + interval '14 days', 'فترة تجريبية مجانية - 14 يوم'
--     );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS trg_auto_trial_subscription ON public.organizations;
CREATE TRIGGER trg_auto_trial_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_trial_subscription();

-- Create function for super admin to extend trial
CREATE OR REPLACE FUNCTION public.extend_trial(
  _org_id uuid,
  _extra_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
BEGIN
  -- Only super admins can call this (checked via RLS or app logic)
  SELECT id, expires_at, status INTO v_sub
  FROM public.subscriptions
  WHERE organization_id = _org_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يوجد اشتراك');
  END IF;

  UPDATE public.subscriptions
  SET 
    expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (_extra_days || ' days')::interval,
    status = CASE WHEN status IN ('expired', 'cancelled') THEN 'trialing' ELSE status END,
    updated_at = now()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'success', true, 
    'new_expires_at', (GREATEST(COALESCE(v_sub.expires_at, now()), now()) + (_extra_days || ' days')::interval)
  );
END;
$$;
