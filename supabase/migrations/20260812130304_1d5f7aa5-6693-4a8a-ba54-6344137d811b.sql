CREATE OR REPLACE FUNCTION public.sop_can_manage_pricing(_org uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sop_has_department(_org, _user, 'reservations'::public.sop_department)
      OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.user_id = _user
          AND m.organization_id = _org
          AND m.role IN ('owner','admin','manager')
      );
$$;

REVOKE ALL ON FUNCTION public.sop_can_manage_pricing(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sop_can_manage_pricing(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sop_guard_pricing_option()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.sop_can_manage_pricing(NEW.organization_id, auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'SOP: قسم الحجوزات أو الإدارة فقط يمكنهم إضافة عروض تسعير';
  END IF;
  IF NEW.net_cost IS DISTINCT FROM OLD.net_cost
     OR NEW.selling_price IS DISTINCT FROM OLD.selling_price
     OR NEW.markup_value IS DISTINCT FROM OLD.markup_value
     OR NEW.markup_type IS DISTINCT FROM OLD.markup_type
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.transfer_net_cost IS DISTINCT FROM OLD.transfer_net_cost
     OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     OR NEW.cancellation_policy IS DISTINCT FROM OLD.cancellation_policy THEN
    RAISE EXCEPTION 'SOP: قسم الحجوزات أو الإدارة فقط يمكنهم تعديل الأسعار وسياسات الإلغاء';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sop_enforce_option_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = NEW.pricing_request_id;
    IF n >= 3 THEN
      RAISE EXCEPTION 'الحد الأقصى 3 عروض لكل طلب تسعير — احذف عرضاً قبل إضافة عرض جديد';
    END IF;
  END IF;

  IF NEW.is_recommended AND pg_trigger_depth() = 1 THEN
    UPDATE public.sop_pricing_options
       SET is_recommended = false
     WHERE pricing_request_id = NEW.pricing_request_id
       AND id <> NEW.id
       AND is_recommended;
  END IF;
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS sop_options_delete ON public.sop_pricing_options;
CREATE POLICY sop_options_delete ON public.sop_pricing_options
FOR DELETE TO authenticated
USING (
  public.sop_can_manage_pricing(organization_id, auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.sop_pricing_requests r
    WHERE r.id = sop_pricing_options.pricing_request_id
      AND r.status IN ('quoted','closed')
  )
);