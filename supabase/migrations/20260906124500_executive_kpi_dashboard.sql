-- Authoritative executive KPI dashboard built from the booking profitability cockpit.
CREATE OR REPLACE FUNCTION public.get_executive_kpi_dashboard(
  _org_id uuid,
  _start_date date,
  _end_date date,
  _currency text DEFAULT 'EGP'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_currency text := upper(coalesce(nullif(_currency, ''), 'EGP'));
  v_days integer;
  v_previous_start date;
  v_previous_end date;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF _org_id IS NULL OR NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized to read executive financial KPIs' USING ERRCODE = '42501';
  END IF;
  IF _start_date IS NULL OR _end_date IS NULL OR _start_date > _end_date THEN
    RAISE EXCEPTION 'Invalid KPI date range' USING ERRCODE = '22007';
  END IF;

  v_days := (_end_date - _start_date) + 1;
  v_previous_end := _start_date - 1;
  v_previous_start := v_previous_end - (v_days - 1);

  WITH candidates AS MATERIALIZED (
    SELECT b.*
    FROM public.bookings b
    WHERE b.organization_id = _org_id
      AND b.start_date BETWEEN v_previous_start AND _end_date
      AND upper(coalesce(nullif(b.currency, ''), 'EGP')) = v_currency
  ),
  metrics AS MATERIALIZED (
    SELECT
      b.id,
      b.booking_number,
      b.booking_type,
      b.status,
      b.start_date,
      b.customer_id,
      coalesce(nullif(b.customer_name, ''), 'غير محدد') AS customer_name,
      b.supplier_id,
      coalesce(nullif(b.supplier_name, ''), 'غير محدد') AS supplier_name,
      b.employee_id,
      coalesce(nullif(e.full_name, ''), 'غير محدد') AS employee_name,
      cockpit->'summary' AS summary,
      cockpit->'settlement' AS settlement,
      cockpit->'warnings' AS warnings
    FROM candidates b
    LEFT JOIN public.employees e ON e.id = b.employee_id AND e.organization_id = b.organization_id
    CROSS JOIN LATERAL public.get_booking_profit_cockpit(b.id) cockpit
    WHERE lower(coalesce(b.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'draft')
  ),
  current_metrics AS MATERIALIZED (
    SELECT * FROM metrics
    WHERE start_date BETWEEN _start_date AND _end_date
      AND lower(coalesce(status, '')) IN ('confirmed', 'completed', 'paid')
  ),
  previous_metrics AS MATERIALIZED (
    SELECT * FROM metrics
    WHERE start_date BETWEEN v_previous_start AND v_previous_end
      AND lower(coalesce(status, '')) IN ('confirmed', 'completed', 'paid')
  ),
  current_totals AS (
    SELECT
      count(*)::integer AS booking_count,
      coalesce(sum((summary->>'selling')::numeric), 0) AS selling,
      coalesce(sum((summary->>'supplier_cost')::numeric), 0) AS supplier_cost,
      coalesce(sum((summary->>'gross_profit')::numeric), 0) AS gross_profit,
      coalesce(sum((summary->>'direct_expenses')::numeric), 0) AS direct_expenses,
      coalesce(sum((summary->>'commissions')::numeric), 0) AS commissions,
      coalesce(sum((summary->>'net_contribution')::numeric), 0) AS net_contribution,
      coalesce(sum((summary->>'customer_invoiced')::numeric), 0) AS customer_invoiced,
      coalesce(sum((summary->>'customer_collected')::numeric), 0) AS customer_collected,
      coalesce(sum((summary->>'customer_remaining')::numeric), 0) AS customer_remaining,
      coalesce(sum((summary->>'supplier_invoiced')::numeric), 0) AS supplier_invoiced,
      coalesce(sum((summary->>'supplier_paid')::numeric), 0) AS supplier_paid,
      coalesce(sum((summary->>'supplier_remaining')::numeric), 0) AS supplier_remaining,
      count(*) FILTER (WHERE (settlement->>'financially_complete')::boolean)::integer AS complete_count,
      count(*) FILTER (WHERE NOT (settlement->>'financially_complete')::boolean)::integer AS open_count,
      count(*) FILTER (WHERE (summary->>'net_contribution')::numeric < 0)::integer AS loss_count
    FROM current_metrics
  ),
  previous_totals AS (
    SELECT
      count(*)::integer AS booking_count,
      coalesce(sum((summary->>'selling')::numeric), 0) AS selling,
      coalesce(sum((summary->>'net_contribution')::numeric), 0) AS net_contribution
    FROM previous_metrics
  ),
  status_counts AS (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE lower(coalesce(status, '')) = 'pending')::integer AS pending,
      count(*) FILTER (WHERE lower(coalesce(status, '')) IN ('confirmed', 'completed', 'paid'))::integer AS confirmed,
      count(*) FILTER (WHERE lower(coalesce(status, '')) IN ('cancelled', 'canceled', 'void'))::integer AS cancelled
    FROM candidates
    WHERE start_date BETWEEN _start_date AND _end_date
  )
  SELECT jsonb_build_object(
    'filters', jsonb_build_object(
      'organization_id', _org_id, 'start_date', _start_date, 'end_date', _end_date,
      'currency', v_currency, 'previous_start_date', v_previous_start, 'previous_end_date', v_previous_end
    ),
    'summary', jsonb_build_object(
      'bookings_count', ct.booking_count, 'period_bookings_count', sc.total,
      'pending_count', sc.pending, 'confirmed_count', sc.confirmed, 'cancelled_count', sc.cancelled,
      'selling', ct.selling, 'supplier_cost', ct.supplier_cost, 'gross_profit', ct.gross_profit,
      'gross_margin_pct', CASE WHEN ct.selling <> 0 THEN round(ct.gross_profit / ct.selling * 100, 2) ELSE 0 END,
      'direct_expenses', ct.direct_expenses, 'commissions', ct.commissions,
      'net_contribution', ct.net_contribution,
      'net_margin_pct', CASE WHEN ct.selling <> 0 THEN round(ct.net_contribution / ct.selling * 100, 2) ELSE 0 END,
      'customer_invoiced', ct.customer_invoiced, 'customer_collected', ct.customer_collected,
      'customer_remaining', ct.customer_remaining, 'supplier_invoiced', ct.supplier_invoiced,
      'supplier_paid', ct.supplier_paid, 'supplier_remaining', ct.supplier_remaining,
      'financially_complete_count', ct.complete_count, 'financially_open_count', ct.open_count,
      'loss_bookings_count', ct.loss_count,
      'financial_completion_pct', CASE WHEN ct.booking_count > 0 THEN round(ct.complete_count::numeric / ct.booking_count * 100, 2) ELSE 0 END
    ),
    'comparison', jsonb_build_object(
      'previous_bookings_count', pt.booking_count, 'previous_selling', pt.selling,
      'previous_net_contribution', pt.net_contribution,
      'selling_change_pct', CASE WHEN pt.selling <> 0 THEN round((ct.selling - pt.selling) / abs(pt.selling) * 100, 2) ELSE NULL END,
      'net_change_pct', CASE WHEN pt.net_contribution <> 0 THEN round((ct.net_contribution - pt.net_contribution) / abs(pt.net_contribution) * 100, 2) ELSE NULL END
    ),
    'monthly', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'month', x.month, 'bookings_count', x.booking_count, 'selling', x.selling,
        'gross_profit', x.gross_profit, 'net_contribution', x.net_contribution
      ) ORDER BY x.month)
      FROM (
        SELECT date_trunc('month', start_date)::date AS month, count(*)::integer AS booking_count,
          sum((summary->>'selling')::numeric) AS selling,
          sum((summary->>'gross_profit')::numeric) AS gross_profit,
          sum((summary->>'net_contribution')::numeric) AS net_contribution
        FROM current_metrics GROUP BY date_trunc('month', start_date)
      ) x
    ), '[]'::jsonb),
    'by_type', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC)
      FROM (
        SELECT coalesce(booking_type, 'other') AS id, coalesce(booking_type, 'other') AS name,
          count(*)::integer AS booking_count,
          sum((summary->>'selling')::numeric) AS selling,
          sum((summary->>'supplier_cost')::numeric) AS supplier_cost,
          sum((summary->>'net_contribution')::numeric) AS net_contribution,
          CASE WHEN sum((summary->>'selling')::numeric) <> 0 THEN round(sum((summary->>'net_contribution')::numeric) / sum((summary->>'selling')::numeric) * 100, 2) ELSE 0 END AS margin_pct
        FROM current_metrics GROUP BY booking_type
      ) x
    ), '[]'::jsonb),
    'by_employee', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC)
      FROM (
        SELECT employee_id AS id, employee_name AS name, count(*)::integer AS booking_count,
          sum((summary->>'selling')::numeric) AS selling,
          sum((summary->>'net_contribution')::numeric) AS net_contribution,
          CASE WHEN sum((summary->>'selling')::numeric) <> 0 THEN round(sum((summary->>'net_contribution')::numeric) / sum((summary->>'selling')::numeric) * 100, 2) ELSE 0 END AS margin_pct
        FROM current_metrics GROUP BY employee_id, employee_name ORDER BY net_contribution DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'by_customer', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC)
      FROM (
        SELECT customer_id AS id, customer_name AS name, count(*)::integer AS booking_count,
          sum((summary->>'selling')::numeric) AS selling,
          sum((summary->>'net_contribution')::numeric) AS net_contribution,
          CASE WHEN sum((summary->>'selling')::numeric) <> 0 THEN round(sum((summary->>'net_contribution')::numeric) / sum((summary->>'selling')::numeric) * 100, 2) ELSE 0 END AS margin_pct
        FROM current_metrics GROUP BY customer_id, customer_name ORDER BY net_contribution DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'by_supplier', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC)
      FROM (
        SELECT supplier_id AS id, supplier_name AS name, count(*)::integer AS booking_count,
          sum((summary->>'selling')::numeric) AS selling,
          sum((summary->>'supplier_cost')::numeric) AS supplier_cost,
          sum((summary->>'net_contribution')::numeric) AS net_contribution,
          CASE WHEN sum((summary->>'selling')::numeric) <> 0 THEN round(sum((summary->>'net_contribution')::numeric) / sum((summary->>'selling')::numeric) * 100, 2) ELSE 0 END AS margin_pct
        FROM current_metrics GROUP BY supplier_id, supplier_name ORDER BY net_contribution DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'attention_bookings', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.risk_score DESC, x.start_date DESC)
      FROM (
        SELECT id, booking_number, booking_type, customer_name, supplier_name, start_date,
          (summary->>'selling')::numeric AS selling,
          (summary->>'net_contribution')::numeric AS net_contribution,
          (summary->>'customer_remaining')::numeric AS customer_remaining,
          (summary->>'supplier_remaining')::numeric AS supplier_remaining,
          (settlement->>'financially_complete')::boolean AS financially_complete,
          warnings,
          ((CASE WHEN (summary->>'customer_remaining')::numeric > .01 THEN 4 ELSE 0 END) +
           (CASE WHEN (summary->>'supplier_remaining')::numeric > .01 THEN 3 ELSE 0 END) +
           (CASE WHEN (summary->>'net_contribution')::numeric < 0 THEN 2 ELSE 0 END) +
           jsonb_array_length(warnings))::integer AS risk_score
        FROM current_metrics
        WHERE NOT (settlement->>'financially_complete')::boolean
           OR (summary->>'net_contribution')::numeric < 0
           OR jsonb_array_length(warnings) > 0
        ORDER BY risk_score DESC, start_date DESC LIMIT 30
      ) x
    ), '[]'::jsonb)
  ) INTO v_result
  FROM current_totals ct CROSS JOIN previous_totals pt CROSS JOIN status_counts sc;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_executive_kpi_dashboard(uuid, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_executive_kpi_dashboard(uuid, date, date, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_executive_kpi_dashboard(uuid, date, date, text) IS
  'Executive booking-cohort KPIs using the authorized booking profitability cockpit, with period comparison and drilldowns.';
