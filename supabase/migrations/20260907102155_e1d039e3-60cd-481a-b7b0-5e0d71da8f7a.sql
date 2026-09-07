DROP FUNCTION IF EXISTS public.get_module_pulse(date, date);
CREATE OR REPLACE FUNCTION public.get_module_pulse(p_from date, p_to date, p_org uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org uuid;
  v_from date := coalesce(p_from, current_date - 29);
  v_to date := coalesce(p_to, current_date);
  v_span int;
  v_pfrom date; v_pto date;
  v_cur jsonb; v_prev jsonb;
  v_alerts jsonb; v_activity jsonb;
BEGIN
  IF p_org IS NOT NULL THEN
    SELECT om.organization_id INTO v_org FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = p_org LIMIT 1;
  ELSE
    SELECT om.organization_id INTO v_org FROM organization_members om
    WHERE om.user_id = auth.uid() ORDER BY om.created_at NULLS LAST LIMIT 1;
  END IF;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('organization_id', NULL, 'current', '{}'::jsonb, 'previous', '{}'::jsonb, 'alerts', '[]'::jsonb, 'activity', '[]'::jsonb);
  END IF;

  v_span := greatest((v_to - v_from) + 1, 1);
  v_pto := v_from - 1;
  v_pfrom := v_pto - (v_span - 1);

  v_cur := _module_pulse_window(v_org, v_from, v_to);
  v_prev := _module_pulse_window(v_org, v_pfrom, v_pto);

  SELECT jsonb_agg(a) INTO v_alerts FROM (
    SELECT jsonb_build_object('key','qualified_no_pricing','module','sales','count',
      (SELECT count(*) FROM sop_leads l WHERE l.organization_id=v_org AND l.stage='qualified'
        AND NOT EXISTS (SELECT 1 FROM sop_pricing_requests pr WHERE pr.lead_id=l.id))) AS a
    UNION ALL SELECT jsonb_build_object('key','pricing_quoted_no_quote','module','supply','count',
      (SELECT count(*) FROM sop_pricing_requests pr WHERE pr.organization_id=v_org AND pr.status::text IN ('quoted','requoted') AND pr.quote_id IS NULL))
    UNION ALL SELECT jsonb_build_object('key','quote_accepted_no_booking','module','operations','count',
      (SELECT count(*) FROM quotes q WHERE q.organization_id=v_org AND q.status IN ('accepted','approved')
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.quote_id=q.id)))
    UNION ALL SELECT jsonb_build_object('key','booking_no_invoice','module','finance','count',
      (SELECT count(*) FROM bookings b WHERE b.organization_id=v_org AND b.status IN ('confirmed','completed')
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id=b.id)))
    UNION ALL SELECT jsonb_build_object('key','cost_no_payment_order','module','finance','count',
      (SELECT count(*) FROM bookings b WHERE b.organization_id=v_org AND coalesce(b.cost_price,0) > 0 AND b.status IN ('confirmed','completed')
        AND NOT EXISTS (SELECT 1 FROM supplier_payment_orders o WHERE o.booking_id=b.id)))
    UNION ALL SELECT jsonb_build_object('key','paid_invoice_no_journal','module','finance','count',
      (SELECT count(*) FROM invoices i WHERE i.organization_id=v_org AND i.payment_status='paid'
        AND NOT EXISTS (SELECT 1 FROM journal_entries j WHERE j.source_id=i.id OR j.reference_id=i.id)))
  ) alerts_src;

  SELECT jsonb_agg(x ORDER BY (x->>'at') DESC) INTO v_activity FROM (
    (SELECT jsonb_build_object('at', h.occurred_at, 'module','sales','type','lead_stage',
       'title', coalesce(h.action,'stage') || ' • ' || coalesce(h.to_stage::text,''), 'actor', h.actor_name, 'ref', h.lead_id) x
     FROM sop_lead_stage_history h WHERE h.organization_id=v_org ORDER BY h.occurred_at DESC LIMIT 8)
    UNION ALL
    (SELECT jsonb_build_object('at', pr.updated_at, 'module','supply','type','pricing',
       'title', 'تسعير ' || coalesce(pr.status::text,''), 'actor', NULL, 'ref', pr.id)
     FROM sop_pricing_requests pr WHERE pr.organization_id=v_org ORDER BY pr.updated_at DESC LIMIT 8)
    UNION ALL
    (SELECT jsonb_build_object('at', b.updated_at, 'module','operations','type','booking',
       'title', coalesce(b.booking_number,'حجز') || ' • ' || coalesce(b.status,''), 'actor', b.customer_name, 'ref', b.id)
     FROM bookings b WHERE b.organization_id=v_org ORDER BY b.updated_at DESC LIMIT 8)
    UNION ALL
    (SELECT jsonb_build_object('at', i.updated_at, 'module','finance','type','invoice',
       'title', coalesce(i.invoice_number,'فاتورة') || ' • ' || coalesce(i.payment_status,''), 'actor', i.customer_name, 'ref', i.id)
     FROM invoices i WHERE i.organization_id=v_org ORDER BY i.updated_at DESC LIMIT 8)
    UNION ALL
    (SELECT jsonb_build_object('at', m.created_at, 'module','growth','type','whatsapp',
       'title', 'واتساب ' || coalesce(m.direction,'') || ' • ' || coalesce(m.status,''), 'actor', NULL, 'ref', m.conversation_id)
     FROM whatsapp_messages m WHERE m.organization_id=v_org ORDER BY m.created_at DESC LIMIT 8)
  ) act;

  RETURN jsonb_build_object(
    'organization_id', v_org,
    'generated_at', now(),
    'range', jsonb_build_object('from', v_from, 'to', v_to),
    'previous_range', jsonb_build_object('from', v_pfrom, 'to', v_pto),
    'current', v_cur,
    'previous', v_prev,
    'alerts', coalesce(v_alerts, '[]'::jsonb),
    'activity', coalesce(v_activity, '[]'::jsonb)
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_module_pulse(date, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_module_pulse(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_module_pulse(date, date, uuid) TO authenticated;