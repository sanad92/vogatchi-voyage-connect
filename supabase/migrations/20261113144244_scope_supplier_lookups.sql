-- Keep the existing lookup contracts while applying the caller's table RLS.
ALTER FUNCTION public.find_supplier_rate(uuid, uuid, text, date, text) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.find_supplier_rate(uuid, uuid, text, date, text),
  public.get_supplier_performance(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_supplier_rate(uuid, uuid, text, date, text),
  public.get_supplier_performance(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_supplier_performance(_org_id uuid, _supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_total_bookings integer;
  v_total_cost numeric;
  v_total_paid numeric;
  v_avg_rating numeric;
  v_active_allotments integer;
  v_allotment_utilization numeric;
BEGIN
  IF auth.uid() IS NULL
    OR NOT (
      coalesce(public.user_belongs_to_org(auth.uid(), _org_id), false)
      OR coalesce(public.is_platform_admin(auth.uid()), false)
    ) THEN
    RAISE EXCEPTION 'supplier_performance_permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT count(*), coalesce(sum(coalesce(cost_per_night, 0) * coalesce(number_of_nights, 0)), 0)
    INTO v_total_bookings, v_total_cost
  FROM public.hotel_bookings WHERE organization_id = _org_id AND supplier_id = _supplier_id;

  SELECT coalesce(sum(amount), 0) INTO v_total_paid
  FROM public.supplier_payments WHERE organization_id = _org_id AND supplier_id = _supplier_id;

  SELECT coalesce(avg(overall_rating), 0) INTO v_avg_rating
  FROM public.supplier_ratings WHERE organization_id = _org_id AND supplier_id = _supplier_id;

  SELECT count(*),
    coalesce(avg(CASE WHEN total_quantity > 0 THEN used_quantity::numeric / total_quantity * 100 ELSE 0 END), 0)
    INTO v_active_allotments, v_allotment_utilization
  FROM public.supplier_allotments
  WHERE organization_id = _org_id AND supplier_id = _supplier_id AND status = 'active';

  RETURN jsonb_build_object(
    'total_bookings', v_total_bookings,
    'total_cost', v_total_cost,
    'total_paid', v_total_paid,
    'outstanding_balance', v_total_cost - v_total_paid,
    'average_rating', v_avg_rating,
    'active_allotments', v_active_allotments,
    'allotment_utilization_pct', v_allotment_utilization
  );
END;
$$;
