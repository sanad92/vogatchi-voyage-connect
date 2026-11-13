CREATE FUNCTION public.unified_booking_list_summary(
  _org uuid, _type text, _status text, _search text, _start_date date, _end_date date
) RETURNS TABLE(currency text, confirmed bigint, pending bigint, profit numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT CASE WHEN access.finance THEN coalesce(nullif(b.currency, ''), '—') END,
    count(*) FILTER (WHERE b.status = 'confirmed'),
    count(*) FILTER (WHERE b.status = 'pending'),
    CASE WHEN access.finance THEN coalesce(sum(b.profit), 0) END
  FROM public.bookings b
  CROSS JOIN (SELECT coalesce(public.has_org_permission(_org, 'financial_view'), false) AS finance) access
  WHERE b.organization_id = _org
    AND (SELECT public.has_org_permission(_org, 'bookings_view'))
    AND (_type IS NULL OR b.booking_type::text = _type)
    AND (_status IS NULL OR b.status::text = _status)
    AND (_start_date IS NULL OR b.start_date >= _start_date)
    AND (_end_date IS NULL OR b.start_date <= _end_date)
    AND (_search IS NULL OR b.customer_name ILIKE '%' || _search || '%'
      OR b.booking_number ILIKE '%' || _search || '%'
      OR b.supplier_name ILIKE '%' || _search || '%')
  GROUP BY 1, access.finance
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.unified_booking_list_summary(uuid,text,text,text,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unified_booking_list_summary(uuid,text,text,text,date,date) TO authenticated;
