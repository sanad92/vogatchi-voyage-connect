
-- ============ idempotent historical reconstruction ============
CREATE OR REPLACE FUNCTION public.sop_backfill_stage_history(p_org uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n_before bigint; n_after bigint; r record;
BEGIN
  IF p_org IS NOT NULL AND NOT public.user_belongs_to_org(auth.uid(), p_org) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT count(*) INTO n_before FROM public.sop_lead_stage_history
    WHERE p_org IS NULL OR organization_id = p_org;

  -- leads
  FOR r IN SELECT * FROM public.sop_leads l WHERE p_org IS NULL OR l.organization_id = p_org LOOP
    PERFORM public.sop_history_write(r.organization_id, r.id, 'lead_created', NULL, NULL, r.created_by,
      r.lead_source, 'backfill:sop_leads', true, NULL, r.quote_id, r.booking_id,
      jsonb_build_object('lead_source', r.lead_source), coalesce(r.arrived_at, r.created_at),
      'created:' || r.id::text);
    IF r.first_response_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.organization_id, r.id, 'cs_first_response', NULL, NULL, NULL, NULL,
        'backfill:sop_leads', true, NULL, NULL, NULL, '{}'::jsonb, r.first_response_at, 'firstresp:' || r.id::text);
    END IF;
    IF r.intake_completed_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.organization_id, r.id, 'intake_completed', NULL, NULL, NULL, NULL,
        'backfill:sop_leads', true, NULL, NULL, NULL, '{}'::jsonb, r.intake_completed_at, 'intake:' || r.id::text);
    END IF;
  END LOOP;

  -- assignments
  FOR r IN SELECT a.*, l.organization_id AS org FROM public.sop_lead_assignments a
             JOIN public.sop_leads l ON l.id = a.lead_id
            WHERE p_org IS NULL OR l.organization_id = p_org LOOP
    PERFORM public.sop_history_write(r.org, r.lead_id,
      CASE WHEN r.method = 'self_claim' THEN 'sales_claimed' ELSE 'sales_assigned' END,
      NULL, NULL, coalesce(r.assignee_id, r.assigned_by), coalesce(r.exception_reason, r.reassignment_reason),
      'backfill:assignments', true, NULL, NULL, NULL,
      jsonb_build_object('method', r.method), r.created_at, 'bf:assign:' || r.id::text);
    IF r.acknowledged_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.org, r.lead_id, 'assignment_acknowledged', NULL, NULL, r.assignee_id, NULL,
        'backfill:assignments', true, NULL, NULL, NULL, '{}'::jsonb, r.acknowledged_at, 'bf:ack:' || r.id::text);
    END IF;
  END LOOP;

  -- pricing requests
  FOR r IN SELECT pr.* FROM public.sop_pricing_requests pr
            WHERE p_org IS NULL OR pr.organization_id = p_org LOOP
    PERFORM public.sop_history_write(r.organization_id, r.lead_id, 'pricing_requested', NULL, NULL, r.requested_by,
      r.notes, 'backfill:pricing', true, r.id, r.quote_id, r.booking_id, '{}'::jsonb,
      coalesce(r.requested_at, r.created_at), 'bf:pr:' || r.id::text || ':requested');
    IF r.quoted_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.organization_id, r.lead_id, 'pricing_published', NULL, NULL, r.assigned_to,
        r.recommendation, 'backfill:pricing', true, r.id, r.quote_id, r.booking_id, '{}'::jsonb,
        r.quoted_at, 'bf:pr:' || r.id::text || ':published');
    END IF;
    IF r.recheck_requested_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.organization_id, r.lead_id, 'recheck_requested', NULL, NULL, r.requested_by,
        NULL, 'backfill:pricing', true, r.id, r.quote_id, NULL, '{}'::jsonb,
        r.recheck_requested_at, 'bf:pr:' || r.id::text || ':recheck_req');
    END IF;
    IF r.recheck_completed_at IS NOT NULL THEN
      PERFORM public.sop_history_write(r.organization_id, r.lead_id, 'recheck_completed', NULL, NULL, r.assigned_to,
        r.recheck_notes, 'backfill:pricing', true, r.id, r.quote_id, NULL,
        jsonb_build_object('changed', r.recheck_changed), r.recheck_completed_at,
        'bf:pr:' || r.id::text || ':recheck_done');
    END IF;
  END LOOP;

  -- event bus replay (stage changes + anything else already recorded)
  FOR r IN SELECT e.* FROM public.domain_events e
            WHERE e.event_type LIKE 'sop.%' AND (p_org IS NULL OR e.organization_id = p_org)
            ORDER BY e.occurred_at LOOP
    DECLARE v_lead uuid; v_pr uuid; v_action text;
    BEGIN
      v_action := CASE r.event_type
        WHEN 'sop.lead.claimed' THEN 'sales_claimed'
        WHEN 'sop.lead.assigned' THEN 'sales_assigned'
        WHEN 'sop.lead.reassigned' THEN 'reassigned'
        WHEN 'sop.lead.assignment_acknowledged' THEN 'assignment_acknowledged'
        WHEN 'sop.lead.disqualified' THEN 'disqualified'
        WHEN 'sop.lead.reopened' THEN 'reopened'
        WHEN 'sop.lead.moved_back' THEN 'moved_back'
        WHEN 'sop.handover.updated' THEN 'handover_updated'
        WHEN 'sop.pricing_request.created' THEN 'pricing_requested'
        WHEN 'sop.pricing_request.claimed' THEN 'pricing_claimed'
        WHEN 'sop.pricing_request.published' THEN 'pricing_published'
        WHEN 'sop.pricing_request.returned' THEN 'pricing_returned'
        WHEN 'sop.recheck.requested' THEN 'recheck_requested'
        WHEN 'sop.recheck.completed' THEN 'recheck_completed'
        WHEN 'sop.booking.confirmed' THEN 'booking_confirmed'
        WHEN 'sop.lead.stage_changed' THEN
          CASE r.payload->>'to' WHEN 'accepted_pending_recheck' THEN 'customer_accepted'
                                WHEN 'won' THEN 'booking_confirmed'
                                WHEN 'lost' THEN 'lead_lost' ELSE 'stage_changed' END
        ELSE NULL END;
      IF v_action IS NULL THEN CONTINUE; END IF;
      IF r.aggregate_type = 'sop_pricing_request' THEN
        v_pr := r.aggregate_id;
        v_lead := NULLIF(r.payload->>'lead_id','')::uuid;
        IF v_lead IS NULL THEN SELECT lead_id INTO v_lead FROM public.sop_pricing_requests WHERE id = v_pr; END IF;
      ELSE
        v_lead := r.aggregate_id;
        v_pr := NULLIF(r.payload->>'pricing_request_id','')::uuid;
      END IF;
      IF v_lead IS NULL OR NOT EXISTS (SELECT 1 FROM public.sop_leads WHERE id = v_lead) THEN CONTINUE; END IF;
      PERFORM public.sop_history_write(r.organization_id, v_lead, v_action,
        NULLIF(r.payload->>'from','')::public.sop_lead_stage,
        NULLIF(r.payload->>'to','')::public.sop_lead_stage,
        coalesce(r.emitted_by, NULLIF(r.payload->>'by','')::uuid, NULLIF(r.payload->>'assignee','')::uuid),
        r.payload->>'reason', 'backfill:events', true, v_pr, NULLIF(r.payload->>'quote_id','')::uuid,
        NULLIF(r.payload->>'booking_id','')::uuid, r.payload, r.occurred_at, 'evt:' || r.id::text);
    END;
  END LOOP;

  SELECT count(*) INTO n_after FROM public.sop_lead_stage_history
    WHERE p_org IS NULL OR organization_id = p_org;
  RETURN jsonb_build_object('inserted', n_after - n_before, 'total', n_after);
END $$;
REVOKE EXECUTE ON FUNCTION public.sop_backfill_stage_history(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_backfill_stage_history(uuid) TO authenticated;

-- ============ single lead timeline with durations ============
CREATE OR REPLACE FUNCTION public.sop_lead_timeline(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_org uuid; res jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.sop_leads WHERE id = _lead;
  IF v_org IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), v_org) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.occurred_at), '[]'::jsonb) INTO res
  FROM (
    SELECT h.id, h.action, h.from_stage, h.to_stage, h.actor_user_id,
           coalesce(h.actor_name, public.sop_actor_name(h.actor_user_id)) AS actor_name,
           h.reason, h.source, h.is_reconstructed, h.pricing_request_id, h.quote_id, h.booking_id,
           h.metadata, h.occurred_at,
           lead(h.occurred_at) OVER w AS next_at,
           round(extract(epoch FROM (coalesce(lead(h.occurred_at) OVER w, now()) - h.occurred_at)) / 60)::bigint
             AS duration_minutes,
           (lead(h.occurred_at) OVER w IS NULL) AS is_open
    FROM public.sop_lead_stage_history h
    WHERE h.lead_id = _lead
    WINDOW w AS (ORDER BY h.occurred_at)
  ) t;
  RETURN res;
END $$;
REVOKE EXECUTE ON FUNCTION public.sop_lead_timeline(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_lead_timeline(uuid) TO authenticated;

-- ============ management cycle-time report ============
CREATE OR REPLACE FUNCTION public.sop_lead_cycle_report(
  p_org uuid,
  p_from timestamptz DEFAULT now() - interval '90 days',
  p_to timestamptz DEFAULT now(),
  p_department public.sop_department DEFAULT NULL,
  p_employee uuid DEFAULT NULL,
  p_stage public.sop_lead_stage DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_include_legacy boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb; kpis jsonb; emp jsonb; cov jsonb; pol record;
BEGIN
  IF NOT public.user_belongs_to_org(auth.uid(), p_org) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO pol FROM public.sop_org_policies WHERE organization_id = p_org;

  CREATE TEMP TABLE _rep ON COMMIT DROP AS
  WITH base AS (
    SELECT l.* FROM public.sop_leads l
     WHERE l.organization_id = p_org
       AND coalesce(l.arrived_at, l.created_at) BETWEEN p_from AND p_to
       AND (p_include_legacy OR NOT coalesce(l.is_legacy,false))
       AND (p_department IS NULL OR l.owner_department = p_department)
       AND (p_employee IS NULL OR l.current_owner_id = p_employee)
       AND (p_stage IS NULL OR l.stage = p_stage)
       AND (p_source IS NULL OR l.lead_source = p_source)
       AND (p_outcome IS NULL
            OR (p_outcome = 'booked' AND l.stage = 'won')
            OR (p_outcome = 'lost' AND l.stage IN ('lost','cancelled'))
            OR (p_outcome = 'open' AND l.stage NOT IN ('won','lost','cancelled')))
  ), ms AS (
    SELECT h.lead_id,
      min(h.occurred_at) FILTER (WHERE h.action = 'lead_created') AS t_created,
      min(h.occurred_at) FILTER (WHERE h.action = 'cs_first_response') AS t_first_response,
      min(h.occurred_at) FILTER (WHERE h.action = 'intake_completed') AS t_intake,
      min(h.occurred_at) FILTER (WHERE h.action IN ('sales_claimed','sales_assigned')) AS t_claimed,
      min(h.occurred_at) FILTER (WHERE h.action = 'assignment_acknowledged') AS t_ack,
      min(h.occurred_at) FILTER (WHERE h.action = 'pricing_requested') AS t_pricing_req,
      min(h.occurred_at) FILTER (WHERE h.action = 'pricing_claimed') AS t_pricing_claim,
      min(h.occurred_at) FILTER (WHERE h.action IN ('pricing_published','pricing_returned')) AS t_pricing_done,
      min(h.occurred_at) FILTER (WHERE h.action = 'customer_accepted') AS t_accepted,
      min(h.occurred_at) FILTER (WHERE h.action = 'recheck_requested') AS t_recheck_req,
      min(h.occurred_at) FILTER (WHERE h.action = 'recheck_completed') AS t_recheck_done,
      min(h.occurred_at) FILTER (WHERE h.action = 'booking_confirmed') AS t_booked,
      min(h.occurred_at) FILTER (WHERE h.action IN ('lead_lost','disqualified')) AS t_lost,
      count(*) AS events
    FROM public.sop_lead_stage_history h
    JOIN base b ON b.id = h.lead_id
    GROUP BY h.lead_id
  )
  SELECT b.id AS lead_id, b.lead_number, b.contact_name, b.stage, b.owner_department, b.lead_source,
         b.is_legacy, b.current_owner_id, public.sop_actor_name(b.current_owner_id) AS owner_name,
         coalesce(m.t_created, b.arrived_at, b.created_at) AS t_created,
         m.t_first_response, m.t_intake, m.t_claimed, m.t_ack, m.t_pricing_req, m.t_pricing_claim,
         m.t_pricing_done, m.t_accepted, m.t_recheck_req, m.t_recheck_done, m.t_booked, m.t_lost,
         coalesce(m.events, 0) AS events,
         round(extract(epoch FROM (m.t_first_response - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS first_response_minutes,
         round(extract(epoch FROM (m.t_intake - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS intake_minutes,
         round(extract(epoch FROM (m.t_claimed - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS wait_sales_claim_minutes,
         round(extract(epoch FROM (m.t_pricing_req - m.t_claimed))/60) AS sales_handling_minutes,
         round(extract(epoch FROM (m.t_pricing_claim - m.t_pricing_req))/60) AS reservations_queue_minutes,
         round(extract(epoch FROM (m.t_pricing_done - m.t_pricing_req))/60) AS pricing_turnaround_minutes,
         round(extract(epoch FROM (m.t_accepted - m.t_pricing_done))/60) AS decision_minutes,
         round(extract(epoch FROM (m.t_recheck_done - m.t_recheck_req))/60) AS recheck_minutes,
         round(extract(epoch FROM (m.t_booked - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS total_minutes,
         round(extract(epoch FROM (now() - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS age_minutes
  FROM base b LEFT JOIN ms m ON m.lead_id = b.id;

  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.t_created DESC), '[]'::jsonb) INTO res FROM _rep r;

  SELECT jsonb_object_agg(k, v) INTO kpis FROM (
    SELECT k, jsonb_build_object(
      'count', count(x), 'avg', round(avg(x)),
      'median', round(percentile_cont(0.5) WITHIN GROUP (ORDER BY x)::numeric),
      'p90', round(percentile_cont(0.9) WITHIN GROUP (ORDER BY x)::numeric),
      'breached', count(*) FILTER (WHERE sla IS NOT NULL AND x > sla), 'sla', max(sla)) AS v
    FROM (
      SELECT 'first_response' k, first_response_minutes x, pol.first_response_sla_minutes sla FROM _rep
      UNION ALL SELECT 'intake', intake_minutes, NULL FROM _rep
      UNION ALL SELECT 'wait_sales_claim', wait_sales_claim_minutes, pol.assignment_ack_sla_minutes FROM _rep
      UNION ALL SELECT 'sales_handling', sales_handling_minutes, NULL FROM _rep
      UNION ALL SELECT 'reservations_queue', reservations_queue_minutes, NULL FROM _rep
      UNION ALL SELECT 'pricing_turnaround', pricing_turnaround_minutes, pol.quotation_turnaround_sla_minutes FROM _rep
      UNION ALL SELECT 'customer_decision', decision_minutes, NULL FROM _rep
      UNION ALL SELECT 'recheck', recheck_minutes, NULL FROM _rep
      UNION ALL SELECT 'lead_to_booking', total_minutes, NULL FROM _rep
    ) s WHERE x IS NOT NULL GROUP BY k
  ) q;

  SELECT coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) INTO emp FROM (
    SELECT h.actor_user_id, coalesce(h.actor_name, public.sop_actor_name(h.actor_user_id)) AS actor_name,
           h.action, count(*) AS actions,
           round(avg(extract(epoch FROM (h.occurred_at - r.t_created))/60)) AS avg_minutes_from_entry
    FROM public.sop_lead_stage_history h JOIN _rep r ON r.lead_id = h.lead_id
    WHERE h.actor_user_id IS NOT NULL
      AND h.action IN ('sales_claimed','sales_assigned','pricing_claimed','pricing_published',
                       'recheck_completed','cs_first_response','intake_completed','booking_confirmed')
    GROUP BY 1,2,3 ORDER BY 2,3
  ) e;

  SELECT jsonb_build_object(
    'leads', count(*),
    'with_history', count(*) FILTER (WHERE events > 0),
    'coverage_percent', CASE WHEN count(*) = 0 THEN 0
      ELSE round(100.0 * count(*) FILTER (WHERE events > 0) / count(*)) END,
    'missing_created', count(*) FILTER (WHERE t_created IS NULL),
    'missing_claim', count(*) FILTER (WHERE t_claimed IS NULL),
    'missing_pricing', count(*) FILTER (WHERE t_pricing_req IS NOT NULL AND t_pricing_done IS NULL)
  ) INTO cov FROM _rep;

  RETURN jsonb_build_object('leads', res, 'kpis', coalesce(kpis,'{}'::jsonb),
                            'employees', emp, 'coverage', cov);
END $$;
REVOKE EXECUTE ON FUNCTION public.sop_lead_cycle_report(uuid,timestamptz,timestamptz,public.sop_department,uuid,public.sop_lead_stage,text,text,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_lead_cycle_report(uuid,timestamptz,timestamptz,public.sop_department,uuid,public.sop_lead_stage,text,text,boolean) TO authenticated;
