CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.organization_subscription_selections (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  selected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.organization_subscription_selections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.organization_subscription_selections FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_organization_for_subscription(
  _name text, _owner_name text, _owner_phone text, _phone text, _email text,
  _plan_id uuid, _billing_cycle text, _address text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  chosen_name text;
  new_organization_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولًا.' USING ERRCODE = '42501';
  END IF;

  IF _billing_cycle IS NULL OR _billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'اختر دورة فوترة صالحة من صفحة الأسعار.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(nullif(btrim(p.name_ar), ''), p.name) INTO chosen_name
    FROM public.subscription_plans p
    WHERE p.id = _plan_id AND p.is_active AND p.price_monthly > 0
      AND (_billing_cycle <> 'yearly' OR p.price_yearly > 0)
      AND lower(btrim(p.name)) NOT IN ('custom', 'customised', 'customized')
      AND coalesce(btrim(p.name_ar), '') NOT IN ('مخصص', 'مخصصة', 'باقة مخصصة', 'خطة مخصصة')
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الباقة أو دورة الفوترة غير متاحة حاليًا. اختَر باقة من صفحة الأسعار.' USING ERRCODE = '22023';
  END IF;

  -- Let the original onboarding routine enforce confirmed work email,
  -- eligibility, owner membership and the standard trial setup.
  new_organization_id := public.create_organization_onboarding(
    _name, _owner_name, _owner_phone, _phone, _email, NULL, _address
  );
  INSERT INTO private.organization_subscription_selections (organization_id, plan_id, plan_name, billing_cycle)
    VALUES (new_organization_id, _plan_id, chosen_name, _billing_cycle);
  RETURN new_organization_id;
END;
$$;

CREATE FUNCTION public.list_organization_subscription_selections(_organization_ids uuid[])
RETURNS TABLE (organization_id uuid, plan_name text, billing_cycle text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    coalesce(public.has_platform_role(auth.uid(), 'platform_owner'), false)
    OR coalesce(public.has_platform_role(auth.uid(), 'platform_admin'), false)
  ) THEN
    RAISE EXCEPTION 'صلاحية إدارة المنصة مطلوبة.' USING ERRCODE = '42501';
  END IF;
  IF coalesce(array_length(_organization_ids, 1), 0) > 100 THEN
    RAISE EXCEPTION 'Too many organization ids.' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT s.organization_id, s.plan_name, s.billing_cycle
    FROM private.organization_subscription_selections s
    WHERE s.organization_id = ANY (_organization_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_for_subscription(text,text,text,text,text,uuid,text,text),
  public.list_organization_subscription_selections(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_for_subscription(text,text,text,text,text,uuid,text,text),
  public.list_organization_subscription_selections(uuid[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
