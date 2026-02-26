
-- Add max_storage_mb to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_storage_mb integer NOT NULL DEFAULT 500;

-- ============================================================
-- 1. Check if subscription is active and not expired
-- ============================================================
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
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  )
$$;

-- ============================================================
-- 2. Get org's plan limits
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_org_plan_limits(_org_id uuid)
RETURNS TABLE(max_users integer, max_bookings_per_month integer, max_storage_mb integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.max_users, sp.max_bookings_per_month, sp.max_storage_mb
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = _org_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1
$$;

-- ============================================================
-- 3. Count current org members
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_org_members(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.organization_members
  WHERE organization_id = _org_id AND is_active = true
$$;

-- ============================================================
-- 4. Count org bookings this month (across all 4 booking tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_org_bookings_this_month(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    (SELECT COUNT(*) FROM public.hotel_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.flight_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.car_rentals WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.transport_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
  )::integer, 0)
$$;

-- ============================================================
-- 5. Enforce user limit on organization_members INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  -- Get plan limit
  SELECT pl.max_users INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans pl ON pl.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no active subscription, block
  IF v_max IS NULL THEN
    RAISE EXCEPTION 'لا يوجد اشتراك نشط لهذه المؤسسة. يرجى تفعيل اشتراك أولاً.';
  END IF;

  -- Count current members
  SELECT COUNT(*)::integer INTO v_current
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id AND is_active = true;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'تم الوصول للحد الأقصى من المستخدمين (%). يرجى ترقية الخطة.', v_max;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit ON public.organization_members;
CREATE TRIGGER trg_enforce_user_limit
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_limit();

-- ============================================================
-- 6. Enforce booking limit trigger function (reusable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_current integer;
  v_sub_active boolean;
BEGIN
  -- Check active subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.organization_id = NEW.organization_id
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) INTO v_sub_active;

  IF NOT v_sub_active THEN
    RAISE EXCEPTION 'الاشتراك منتهٍ أو غير نشط. لا يمكن إضافة حجوزات جديدة.';
  END IF;

  -- Get booking limit
  SELECT sp.max_bookings_per_month INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Count this month's bookings across all types
  SELECT public.count_org_bookings_this_month(NEW.organization_id) INTO v_current;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'تم الوصول للحد الأقصى من الحجوزات الشهرية (%). يرجى ترقية الخطة.', v_max;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply booking limit triggers to all 4 booking tables
DROP TRIGGER IF EXISTS trg_enforce_booking_limit ON public.hotel_bookings;
CREATE TRIGGER trg_enforce_booking_limit
  BEFORE INSERT ON public.hotel_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_limit();

DROP TRIGGER IF EXISTS trg_enforce_booking_limit ON public.flight_bookings;
CREATE TRIGGER trg_enforce_booking_limit
  BEFORE INSERT ON public.flight_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_limit();

DROP TRIGGER IF EXISTS trg_enforce_booking_limit ON public.car_rentals;
CREATE TRIGGER trg_enforce_booking_limit
  BEFORE INSERT ON public.car_rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_limit();

DROP TRIGGER IF EXISTS trg_enforce_booking_limit ON public.transport_bookings;
CREATE TRIGGER trg_enforce_booking_limit
  BEFORE INSERT ON public.transport_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_limit();

-- ============================================================
-- 7. Full subscription check RPC (for frontend pre-check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_subscription_limits(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_member_count integer;
  v_booking_count integer;
  v_sub_active boolean;
  v_expires_at timestamptz;
BEGIN
  -- Check subscription
  SELECT 
    s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now()),
    s.expires_at,
    sp.max_users,
    sp.max_bookings_per_month,
    sp.max_storage_mb,
    sp.name,
    sp.name_ar
  INTO 
    v_sub_active,
    v_expires_at,
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
      'error', 'لا يوجد اشتراك لهذه المؤسسة'
    );
  END IF;

  v_member_count := public.count_org_members(_org_id);
  v_booking_count := public.count_org_bookings_this_month(_org_id);

  RETURN jsonb_build_object(
    'active', COALESCE(v_sub_active, false),
    'expired', NOT COALESCE(v_sub_active, false),
    'expires_at', v_expires_at,
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
