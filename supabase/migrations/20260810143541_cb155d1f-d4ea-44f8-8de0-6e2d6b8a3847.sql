CREATE OR REPLACE FUNCTION public.sop_claim_lead(_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; miss text[]; sla int; ok boolean;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sop_department_members m
     WHERE m.organization_id = l.organization_id AND m.user_id = auth.uid()
       AND m.department = 'sales' AND COALESCE(m.is_available, true)
  ) INTO ok;
  IF NOT ok THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['not_available_sales_member']::text[]));
  END IF;

  IF l.stage NOT IN ('new','qualified','assigned') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_already_in_pipeline']::text[]));
  END IF;

  IF l.current_owner_id IS NOT NULL AND l.current_owner_id <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['already_claimed']::text[]));
  END IF;

  IF l.current_owner_id = auth.uid() AND l.stage = 'assigned' THEN
    RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid(), 'stage', 'assigned', 'idempotent', true);
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
END $function$;

CREATE OR REPLACE FUNCTION public.sop_claim_pricing_request(_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.sop_pricing_requests; ok boolean;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sop_department_members m
     WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid()
       AND m.department = 'reservations' AND COALESCE(m.is_available, true)
  ) INTO ok;
  IF NOT ok THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['not_available_reservations_member']::text[]));
  END IF;

  IF r.assigned_to IS NOT NULL AND r.assigned_to <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['already_claimed']::text[]));
  END IF;

  IF r.assigned_to = auth.uid() THEN
    RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid(), 'idempotent', true);
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
END $function$;

CREATE OR REPLACE FUNCTION public.sop_request_recheck(_lead uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; rid uuid; prev uuid; keep uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT id, assigned_to INTO rid, prev FROM public.sop_pricing_requests
   WHERE lead_id = _lead AND status <> 'cancelled'
   ORDER BY created_at DESC LIMIT 1;
  IF rid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['no_pricing_request']::text[]));
  END IF;

  -- Prefer the reservations member who priced it, when still available; otherwise back to the shared queue.
  SELECT m.user_id INTO keep FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = prev
     AND m.department = 'reservations' AND COALESCE(m.is_available, true);

  UPDATE public.sop_pricing_requests
     SET status = 'recheck', recheck_requested_at = now(),
         recheck_completed_at = NULL, recheck_changed = NULL, recheck_notes = _notes,
         assigned_to = keep, updated_at = now()
   WHERE id = rid;

  UPDATE public.sop_leads SET owner_department = 'reservations', updated_at = now() WHERE id = _lead;

  PERFORM public.emit_event('sop.recheck.requested','sop_lead', _lead, l.organization_id,
    jsonb_build_object('pricing_request_id', rid, 'assigned_to', keep),
    'sop.recheck.req.' || rid::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'pricing_request_id', rid, 'assigned_to', keep);
END $function$;

CREATE OR REPLACE FUNCTION public.sop_return_to_sales(_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Ownership goes back to the sales consultant who requested the pricing.
  SELECT m.user_id INTO target FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = r.requested_by AND m.department = 'sales';
  target := COALESCE(target, l.current_owner_id, r.requested_by);

  UPDATE public.sop_leads
     SET owner_department = 'sales'::public.sop_department,
         current_owner_id = target,
         updated_at = now()
   WHERE id = l.id;

  PERFORM public.emit_event('sop.pricing_request.returned','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('lead_id', l.id, 'owner', target),
    'sop.pr.return.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'owner', target);
END $function$;

REVOKE EXECUTE ON FUNCTION public.sop_claim_lead(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_claim_pricing_request(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_request_recheck(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_return_to_sales(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_claim_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_claim_pricing_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_request_recheck(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_return_to_sales(uuid) TO authenticated;