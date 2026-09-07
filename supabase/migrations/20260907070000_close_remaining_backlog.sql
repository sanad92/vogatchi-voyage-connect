-- Close the remaining reporting and administration backlog with authoritative,
-- organization-scoped data sources.

-- ---------------------------------------------------------------------------
-- Organization salary settings (the legacy system_settings table is global).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, setting_key),
  CONSTRAINT organization_salary_settings_key_check CHECK (setting_key IN (
    'tax_rate', 'insurance_rate', 'overtime_multiplier',
    'working_days_per_month', 'working_hours_per_day'
  )),
  CONSTRAINT organization_salary_settings_value_check CHECK (setting_value >= 0)
);

ALTER TABLE public.organization_salary_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.organization_salary_settings TO authenticated;
GRANT ALL ON public.organization_salary_settings TO service_role;

DROP POLICY IF EXISTS organization_salary_settings_read ON public.organization_salary_settings;
CREATE POLICY organization_salary_settings_read
ON public.organization_salary_settings FOR SELECT TO authenticated
USING ((SELECT public.user_belongs_to_org(auth.uid(), organization_id)));

DROP POLICY IF EXISTS organization_salary_settings_write ON public.organization_salary_settings;
CREATE POLICY organization_salary_settings_write
ON public.organization_salary_settings FOR INSERT TO authenticated
WITH CHECK ((SELECT public.sop_is_manager(organization_id, auth.uid())));

DROP POLICY IF EXISTS organization_salary_settings_update ON public.organization_salary_settings;
CREATE POLICY organization_salary_settings_update
ON public.organization_salary_settings FOR UPDATE TO authenticated
USING ((SELECT public.sop_is_manager(organization_id, auth.uid())))
WITH CHECK ((SELECT public.sop_is_manager(organization_id, auth.uid())));

DROP TRIGGER IF EXISTS trg_organization_salary_settings_updated ON public.organization_salary_settings;
CREATE TRIGGER trg_organization_salary_settings_updated
BEFORE UPDATE ON public.organization_salary_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.organization_salary_settings (organization_id, setting_key, setting_value, description)
SELECT o.id, v.setting_key, v.setting_value, v.description
FROM public.organizations o
CROSS JOIN (VALUES
  ('tax_rate', 0::numeric, 'معدل الضريبة الافتراضي (%)'),
  ('insurance_rate', 5::numeric, 'معدل التأمين الاجتماعي (%)'),
  ('overtime_multiplier', 1.5::numeric, 'مضاعف الساعات الإضافية'),
  ('working_days_per_month', 30::numeric, 'أيام العمل في الشهر'),
  ('working_hours_per_day', 8::numeric, 'ساعات العمل في اليوم')
) AS v(setting_key, setting_value, description)
ON CONFLICT (organization_id, setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_organization_salary_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
  INSERT INTO public.organization_salary_settings (organization_id, setting_key, setting_value, description)
  VALUES
    (NEW.id, 'tax_rate', 0, 'معدل الضريبة الافتراضي (%)'),
    (NEW.id, 'insurance_rate', 5, 'معدل التأمين الاجتماعي (%)'),
    (NEW.id, 'overtime_multiplier', 1.5, 'مضاعف الساعات الإضافية'),
    (NEW.id, 'working_days_per_month', 30, 'أيام العمل في الشهر'),
    (NEW.id, 'working_hours_per_day', 8, 'ساعات العمل في اليوم')
  ON CONFLICT (organization_id, setting_key) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.seed_organization_salary_settings() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_seed_organization_salary_settings ON public.organizations;
CREATE TRIGGER trg_seed_organization_salary_settings
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_organization_salary_settings();

CREATE OR REPLACE FUNCTION public.get_organization_salary_settings(_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_belongs_to_org(auth.uid(),_org_id) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.setting_key),'[]'::jsonb) INTO v_result
  FROM public.organization_salary_settings s WHERE s.organization_id=_org_id;
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_organization_salary_settings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_organization_salary_settings(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.update_organization_salary_setting(_setting_id uuid,_setting_value numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_row public.organization_salary_settings%ROWTYPE;
BEGIN
  IF _setting_value<0 THEN RAISE EXCEPTION 'Invalid salary setting value'; END IF;
  SELECT * INTO v_row FROM public.organization_salary_settings WHERE id=_setting_id FOR UPDATE;
  IF v_row.id IS NULL OR NOT public.sop_is_manager(v_row.organization_id,auth.uid()) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  UPDATE public.organization_salary_settings SET setting_value=_setting_value WHERE id=_setting_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$function$;
REVOKE ALL ON FUNCTION public.update_organization_salary_setting(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_organization_salary_setting(uuid,numeric) TO authenticated,service_role;

-- Repair only objectively impossible imported hotel dates. Valid long stays are
-- intentionally left untouched for manual review.
UPDATE public.booking_hotel_details d
SET check_in=b.start_date,
    check_out=coalesce(b.end_date,d.check_out,b.start_date),
    nights=greatest(1,coalesce(b.end_date,b.start_date)-b.start_date)
FROM public.bookings b
WHERE b.id=d.booking_id
  AND b.start_date IS NOT NULL
  AND (extract(year FROM d.check_in)<1900 OR extract(year FROM d.check_in)>2100);

-- ---------------------------------------------------------------------------
-- Authoritative profit analytics. Every booking amount comes from the same
-- cockpit used by the executive dashboard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profit_analytics_dashboard(
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
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF _org_id IS NULL OR NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized to read profit analytics' USING ERRCODE = '42501';
  END IF;
  IF _start_date IS NULL OR _end_date IS NULL OR _start_date > _end_date THEN
    RAISE EXCEPTION 'Invalid profit analytics date range' USING ERRCODE = '22007';
  END IF;

  WITH metrics AS MATERIALIZED (
    SELECT b.id, b.booking_number, b.booking_type, b.start_date,
      b.customer_id, coalesce(nullif(b.customer_name, ''), 'غير محدد') AS customer_name,
      b.employee_id, coalesce(nullif(e.full_name, ''), 'غير محدد') AS employee_name,
      cockpit->'summary' AS summary
    FROM public.bookings b
    LEFT JOIN public.employees e ON e.id=b.employee_id AND e.organization_id=b.organization_id
    CROSS JOIN LATERAL public.get_booking_profit_cockpit(b.id) cockpit
    WHERE b.organization_id=_org_id
      AND b.start_date BETWEEN _start_date AND _end_date
      AND upper(coalesce(nullif(b.currency, ''), 'EGP'))=v_currency
      AND lower(coalesce(b.status, '')) IN ('confirmed','completed','paid')
  )
  SELECT jsonb_build_object(
    'filters', jsonb_build_object('organization_id',_org_id,'start_date',_start_date,'end_date',_end_date,'currency',v_currency),
    'summary', jsonb_build_object(
      'bookings_count', count(*),
      'selling', coalesce(sum((summary->>'selling')::numeric),0),
      'supplier_cost', coalesce(sum((summary->>'supplier_cost')::numeric),0),
      'direct_expenses', coalesce(sum((summary->>'direct_expenses')::numeric),0),
      'commissions', coalesce(sum((summary->>'commissions')::numeric),0),
      'net_contribution', coalesce(sum((summary->>'net_contribution')::numeric),0),
      'margin_pct', CASE WHEN coalesce(sum((summary->>'selling')::numeric),0)<>0
        THEN round(sum((summary->>'net_contribution')::numeric)/sum((summary->>'selling')::numeric)*100,2) ELSE 0 END
    ),
    'monthly', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.month) FROM (
      SELECT date_trunc('month',start_date)::date AS month, count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,
        sum((summary->>'supplier_cost')::numeric + (summary->>'direct_expenses')::numeric + (summary->>'commissions')::numeric) AS total_cost,
        sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY date_trunc('month',start_date)
    ) x),'[]'::jsonb),
    'by_type', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC) FROM (
      SELECT booking_type AS id, booking_type AS name, count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,
        sum((summary->>'supplier_cost')::numeric + (summary->>'direct_expenses')::numeric + (summary->>'commissions')::numeric) AS total_cost,
        sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY booking_type
    ) x),'[]'::jsonb),
    'by_customer', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC) FROM (
      SELECT customer_id AS id, customer_name AS name, count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,
        sum((summary->>'supplier_cost')::numeric + (summary->>'direct_expenses')::numeric + (summary->>'commissions')::numeric) AS total_cost,
        sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY customer_id,customer_name
    ) x),'[]'::jsonb),
    'by_employee', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC) FROM (
      SELECT employee_id AS id, employee_name AS name, count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,
        sum((summary->>'supplier_cost')::numeric + (summary->>'direct_expenses')::numeric + (summary->>'commissions')::numeric) AS total_cost,
        sum((summary->>'commissions')::numeric) AS commissions,
        sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY employee_id,employee_name
    ) x),'[]'::jsonb),
    'bookings', coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.start_date DESC) FROM (
      SELECT id,booking_number,booking_type,start_date,customer_id,customer_name,employee_id,employee_name,
        (summary->>'selling')::numeric AS selling,
        (summary->>'supplier_cost')::numeric AS supplier_cost,
        ((summary->>'direct_expenses')::numeric + (summary->>'commissions')::numeric) AS additional_costs,
        (summary->>'net_contribution')::numeric AS net_contribution,
        CASE WHEN (summary->>'selling')::numeric<>0 THEN round((summary->>'net_contribution')::numeric/(summary->>'selling')::numeric*100,2) ELSE 0 END AS margin_pct
      FROM metrics
    ) x),'[]'::jsonb)
  ) INTO v_result
  FROM metrics;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_profit_analytics_dashboard(uuid,date,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profit_analytics_dashboard(uuid,date,date,text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Travel KPIs with room-night, destination and booking drill-downs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_travel_kpi_dashboard(
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
  v_currency text := upper(coalesce(nullif(_currency,''),'EGP'));
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF _org_id IS NULL OR NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized to read travel KPIs' USING ERRCODE='42501';
  END IF;
  IF _start_date IS NULL OR _end_date IS NULL OR _start_date>_end_date THEN
    RAISE EXCEPTION 'Invalid travel KPI date range' USING ERRCODE='22007';
  END IF;

  WITH candidates AS MATERIALIZED (
    SELECT b.*,
      coalesce(h.destination, f.destination, t.destination, c.destination, 'غير محدد') AS destination,
      coalesce(h.room_nights,0)::integer AS room_nights
    FROM public.bookings b
    LEFT JOIN LATERAL (
      SELECT max(coalesce(nullif(d.city,''),nullif(d.hotel_name,''))) AS destination,
        sum(greatest(1,coalesce(d.rooms,1))*greatest(1,CASE
          WHEN d.nights BETWEEN 1 AND 365 THEN d.nights
          WHEN d.check_out>d.check_in AND d.check_out-d.check_in BETWEEN 1 AND 365 THEN d.check_out-d.check_in
          WHEN b.end_date>b.start_date AND b.end_date-b.start_date BETWEEN 1 AND 365 THEN b.end_date-b.start_date
          ELSE 1 END))::integer AS room_nights
      FROM public.booking_hotel_details d WHERE d.booking_id=b.id
    ) h ON true
    LEFT JOIN LATERAL (SELECT max(nullif(d.arrival_airport,'')) AS destination FROM public.booking_flight_details d WHERE d.booking_id=b.id) f ON true
    LEFT JOIN LATERAL (SELECT max(coalesce(nullif(d.dropoff_point,''),nullif(d.route,''))) AS destination FROM public.booking_transport_details d WHERE d.booking_id=b.id) t ON true
    LEFT JOIN LATERAL (SELECT max(nullif(d.dropoff_location,'')) AS destination FROM public.booking_car_details d WHERE d.booking_id=b.id) c ON true
    WHERE b.organization_id=_org_id AND b.start_date BETWEEN _start_date AND _end_date
      AND upper(coalesce(nullif(b.currency,''),'EGP'))=v_currency
  ), metrics AS MATERIALIZED (
    SELECT b.id,b.booking_number,b.booking_type,b.status,b.start_date,b.created_at,b.customer_id,
      coalesce(nullif(b.customer_name,''),'غير محدد') AS customer_name,
      b.supplier_id,coalesce(nullif(b.supplier_name,''),'غير محدد') AS supplier_name,
      b.destination,b.room_nights,cockpit->'summary' AS summary
    FROM candidates b CROSS JOIN LATERAL public.get_booking_profit_cockpit(b.id) cockpit
    WHERE lower(coalesce(b.status,'')) IN ('confirmed','completed','paid')
  ), customer_counts AS (
    SELECT customer_id,count(*) AS booking_count FROM metrics WHERE customer_id IS NOT NULL GROUP BY customer_id
  )
  SELECT jsonb_build_object(
    'filters',jsonb_build_object('organization_id',_org_id,'start_date',_start_date,'end_date',_end_date,'currency',v_currency),
    'summary',jsonb_build_object(
      'period_bookings_count',(SELECT count(*) FROM candidates),
      'confirmed_count',(SELECT count(*) FROM metrics),
      'cancelled_count',(SELECT count(*) FROM candidates WHERE lower(coalesce(status,'')) IN ('cancelled','canceled','void')),
      'cancellation_rate_pct',CASE WHEN (SELECT count(*) FROM candidates)>0 THEN round((SELECT count(*) FROM candidates WHERE lower(coalesce(status,'')) IN ('cancelled','canceled','void'))::numeric/(SELECT count(*) FROM candidates)*100,2) ELSE 0 END,
      'selling',coalesce(sum((summary->>'selling')::numeric),0),
      'net_contribution',coalesce(sum((summary->>'net_contribution')::numeric),0),
      'take_rate_pct',CASE WHEN coalesce(sum((summary->>'selling')::numeric),0)<>0 THEN round(sum((summary->>'net_contribution')::numeric)/sum((summary->>'selling')::numeric)*100,2) ELSE 0 END,
      'room_nights',coalesce(sum(room_nights),0),
      'adr',CASE WHEN coalesce(sum(room_nights),0)>0 THEN round(sum((summary->>'selling')::numeric) FILTER (WHERE booking_type='hotel')/sum(room_nights),2) ELSE 0 END,
      'average_lead_days',coalesce(round(avg(greatest(0,start_date-created_at::date)),1),0),
      'unique_customers',(SELECT count(*) FROM customer_counts),
      'repeat_customers',(SELECT count(*) FROM customer_counts WHERE booking_count>1),
      'repeat_customer_rate_pct',CASE WHEN (SELECT count(*) FROM customer_counts)>0 THEN round((SELECT count(*) FROM customer_counts WHERE booking_count>1)::numeric/(SELECT count(*) FROM customer_counts)*100,2) ELSE 0 END
    ),
    'by_type',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.net_contribution DESC) FROM (
      SELECT booking_type AS id,booking_type AS name,count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,sum((summary->>'net_contribution')::numeric) AS net_contribution,
        sum(room_nights)::integer AS room_nights
      FROM metrics GROUP BY booking_type
    ) x),'[]'::jsonb),
    'by_destination',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.selling DESC) FROM (
      SELECT destination AS name,count(*)::integer AS booking_count,sum((summary->>'selling')::numeric) AS selling,
        sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY destination ORDER BY selling DESC LIMIT 20
    ) x),'[]'::jsonb),
    'by_supplier',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.booking_count DESC) FROM (
      SELECT supplier_id AS id,supplier_name AS name,count(*)::integer AS booking_count,
        sum((summary->>'selling')::numeric) AS selling,sum((summary->>'net_contribution')::numeric) AS net_contribution
      FROM metrics GROUP BY supplier_id,supplier_name ORDER BY booking_count DESC LIMIT 20
    ) x),'[]'::jsonb),
    'bookings',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.start_date DESC) FROM (
      SELECT id,booking_number,booking_type,start_date,customer_name,supplier_name,destination,room_nights,
        greatest(0,start_date-created_at::date) AS lead_days,(summary->>'selling')::numeric AS selling,
        (summary->>'net_contribution')::numeric AS net_contribution
      FROM metrics
    ) x),'[]'::jsonb)
  ) INTO v_result FROM metrics;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_travel_kpi_dashboard(uuid,date,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_travel_kpi_dashboard(uuid,date,date,text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Missing-document / deferred / unbilled report.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_exception_report(
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
DECLARE v_currency text:=upper(coalesce(nullif(_currency,''),'EGP')); v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF _org_id IS NULL OR NOT public._can_read_org_finance(_org_id) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF _start_date IS NULL OR _end_date IS NULL OR _start_date>_end_date THEN RAISE EXCEPTION 'Invalid date range' USING ERRCODE='22007'; END IF;

  WITH metrics AS MATERIALIZED (
    SELECT b.id,b.booking_number,b.booking_type,b.start_date,
      coalesce(nullif(b.customer_name,''),'غير محدد') AS customer_name,
      coalesce(nullif(b.supplier_name,''),'غير محدد') AS supplier_name,
      cockpit->'summary' AS summary,cockpit->'settlement' AS settlement,cockpit->'warnings' AS warnings,
      EXISTS(SELECT 1 FROM public.booking_vouchers v WHERE v.booking_id=b.id) AS has_voucher,
      EXISTS(SELECT 1 FROM public.supplier_payment_orders po WHERE po.booking_id=b.id) AS has_payment_order
    FROM public.bookings b CROSS JOIN LATERAL public.get_booking_profit_cockpit(b.id) cockpit
    WHERE b.organization_id=_org_id AND b.start_date BETWEEN _start_date AND _end_date
      AND upper(coalesce(nullif(b.currency,''),'EGP'))=v_currency
      AND lower(coalesce(b.status,'')) IN ('confirmed','completed','paid')
  ), flagged AS (
    SELECT *,
      (summary->>'selling')::numeric>(summary->>'customer_invoiced')::numeric+.01 AS customer_unbilled,
      (summary->>'supplier_cost')::numeric>(summary->>'supplier_invoiced')::numeric+.01 AS supplier_unbilled,
      (summary->>'customer_collected')::numeric>(summary->>'customer_invoiced')::numeric+.01 AS customer_advance,
      (summary->>'supplier_paid')::numeric>(summary->>'supplier_invoiced')::numeric+.01 AS supplier_advance
    FROM metrics
  )
  SELECT jsonb_build_object(
    'filters',jsonb_build_object('organization_id',_org_id,'start_date',_start_date,'end_date',_end_date,'currency',v_currency),
    'summary',jsonb_build_object(
      'bookings_count',count(*),'customer_unbilled_count',count(*) FILTER(WHERE customer_unbilled),
      'supplier_unbilled_count',count(*) FILTER(WHERE supplier_unbilled),'customer_advance_count',count(*) FILTER(WHERE customer_advance),
      'supplier_advance_count',count(*) FILTER(WHERE supplier_advance),'missing_voucher_count',count(*) FILTER(WHERE NOT has_voucher),
      'missing_payment_order_count',count(*) FILTER(WHERE (summary->>'supplier_cost')::numeric>.01 AND NOT has_payment_order),
      'financially_open_count',count(*) FILTER(WHERE NOT (settlement->>'financially_complete')::boolean)
    ),
    'rows',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'booking_number',booking_number,'booking_type',booking_type,'start_date',start_date,
      'customer_name',customer_name,'supplier_name',supplier_name,
      'selling',(summary->>'selling')::numeric,'supplier_cost',(summary->>'supplier_cost')::numeric,
      'customer_unbilled_amount',greatest(0,(summary->>'selling')::numeric-(summary->>'customer_invoiced')::numeric),
      'supplier_unbilled_amount',greatest(0,(summary->>'supplier_cost')::numeric-(summary->>'supplier_invoiced')::numeric),
      'customer_advance_amount',greatest(0,(summary->>'customer_collected')::numeric-(summary->>'customer_invoiced')::numeric),
      'supplier_advance_amount',greatest(0,(summary->>'supplier_paid')::numeric-(summary->>'supplier_invoiced')::numeric),
      'customer_unbilled',customer_unbilled,'supplier_unbilled',supplier_unbilled,'customer_advance',customer_advance,
      'supplier_advance',supplier_advance,'missing_voucher',NOT has_voucher,
      'missing_payment_order',(summary->>'supplier_cost')::numeric>.01 AND NOT has_payment_order,
      'financially_complete',(settlement->>'financially_complete')::boolean,'warnings',warnings
    ) ORDER BY start_date DESC) FILTER(WHERE customer_unbilled OR supplier_unbilled OR customer_advance OR supplier_advance OR NOT has_voucher OR ((summary->>'supplier_cost')::numeric>.01 AND NOT has_payment_order) OR NOT (settlement->>'financially_complete')::boolean),'[]'::jsonb)
  ) INTO v_result FROM flagged;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_financial_exception_report(uuid,date,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_exception_report(uuid,date,date,text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Live operational alerts (counts only; never combines money across currencies).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_smart_operational_alerts(_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_belongs_to_org(auth.uid(),_org_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.priority_order,x.title),'[]'::jsonb) INTO v_result FROM (
    SELECT 'overdue_deadlines' AS id,'danger' AS type,'high' AS priority,1 AS priority_order,
      'مواعيد تشغيل متأخرة' AS title,count(*)::integer AS value,
      format('يوجد %s موعد تشغيل متأخر يحتاج إجراء.',count(*)) AS message,'/operations/queue' AS href
    FROM public.sop_operational_deadlines WHERE organization_id=_org_id AND status='open' AND due_at<now() HAVING count(*)>0
    UNION ALL
    SELECT 'overdue_incidents','danger','high',1,'حوادث دون تحديث',count(*)::integer,
      format('يوجد %s حادث أو شكوى تجاوز موعد التحديث.',count(*)),'/customer-service'
    FROM public.sop_incidents WHERE organization_id=_org_id AND status NOT IN ('resolved','closed') AND next_update_at<now() HAVING count(*)>0
    UNION ALL
    SELECT 'failed_automation','warning','high',1,'أتمتة فاشلة',count(*)::integer,
      format('يوجد %s تشغيل أتمتة فاشل يحتاج إعادة معالجة.',count(*)),'/automation'
    FROM public.booking_automation_runs WHERE organization_id=_org_id AND status='failed' HAVING count(*)>0
    UNION ALL
    SELECT 'missing_vouchers','warning','medium',2,'فاوتشرات ناقصة',count(*)::integer,
      format('يوجد %s حجز مؤكد بدون فاوتشر.',count(*)),'/document-center'
    FROM public.bookings b WHERE b.organization_id=_org_id AND lower(coalesce(b.status,'')) IN ('confirmed','completed','paid')
      AND NOT EXISTS(SELECT 1 FROM public.booking_vouchers v WHERE v.booking_id=b.id) HAVING count(*)>0
    UNION ALL
    SELECT 'pending_payment_orders','info','medium',2,'أوامر دفع بانتظار الاعتماد',count(*)::integer,
      format('يوجد %s أمر دفع مورد بانتظار الاعتماد.',count(*)),'/payment-orders'
    FROM public.supplier_payment_orders WHERE organization_id=_org_id AND approval_status='pending' HAVING count(*)>0
  ) x;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_smart_operational_alerts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_smart_operational_alerts(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Controlled employee merge. All real foreign keys are repointed inside one
-- transaction; any uniqueness conflict aborts the whole merge safely.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_merge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kept_employee_id uuid NOT NULL, merged_employee_ids uuid[] NOT NULL, merged_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_merge_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.employee_merge_audit TO authenticated;
GRANT ALL ON public.employee_merge_audit TO service_role;
DROP POLICY IF EXISTS employee_merge_audit_read ON public.employee_merge_audit;
CREATE POLICY employee_merge_audit_read ON public.employee_merge_audit FOR SELECT TO authenticated
USING ((SELECT public.sop_is_manager(organization_id,auth.uid())));

CREATE OR REPLACE FUNCTION public.merge_employee_records(_keep_id uuid,_merge_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_org uuid; v_role text; v_fk record; v_count integer:=0; v_changed integer;
BEGIN
  IF auth.uid() IS NULL OR _keep_id IS NULL OR coalesce(array_length(_merge_ids,1),0)=0 OR _keep_id=ANY(_merge_ids) THEN
    RAISE EXCEPTION 'Invalid employee merge request';
  END IF;
  SELECT organization_id INTO v_org FROM public.employees WHERE id=_keep_id AND coalesce(is_active,true) FOR UPDATE;
  IF v_org IS NULL OR EXISTS(SELECT 1 FROM public.employees WHERE id=ANY(_merge_ids) AND organization_id IS DISTINCT FROM v_org) OR
     (SELECT count(*) FROM public.employees WHERE id=ANY(_merge_ids))<>array_length(_merge_ids,1) THEN RAISE EXCEPTION 'Employees must exist in the same organization'; END IF;
  SELECT role::text INTO v_role FROM public.organization_members WHERE organization_id=v_org AND user_id=auth.uid() AND is_active=true;
  IF v_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Only organization owners or admins can merge employees' USING ERRCODE='42501'; END IF;

  FOR v_fk IN
    SELECT ns.nspname AS schema_name,cl.relname AS table_name,att.attname AS column_name
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class cl ON cl.oid=con.conrelid
    JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY ck(attnum,ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY fk(attnum,ord) USING(ord)
    JOIN pg_catalog.pg_attribute att ON att.attrelid=con.conrelid AND att.attnum=ck.attnum
    JOIN pg_catalog.pg_attribute ratt ON ratt.attrelid=con.confrelid AND ratt.attnum=fk.attnum
    WHERE con.contype='f' AND con.confrelid='public.employees'::regclass AND ratt.attname='id'
      AND NOT (ns.nspname='public' AND cl.relname='employee_merge_audit')
  LOOP
    EXECUTE format('UPDATE %I.%I SET %I=$1 WHERE %I=ANY($2)',v_fk.schema_name,v_fk.table_name,v_fk.column_name,v_fk.column_name)
      USING _keep_id,_merge_ids;
    GET DIAGNOSTICS v_changed=ROW_COUNT; v_count:=v_count+v_changed;
  END LOOP;
  UPDATE public.employees SET is_active=false,updated_at=now() WHERE id=ANY(_merge_ids);
  INSERT INTO public.employee_merge_audit(organization_id,kept_employee_id,merged_employee_ids,merged_by)
  VALUES(v_org,_keep_id,_merge_ids,auth.uid());
  RETURN jsonb_build_object('success',true,'kept_employee_id',_keep_id,'merged_employee_ids',_merge_ids,'references_updated',v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_employee_records(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_employee_records(uuid,uuid[]) TO authenticated, service_role;
