
-- 1. Fix enforce_booking_limit to include 'trialing' status
CREATE OR REPLACE FUNCTION public.enforce_booking_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max integer;
  v_current integer;
  v_sub_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.organization_id = NEW.organization_id
      AND s.status IN ('active', 'trialing')
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) INTO v_sub_active;

  IF NOT v_sub_active THEN
    RAISE EXCEPTION 'الاشتراك منتهٍ أو غير نشط. لا يمكن إضافة حجوزات جديدة.';
  END IF;

  SELECT sp.max_bookings_per_month INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT public.count_org_bookings_this_month(NEW.organization_id) INTO v_current;

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'تم الوصول للحد الأقصى من الحجوزات الشهرية (%). يرجى ترقية الخطة.', v_max;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix count to include unified bookings
CREATE OR REPLACE FUNCTION public.count_org_bookings_this_month(_org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    (SELECT COUNT(*) FROM public.hotel_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.flight_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.car_rentals WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.transport_bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
    + (SELECT COUNT(*) FROM public.bookings WHERE organization_id = _org_id AND created_at >= date_trunc('month', now()))
  )::integer, 0)
$function$;

-- 3. Performance indexes (without expenses table)
CREATE INDEX IF NOT EXISTS idx_bookings_org_created ON public.bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_org_status ON public.bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_created ON public.customers(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_org_name ON public.customers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_invoices_org_created ON public.invoices(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON public.invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_org_created ON public.hotel_bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_org_created ON public.flight_bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_rentals_org_created ON public.car_rentals(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_org_created ON public.transport_bookings(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON public.admin_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON public.subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id, is_active);
