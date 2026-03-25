
CREATE OR REPLACE FUNCTION public.enforce_user_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max integer;
  v_current integer;
BEGIN
  -- Get plan limit (include trialing status)
  SELECT pl.max_users INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans pl ON pl.id = s.plan_id
  WHERE s.organization_id = NEW.organization_id
    AND s.status IN ('active', 'trialing')
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
$function$;
