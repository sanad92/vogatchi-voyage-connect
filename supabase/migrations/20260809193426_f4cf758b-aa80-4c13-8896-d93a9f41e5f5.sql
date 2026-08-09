
CREATE OR REPLACE FUNCTION public.sop_compliance_report(p_org uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.user_belongs_to_org(p_org, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'unowned_leads', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'contact_name', l.contact_name,
        'stage', l.stage, 'created_at', l.created_at)), '[]'::jsonb)
      FROM public.sop_leads l WHERE l.organization_id = p_org AND NOT l.is_legacy
        AND l.current_owner_id IS NULL AND l.stage NOT IN ('won','lost','cancelled')),
    'incomplete_intake', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'contact_name', l.contact_name,
        'stage', l.stage, 'missing', to_jsonb(public.sop_intake_missing(l)))), '[]'::jsonb)
      FROM public.sop_leads l WHERE l.organization_id = p_org AND NOT l.is_legacy
        AND l.stage IN ('new','qualified') AND array_length(public.sop_intake_missing(l),1) IS NOT NULL),
    'ack_sla_breaches', (SELECT COALESCE(jsonb_agg(jsonb_build_object('lead_id', a.lead_id, 'assignee', a.assignee_id,
        'deadline', a.ack_deadline_at)), '[]'::jsonb)
      FROM public.sop_lead_assignments a JOIN public.sop_leads l ON l.id = a.lead_id
      WHERE a.organization_id = p_org AND a.is_current AND a.acknowledged_at IS NULL
        AND a.ack_deadline_at < now() AND NOT l.is_legacy),
    'incomplete_handovers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', h.id, 'lead_id', h.lead_id,
        'type', h.handover_type, 'missing', to_jsonb(h.missing_items))), '[]'::jsonb)
      FROM public.sop_handovers h JOIN public.sop_leads l ON l.id = h.lead_id
      WHERE h.organization_id = p_org AND NOT h.is_complete AND NOT l.is_legacy),
    'requote_required', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'contact_name', l.contact_name)), '[]'::jsonb)
      FROM public.sop_leads l WHERE l.organization_id = p_org AND NOT l.is_legacy AND l.requote_required),
    'stuck_leads', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'contact_name', l.contact_name,
        'stage', l.stage, 'idle_hours', round(extract(epoch from now() - l.updated_at)/3600))), '[]'::jsonb)
      FROM public.sop_leads l WHERE l.organization_id = p_org AND NOT l.is_legacy
        AND l.stage NOT IN ('won','lost','cancelled') AND l.updated_at < now() - interval '48 hours'),
    'overdue_deadlines', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'type', d.deadline_type,
        'booking_id', d.booking_id, 'due_at', d.due_at)), '[]'::jsonb)
      FROM public.sop_operational_deadlines d WHERE d.organization_id = p_org AND NOT d.is_legacy
        AND d.status = 'open' AND d.due_at < now()),
    'overdue_incidents', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title,
        'severity', i.severity, 'next_update_at', i.next_update_at)), '[]'::jsonb)
      FROM public.sop_incidents i WHERE i.organization_id = p_org AND i.status <> 'resolved'
        AND i.next_update_at IS NOT NULL AND i.next_update_at < now()),
    'pending_approvals', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'type', a.approval_type,
        'amount', a.amount, 'requested_at', a.created_at)), '[]'::jsonb)
      FROM public.sop_approvals a WHERE a.organization_id = p_org AND a.status = 'pending')
  ) INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.sop_department_kpis(p_org uuid, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE f timestamptz; t timestamptz; total int; cs jsonb; sales jsonb; res jsonb;
BEGIN
  IF NOT public.user_belongs_to_org(p_org, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  f := COALESCE(p_from, (current_date - 30))::timestamptz;
  t := COALESCE(p_to, current_date)::timestamptz + interval '1 day';

  SELECT count(*) INTO total FROM public.sop_leads l
   WHERE l.organization_id = p_org AND NOT l.is_legacy AND l.created_at >= f AND l.created_at < t;

  SELECT jsonb_build_object(
    'leads', total,
    'avg_first_response_minutes', COALESCE(round(avg(extract(epoch from (l.first_response_at - l.arrived_at))/60))::numeric, 0),
    'intake_completeness_pct', CASE WHEN total = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE array_length(public.sop_intake_missing(l),1) IS NULL) / total, 1) END,
    'unassigned_rate_pct', CASE WHEN total = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE l.current_owner_id IS NULL AND l.stage NOT IN ('won','lost','cancelled')) / total, 1) END,
    'pre_arrival_done_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE d.status = 'done')
        / NULLIF(count(*),0), 1) FROM public.sop_operational_deadlines d
        WHERE d.organization_id = p_org AND d.deadline_type = 'pre_arrival' AND NOT d.is_legacy
          AND d.due_at >= f AND d.due_at < t), 0),
    'satisfaction_avg', COALESCE((SELECT round(avg(a.rating)::numeric, 2) FROM public.sop_post_trip_actions a
        WHERE a.organization_id = p_org AND a.rating IS NOT NULL AND a.created_at >= f AND a.created_at < t), 0),
    'incidents_resolved_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE i.status = 'resolved')
        / NULLIF(count(*),0), 1) FROM public.sop_incidents i
        WHERE i.organization_id = p_org AND i.created_at >= f AND i.created_at < t), 0)
  ) INTO cs
  FROM public.sop_leads l
  WHERE l.organization_id = p_org AND NOT l.is_legacy AND l.created_at >= f AND l.created_at < t;

  SELECT jsonb_build_object(
    'assignment_ack_sla_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (
        WHERE a.acknowledged_at IS NOT NULL AND a.acknowledged_at <= a.ack_deadline_at) / NULLIF(count(*),0), 1)
      FROM public.sop_lead_assignments a JOIN public.sop_leads l2 ON l2.id = a.lead_id
      WHERE a.organization_id = p_org AND NOT l2.is_legacy AND a.created_at >= f AND a.created_at < t), 0),
    'qualification_rate_pct', CASE WHEN total = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE l.stage <> 'new' AND l.stage <> 'lost') / total, 1) END,
    'conversion_rate_pct', CASE WHEN total = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE l.stage = 'won') / total, 1) END,
    'won', count(*) FILTER (WHERE l.stage = 'won'),
    'lost', count(*) FILTER (WHERE l.stage = 'lost'),
    'brief_quality_pct', CASE WHEN total = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE array_length(public.sop_brief_missing(l),1) IS NULL) / total, 1) END,
    'net_profit', COALESCE((SELECT round(SUM(b.profit)::numeric,2) FROM public.bookings b
        JOIN public.sop_leads l3 ON l3.booking_id = b.id
        WHERE b.organization_id = p_org AND NOT l3.is_legacy AND b.created_at >= f AND b.created_at < t), 0),
    'followup_compliance_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE fu.status = 'completed')
        / NULLIF(count(*),0), 1) FROM public.customer_follow_ups fu
        WHERE fu.organization_id = p_org AND fu.created_at >= f AND fu.created_at < t), 0)
  ) INTO sales
  FROM public.sop_leads l
  WHERE l.organization_id = p_org AND NOT l.is_legacy AND l.created_at >= f AND l.created_at < t;

  SELECT jsonb_build_object(
    'quotation_turnaround_minutes', COALESCE(round(avg(extract(epoch from (r.quoted_at - r.requested_at))/60)
        ) FILTER (WHERE r.quoted_at IS NOT NULL), 0),
    'pricing_requests', count(*),
    'quoted', count(*) FILTER (WHERE r.status IN ('quoted','requoted')),
    'requote_rate_pct', CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 *
        count(*) FILTER (WHERE r.status = 'requoted' OR coalesce(r.recheck_changed,false)) / count(*), 1) END,
    'recheck_change_rate_pct', CASE WHEN count(*) FILTER (WHERE r.recheck_completed_at IS NOT NULL) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE coalesce(r.recheck_changed,false))
        / count(*) FILTER (WHERE r.recheck_completed_at IS NOT NULL), 1) END,
    'deadline_compliance_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (
        WHERE d.status = 'done' AND (d.completed_at IS NULL OR d.completed_at <= d.due_at)) / NULLIF(count(*),0), 1)
      FROM public.sop_operational_deadlines d WHERE d.organization_id = p_org AND NOT d.is_legacy
        AND d.due_at >= f AND d.due_at < t), 0),
    'handover_quality_pct', COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE h.is_complete)
        / NULLIF(count(*),0), 1) FROM public.sop_handovers h JOIN public.sop_leads l4 ON l4.id = h.lead_id
      WHERE h.organization_id = p_org AND NOT l4.is_legacy AND h.created_at >= f AND h.created_at < t), 0),
    'net_profit', COALESCE((SELECT round(SUM(o.selling_price - o.net_cost)::numeric, 2)
      FROM public.sop_pricing_options o JOIN public.sop_pricing_requests r2 ON r2.id = o.pricing_request_id
      WHERE o.organization_id = p_org AND o.is_selected AND r2.created_at >= f AND r2.created_at < t), 0)
  ) INTO res
  FROM public.sop_pricing_requests r
  WHERE r.organization_id = p_org AND NOT r.is_legacy AND r.created_at >= f AND r.created_at < t;

  RETURN jsonb_build_object('range', jsonb_build_object('from', f, 'to', t),
    'customer_service', cs, 'sales', sales, 'reservations', res);
END $$;

REVOKE EXECUTE ON FUNCTION public.sop_compliance_report(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_department_kpis(uuid, date, date) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_compliance_report(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sop_department_kpis(uuid, date, date) TO authenticated, service_role;
