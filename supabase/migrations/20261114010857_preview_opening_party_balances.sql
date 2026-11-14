CREATE FUNCTION public.preview_opening_party_balances(_org uuid, _as_of date, _rows jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  invalid_row bigint;
  duplicate_row bigint;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.can_org_write(_org), false)
    OR coalesce(public.get_user_org_role(auth.uid(), _org)::text, '') NOT IN ('owner', 'admin', 'manager')
    OR NOT coalesce(public.has_org_permission(_org, 'financial_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'admin_settings'), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لمراجعة الأرصدة الافتتاحية لهذه المؤسسة.' USING ERRCODE = '42501';
  END IF;
  IF _as_of IS NULL OR NOT isfinite(_as_of) OR _as_of < DATE '2000-01-01' OR _as_of > current_date
    OR jsonb_typeof(_rows) IS DISTINCT FROM 'array' OR octet_length(_rows::text) > 100000 THEN
    RAISE EXCEPTION 'راجع تاريخ القطع ومحتوى ملف الأرصدة.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_rows) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'أضف من 1 إلى 100 رصيد في كل ملف.' USING ERRCODE = '22023';
  END IF;
  SELECT n INTO invalid_row
  FROM jsonb_array_elements(_rows) WITH ORDINALITY AS r(row, n)
  WHERE jsonb_typeof(row) <> 'object'
     OR coalesce(row->>'party_type', '') NOT IN ('customer', 'supplier')
     OR coalesce(row->>'party_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR coalesce(row->>'currency', '') NOT IN ('EGP', 'SAR', 'USD', 'EUR', 'AED', 'GBP')
     OR coalesce(row->>'legacy_balance', '') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
  ORDER BY n LIMIT 1;
  IF invalid_row IS NOT NULL THEN
    RAISE EXCEPTION 'السجل %: راجع نوع الطرف والمعرّف والعملة والرصيد.', invalid_row USING ERRCODE = '22023';
  END IF;
  SELECT min(n) INTO duplicate_row
  FROM jsonb_array_elements(_rows) WITH ORDINALITY AS r(row, n)
  GROUP BY row->>'party_type', (row->>'party_id')::uuid, row->>'currency'
  HAVING count(*) > 1 ORDER BY min(n) LIMIT 1;
  IF duplicate_row IS NOT NULL THEN
    RAISE EXCEPTION 'السجل %: يوجد أكثر من رصيد لنفس الطرف والعملة.', duplicate_row USING ERRCODE = '22023';
  END IF;

  WITH requested AS MATERIALIZED (
    SELECT n, row->>'party_type' AS party_type, (row->>'party_id')::uuid AS party_id,
      row->>'currency' AS currency, (row->>'legacy_balance')::numeric AS legacy_balance
    FROM jsonb_array_elements(_rows) WITH ORDINALITY AS r(row, n)
  ), parties AS (
    SELECT r.*, coalesce(c.name, s.name) AS party_name
    FROM requested r
    LEFT JOIN public.customers c ON r.party_type = 'customer' AND c.organization_id = _org AND c.id = r.party_id
    LEFT JOIN public.suppliers s ON r.party_type = 'supplier' AND s.organization_id = _org AND s.id = r.party_id
  ), requested_currencies AS (
    SELECT DISTINCT currency FROM requested
  ), outstanding AS (
    SELECT c.currency, 'customer'::text AS party_type, d.customer_id AS party_id,
      sum(d.outstanding_amount) AS recorded_balance, count(*) AS invoices,
      bool_or(d.is_historical_estimate) AS historical_estimate
    FROM requested_currencies c
    CROSS JOIN LATERAL public.get_customer_aging_details_v2(_org, _as_of, c.currency, NULL) d
    GROUP BY c.currency, d.customer_id
    UNION ALL
    SELECT c.currency, 'supplier', d.supplier_id, sum(d.outstanding_amount),
      count(*), bool_or(d.is_historical_estimate)
    FROM requested_currencies c
    CROSS JOIN LATERAL public.get_supplier_aging_details_v2(_org, _as_of, c.currency, NULL) d
    GROUP BY c.currency, d.supplier_id
  ), controls AS (
    SELECT c.currency, t.entity_type, t.aging_total, t.control_balance, t.difference,
      t.historical_estimate_count, t.corrected_date_count
    FROM requested_currencies c
    CROSS JOIN LATERAL public.get_aging_control_totals_v2(_org, _as_of, c.currency) t
  )
  SELECT jsonb_build_object(
    'rows', (SELECT jsonb_agg(jsonb_build_object(
      'party_type', p.party_type, 'party_id', p.party_id, 'party_name', p.party_name, 'currency', p.currency,
      'legacy_balance', p.legacy_balance,
      'recorded_balance', CASE WHEN p.party_name IS NOT NULL THEN coalesce(o.recorded_balance, 0) END,
      'difference', CASE WHEN p.party_name IS NOT NULL THEN p.legacy_balance - coalesce(o.recorded_balance, 0) END,
      'open_invoices', coalesce(o.invoices, 0),
      'historical_estimate', coalesce(o.historical_estimate, false)
    ) ORDER BY p.n)
    FROM parties p LEFT JOIN outstanding o USING (party_type, party_id, currency)),
    'controls', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.currency, t.entity_type) FROM controls t)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_opening_party_balances(uuid, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_opening_party_balances(uuid, date, jsonb) TO authenticated;
