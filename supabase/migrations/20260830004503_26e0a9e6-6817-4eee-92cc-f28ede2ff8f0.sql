CREATE OR REPLACE FUNCTION public._module_pulse_window(p_org uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- SALES
    'leads_new', (SELECT count(*) FROM sop_leads l WHERE l.organization_id=p_org AND l.created_at::date BETWEEN p_from AND p_to),
    'leads_qualifying', (SELECT count(*) FROM sop_leads l WHERE l.organization_id=p_org AND l.stage='assigned'),
    'leads_qualified', (SELECT count(*) FROM sop_leads l WHERE l.organization_id=p_org AND l.stage='qualified'),
    'leads_won', (SELECT count(*) FROM sop_leads l WHERE l.organization_id=p_org AND l.stage='won' AND coalesce(l.converted_at,l.updated_at)::date BETWEEN p_from AND p_to),
    'quotes_sent', (SELECT count(*) FROM quotes q WHERE q.organization_id=p_org AND q.created_at::date BETWEEN p_from AND p_to),
    'quotes_accepted', (SELECT count(*) FROM quotes q WHERE q.organization_id=p_org AND q.status IN ('accepted','approved','converted') AND q.updated_at::date BETWEEN p_from AND p_to),

    -- SUPPLY / PRICING
    'pricing_open', (SELECT count(*) FROM sop_pricing_requests pr WHERE pr.organization_id=p_org AND pr.status::text IN ('requested','in_progress','recheck')),
    'pricing_published', (SELECT count(*) FROM sop_pricing_requests pr WHERE pr.organization_id=p_org AND pr.quoted_at::date BETWEEN p_from AND p_to),
    'pricing_avg_hours', (SELECT coalesce(round(avg(extract(epoch FROM (pr.quoted_at - pr.requested_at))/3600)::numeric,1),0) FROM sop_pricing_requests pr WHERE pr.organization_id=p_org AND pr.quoted_at IS NOT NULL AND pr.quoted_at::date BETWEEN p_from AND p_to),
    'pricing_options', (SELECT count(*) FROM sop_pricing_options o WHERE o.organization_id=p_org AND o.created_at::date BETWEEN p_from AND p_to),
    'suppliers_active', (SELECT count(*) FROM suppliers s WHERE s.organization_id=p_org AND s.is_active),

    -- OPERATIONS
    'bookings_new', (SELECT count(*) FROM bookings b WHERE b.organization_id=p_org AND b.created_at::date BETWEEN p_from AND p_to),
    'bookings_confirmed', (SELECT count(*) FROM bookings b WHERE b.organization_id=p_org AND b.status IN ('confirmed','completed') AND b.created_at::date BETWEEN p_from AND p_to),
    'travel_next_7d', (SELECT count(*) FROM bookings b WHERE b.organization_id=p_org AND b.status <> 'cancelled' AND b.start_date BETWEEN current_date AND current_date + 7),
    'tasks_overdue', (SELECT count(*) FROM booking_tasks t WHERE t.organization_id=p_org AND t.status <> 'completed' AND t.due_at < now()),
    'bookings_no_voucher', (SELECT count(*) FROM bookings b WHERE b.organization_id=p_org AND b.status='confirmed' AND NOT EXISTS (SELECT 1 FROM booking_vouchers v WHERE v.booking_id=b.id)),

    -- FINANCE
    'revenue', (SELECT coalesce(sum(b.selling_price),0) FROM bookings b WHERE b.organization_id=p_org AND b.status IN ('confirmed','completed') AND b.created_at::date BETWEEN p_from AND p_to),
    'cost', (SELECT coalesce(sum(b.cost_price),0) FROM bookings b WHERE b.organization_id=p_org AND b.status IN ('confirmed','completed') AND b.created_at::date BETWEEN p_from AND p_to),
    'profit', (SELECT coalesce(sum(coalesce(b.profit, b.selling_price - coalesce(b.cost_price,0))),0) FROM bookings b WHERE b.organization_id=p_org AND b.status IN ('confirmed','completed') AND b.created_at::date BETWEEN p_from AND p_to),
    'collected', (SELECT coalesce(sum(cp.amount),0) FROM customer_payments cp WHERE cp.organization_id=p_org AND cp.payment_date::date BETWEEN p_from AND p_to),
    'receivables', (SELECT coalesce(sum(coalesce(i.remaining_amount, i.final_amount - coalesce(i.total_paid_amount,0))),0) FROM invoices i WHERE i.organization_id=p_org AND coalesce(i.remaining_amount, i.final_amount - coalesce(i.total_paid_amount,0)) > 0),
    'payables', (SELECT coalesce(sum(o.amount),0) FROM supplier_payment_orders o WHERE o.organization_id=p_org AND o.status IN ('pending','approved','partial')),
    'invoices_overdue', (SELECT count(*) FROM invoices i WHERE i.organization_id=p_org AND i.due_date < current_date AND coalesce(i.remaining_amount, i.final_amount - coalesce(i.total_paid_amount,0)) > 0),

    -- MANAGEMENT
    'cycle_avg_hours', (SELECT coalesce(round(avg(extract(epoch FROM (l.converted_at - l.created_at))/3600)::numeric,1),0) FROM sop_leads l WHERE l.organization_id=p_org AND l.converted_at IS NOT NULL AND l.converted_at::date BETWEEN p_from AND p_to),
    'leads_stalled', (SELECT count(*) FROM sop_leads l WHERE l.organization_id=p_org AND l.stage::text NOT IN ('won','lost','cancelled') AND l.updated_at < now() - interval '3 days'),
    'stage_events', (SELECT count(*) FROM sop_lead_stage_history h WHERE h.organization_id=p_org AND h.occurred_at::date BETWEEN p_from AND p_to),
    'journal_entries', (SELECT count(*) FROM journal_entries j WHERE j.organization_id=p_org AND j.entry_date BETWEEN p_from AND p_to),

    -- GROWTH
    'messages_sent', (SELECT count(*) FROM whatsapp_messages m WHERE m.organization_id=p_org AND m.direction='outbound' AND m.created_at::date BETWEEN p_from AND p_to),
    'messages_failed', (SELECT count(*) FROM whatsapp_messages m WHERE m.organization_id=p_org AND m.direction='outbound' AND m.status='failed' AND m.created_at::date BETWEEN p_from AND p_to),
    'messages_in', (SELECT count(*) FROM whatsapp_messages m WHERE m.organization_id=p_org AND m.direction='inbound' AND m.created_at::date BETWEEN p_from AND p_to),
    'campaigns_active', (SELECT count(*) FROM marketing_campaigns c WHERE c.organization_id=p_org AND c.status IN ('active','running','scheduled')),
    'automations_active', (SELECT count(*) FROM automation_rules a WHERE a.organization_id=p_org AND a.is_active),
    'repeat_customers', (SELECT count(*) FROM customers c WHERE c.organization_id=p_org AND coalesce(c.total_bookings,0) > 1)
  ) INTO r;
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public._module_pulse_window(uuid, date, date) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_module_pulse(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_from date := coalesce(p_from, current_date - 29);
  v_to date := coalesce(p_to, current_date);
  v_span int;
  v_pfrom date; v_pto date;
  v_cur jsonb; v_prev jsonb;
  v_alerts jsonb; v_activity jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
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
$$;

REVOKE ALL ON FUNCTION public.get_module_pulse(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_module_pulse(date, date) TO authenticated;