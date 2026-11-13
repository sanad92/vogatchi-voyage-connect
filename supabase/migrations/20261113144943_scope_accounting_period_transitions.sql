CREATE OR REPLACE FUNCTION public.close_accounting_period(_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  period public.accounting_periods%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'غير مصرح بإقفال الفترات' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO period FROM public.accounting_periods WHERE id = _period_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفترة غير موجودة');
  END IF;
  IF NOT coalesce(public.is_platform_admin(actor), false)
    AND coalesce(public.get_user_org_role(actor, period.organization_id)::text, '') NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإقفال الفترات' USING ERRCODE = '42501';
  END IF;
  IF period.status = 'open' THEN
    UPDATE public.accounting_periods
    SET status = 'closed', closed_by = actor, closed_at = now(), updated_at = now()
    WHERE id = _period_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_accounting_period(_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  period public.accounting_periods%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'فقط المالك يمكنه إعادة فتح الفترات' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO period FROM public.accounting_periods WHERE id = _period_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفترة غير موجودة');
  END IF;
  IF NOT coalesce(public.is_platform_admin(actor), false)
    AND coalesce(public.get_user_org_role(actor, period.organization_id)::text, '') <> 'owner' THEN
    RAISE EXCEPTION 'فقط المالك يمكنه إعادة فتح الفترات' USING ERRCODE = '42501';
  END IF;
  IF period.status = 'locked' THEN
    RAISE EXCEPTION 'الفترة مقفلة نهائياً ولا يمكن فتحها';
  END IF;
  IF period.status = 'closed' THEN
    UPDATE public.accounting_periods
    SET status = 'open', closed_by = NULL, closed_at = NULL, updated_at = now()
    WHERE id = _period_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.close_accounting_period(uuid), public.reopen_accounting_period(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(uuid), public.reopen_accounting_period(uuid)
TO authenticated;
