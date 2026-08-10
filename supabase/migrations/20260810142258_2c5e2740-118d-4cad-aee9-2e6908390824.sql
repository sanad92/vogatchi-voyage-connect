-- 1) Move a lead backwards to an earlier stage with a mandatory reason
CREATE OR REPLACE FUNCTION public.sop_move_back(_lead uuid, _to public.sop_lead_stage, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l public.sop_leads;
  ord text[] := ARRAY['new','qualified','assigned','pricing_requested','quoted','follow_up',
                      'accepted_pending_recheck','rechecked','payment_pending','won'];
  cur_i int; to_i int;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(_reason,'') = '' THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reason_required']::text[]));
  END IF;

  cur_i := array_position(ord, l.stage::text);
  to_i  := array_position(ord, _to::text);
  IF to_i IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['invalid_target_stage']::text[]));
  END IF;
  IF cur_i IS NOT NULL AND to_i >= cur_i THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['not_a_backward_move']::text[]));
  END IF;

  UPDATE public.sop_leads
     SET stage = _to,
         owner_department = CASE
            WHEN _to IN ('new','qualified') THEN 'customer_service'::public.sop_department
            WHEN _to = 'pricing_requested' THEN 'reservations'::public.sop_department
            ELSE 'sales'::public.sop_department END,
         lost_reason = NULL,
         updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.moved_back','sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', l.stage, 'to', _to, 'reason', _reason, 'by', auth.uid()),
    'sop.lead.back.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', _to);
END $$;

-- 2) Mark a lead as unqualified (kept as a lost record with an explicit reason)
CREATE OR REPLACE FUNCTION public.sop_disqualify(_lead uuid, _reason text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE l public.sop_leads; full_reason text;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF coalesce(_reason,'') = '' THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reason_required']::text[]));
  END IF;
  IF l.stage = 'won' THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_already_won']::text[]));
  END IF;

  full_reason := 'غير مؤهل — ' || _reason || CASE WHEN coalesce(_note,'') <> '' THEN ' — ' || _note ELSE '' END;

  UPDATE public.sop_leads
     SET stage = 'lost', lost_reason = full_reason, updated_at = now()
   WHERE id = _lead;

  UPDATE public.sop_lead_assignments SET is_current = false, released_at = now()
   WHERE lead_id = _lead AND is_current;

  IF l.current_owner_id IS NOT NULL THEN
    UPDATE public.sop_department_members
       SET active_load = GREATEST(active_load - 1, 0)
     WHERE organization_id = l.organization_id AND user_id = l.current_owner_id;
  END IF;

  PERFORM public.emit_event('sop.lead.disqualified','sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', l.stage, 'reason', full_reason, 'by', auth.uid()),
    'sop.lead.disq.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', 'lost');
END $$;

-- 3) Reopen a lost/unqualified lead back into intake
CREATE OR REPLACE FUNCTION public.sop_reopen_lead(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE l public.sop_leads;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF l.stage NOT IN ('lost','cancelled') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_not_closed']::text[]));
  END IF;

  UPDATE public.sop_leads
     SET stage = 'qualified', owner_department = 'customer_service'::public.sop_department,
         lost_reason = NULL, updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.reopened','sop_lead', _lead, l.organization_id,
    jsonb_build_object('by', auth.uid()),
    'sop.lead.reopen.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', 'qualified');
END $$;

-- 4) Sales member claims a lead themselves (self-service handover)
CREATE OR REPLACE FUNCTION public.sop_claim_lead(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE l public.sop_leads; miss text[]; sla int;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF l.stage NOT IN ('new','qualified','assigned') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_already_in_pipeline']::text[]));
  END IF;

  miss := public.sop_intake_missing(l);
  IF array_length(miss,1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['intake_incomplete']::text[]),
      'missing_fields', to_jsonb(miss));
  END IF;

  SELECT COALESCE(assignment_ack_sla_minutes, 30) INTO sla
    FROM public.sop_org_policies WHERE organization_id = l.organization_id;
  sla := COALESCE(sla, 30);

  UPDATE public.sop_lead_assignments SET is_current = false, released_at = now()
   WHERE lead_id = _lead AND is_current;

  INSERT INTO public.sop_lead_assignments (organization_id, lead_id, assignee_id, assigned_by, method,
    previous_assignee_id, ack_deadline_at, acknowledged_at)
  VALUES (l.organization_id, _lead, auth.uid(), auth.uid(), 'self_claim',
    l.current_owner_id, now() + make_interval(mins => sla), now());

  UPDATE public.sop_department_members
     SET last_assigned_at = now(), active_load = active_load + 1
   WHERE organization_id = l.organization_id AND user_id = auth.uid() AND department = 'sales';

  UPDATE public.sop_leads
     SET current_owner_id = auth.uid(),
         stage = 'assigned',
         owner_department = 'sales'::public.sop_department,
         updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.claimed','sop_lead', _lead, l.organization_id,
    jsonb_build_object('assignee', auth.uid(), 'method', 'self_claim'),
    'sop.lead.claim.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid(), 'stage', 'assigned');
END $$;

-- 5) Reservations member claims a pricing request themselves
CREATE OR REPLACE FUNCTION public.sop_claim_pricing_request(_request uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.sop_pricing_requests;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.assigned_to IS NOT NULL AND r.assigned_to <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['already_claimed']::text[]));
  END IF;

  UPDATE public.sop_pricing_requests
     SET assigned_to = auth.uid(),
         status = CASE WHEN r.status = 'requested' THEN 'in_progress'::public.sop_pricing_status ELSE r.status END,
         updated_at = now()
   WHERE id = _request;

  PERFORM public.emit_event('sop.pricing_request.claimed','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('assignee', auth.uid(), 'lead_id', r.lead_id),
    'sop.pr.claim.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid());
END $$;

-- 6) Reservations sends the pricing back to Sales (ownership returns to the sales owner)
CREATE OR REPLACE FUNCTION public.sop_return_to_sales(_request uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.sop_pricing_requests; l public.sop_leads; target uuid;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.status NOT IN ('quoted','requoted') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['pricing_not_published']::text[]));
  END IF;

  SELECT * INTO l FROM public.sop_leads WHERE id = r.lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  target := COALESCE(l.current_owner_id, r.requested_by);

  UPDATE public.sop_leads
     SET owner_department = 'sales'::public.sop_department,
         current_owner_id = target,
         updated_at = now()
   WHERE id = l.id;

  PERFORM public.emit_event('sop.pricing_request.returned','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('lead_id', l.id, 'owner', target),
    'sop.pr.return.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'owner', target);
END $$;

REVOKE ALL ON FUNCTION public.sop_move_back(uuid, public.sop_lead_stage, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sop_disqualify(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sop_reopen_lead(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sop_claim_lead(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sop_claim_pricing_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sop_return_to_sales(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sop_move_back(uuid, public.sop_lead_stage, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_disqualify(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_reopen_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_claim_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_claim_pricing_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_return_to_sales(uuid) TO authenticated;