ALTER TABLE public.sop_org_policies
  ADD COLUMN IF NOT EXISTS require_management_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_required_above_amount numeric;

-- 1) Policy-driven management approval on payment_pending / won
CREATE OR REPLACE FUNCTION public.sop_validate_transition(_lead uuid, _to sop_lead_stage)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; missing text[] := '{}'; viol text[] := '{}';
        hs jsonb; cs jsonb; pr public.sop_pricing_requests; asg public.sop_lead_assignments;
        need_appr boolean; thr numeric; req_appr boolean;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_not_found'])); END IF;

  IF NOT (_to = ANY (public.sop_allowed_next(l.stage))) THEN
    viol := viol || format('transition_not_allowed:%s->%s', l.stage, _to);
  END IF;

  IF _to = 'lost' AND coalesce(l.lost_reason,'') = '' THEN missing := missing || 'lost_reason'; END IF;

  IF _to = 'qualified' THEN
    missing := missing || public.sop_intake_missing(l);
  END IF;

  IF _to = 'assigned' THEN
    hs := public.sop_handover_status(l.id, 'cs_to_sales');
    IF NOT (hs->>'is_complete')::boolean THEN
      viol := viol || 'handover_cs_to_sales_incomplete';
      missing := missing || ARRAY(SELECT jsonb_array_elements_text(hs->'missing'));
    END IF;
    SELECT * INTO asg FROM public.sop_lead_assignments WHERE lead_id = l.id AND is_current LIMIT 1;
    IF NOT FOUND THEN viol := viol || 'no_sales_assignment'; END IF;
  END IF;

  IF _to = 'pricing_requested' THEN
    missing := missing || public.sop_brief_missing(l);
    hs := public.sop_handover_status(l.id, 'sales_to_reservations');
    IF NOT (hs->>'is_complete')::boolean THEN
      viol := viol || 'handover_sales_to_reservations_incomplete';
      missing := missing || ARRAY(SELECT jsonb_array_elements_text(hs->'missing'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_requests r WHERE r.lead_id = l.id AND r.status <> 'cancelled')
      THEN viol := viol || 'no_pricing_request'; END IF;
  END IF;

  IF _to = 'quoted' THEN
    SELECT * INTO pr FROM public.sop_pricing_requests WHERE lead_id = l.id AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN viol := viol || 'no_pricing_request';
    ELSE
      IF pr.status NOT IN ('quoted','requoted') THEN viol := viol || 'pricing_not_completed'; END IF;
      IF (SELECT count(*) FROM public.sop_pricing_options o WHERE o.pricing_request_id = pr.id) = 0
        THEN viol := viol || 'no_pricing_options'; END IF;
      IF (SELECT count(*) FROM public.sop_pricing_options o WHERE o.pricing_request_id = pr.id) > 3
        THEN viol := viol || 'more_than_three_options'; END IF;
      IF pr.price_valid_until IS NULL THEN viol := viol || 'price_validity_required'; END IF;
    END IF;
    IF l.quote_id IS NULL THEN viol := viol || 'no_quote_linked'; END IF;
    hs := public.sop_handover_status(l.id, 'reservations_to_sales');
    IF NOT (hs->>'is_complete')::boolean THEN
      viol := viol || 'handover_reservations_to_sales_incomplete';
      missing := missing || ARRAY(SELECT jsonb_array_elements_text(hs->'missing'));
    END IF;
  END IF;

  IF _to = 'accepted_pending_recheck' AND l.quote_id IS NULL THEN viol := viol || 'no_quote_linked'; END IF;

  IF _to = 'rechecked' THEN
    SELECT * INTO pr FROM public.sop_pricing_requests WHERE lead_id = l.id AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND OR pr.recheck_completed_at IS NULL THEN viol := viol || 'recheck_not_completed'; END IF;
    IF coalesce(pr.recheck_changed, false) OR l.requote_required THEN viol := viol || 'requote_required'; END IF;
  END IF;

  IF _to IN ('payment_pending','won') THEN
    SELECT COALESCE(require_management_approval, true), approval_required_above_amount
      INTO req_appr, thr FROM public.sop_org_policies WHERE organization_id = l.organization_id;
    req_appr := COALESCE(req_appr, true);
    cs := public.sop_collection_status(l.id);
    need_appr := req_appr
      AND (thr IS NULL OR COALESCE((cs->>'due')::numeric, 0) > thr);
    -- credit / exception collection policies always need documented approval
    IF COALESCE((cs->>'requires_approval')::boolean, false) THEN need_appr := true; END IF;

    IF need_appr AND NOT EXISTS (SELECT 1 FROM public.sop_approvals a WHERE a.lead_id = l.id
        AND a.approval_type = 'booking_confirmation' AND a.status = 'approved')
      THEN viol := viol || 'management_booking_approval_missing'; END IF;
  END IF;

  IF _to = 'payment_pending' THEN
    IF l.requote_required THEN viol := viol || 'requote_required'; END IF;
  END IF;

  IF _to = 'won' THEN
    IF NOT coalesce((cs->>'satisfied')::boolean, false) THEN viol := viol || 'collection_condition_not_met'; END IF;
    IF l.booking_id IS NULL THEN viol := viol || 'no_booking_created'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
    'from', l.stage, 'to', _to,
    'missing_fields', to_jsonb(COALESCE(missing,'{}')),
    'violations', to_jsonb(COALESCE(viol,'{}')),
    'collection', CASE WHEN _to IN ('payment_pending','won') THEN public.sop_collection_status(l.id) ELSE NULL END);
END $function$;

-- 2) Price validity mandatory when publishing pricing
CREATE OR REPLACE FUNCTION public.sop_publish_pricing(_request uuid, _valid_until date DEFAULT NULL::date, _recommendation text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.sop_pricing_requests; l public.sop_leads; n int; viol text[] := '{}';
        qid uuid; o public.sop_pricing_options; sel public.sop_pricing_options; qnum text; vu date;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND OR NOT public.user_belongs_to_org(r.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_has_department(r.organization_id, auth.uid(), 'reservations') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reservations_only'])); END IF;

  vu := COALESCE(_valid_until, r.price_valid_until);

  SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = _request;
  IF n = 0 THEN viol := viol || 'no_options'; END IF;
  IF n > 3 THEN viol := viol || 'more_than_three_options'; END IF;
  IF EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request
             AND (net_cost IS NULL OR net_cost <= 0 OR selling_price IS NULL OR selling_price <= 0
                  OR coalesce(cancellation_policy,'') = ''))
    THEN viol := viol || 'options_missing_net_cost_or_policy'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request AND is_recommended)
    THEN viol := viol || 'no_recommended_option'; END IF;
  IF vu IS NULL THEN viol := viol || 'price_validity_required'; END IF;
  IF vu IS NOT NULL AND vu < current_date THEN viol := viol || 'price_validity_expired'; END IF;
  IF array_length(viol,1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(viol)); END IF;

  SELECT * INTO l FROM public.sop_leads WHERE id = r.lead_id;
  SELECT * INTO sel FROM public.sop_pricing_options WHERE pricing_request_id = _request
    ORDER BY is_selected DESC, is_recommended DESC, option_index ASC LIMIT 1;

  qid := r.quote_id;
  IF qid IS NULL THEN
    qnum := 'Q-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
    INSERT INTO public.quotes (organization_id, quote_number, customer_id, customer_name, destination,
      travel_date, return_date, number_of_travelers, status, valid_until, notes,
      subtotal, total_amount, total_cost, total_profit, created_by, assigned_employee_id)
    VALUES (r.organization_id, qnum, l.customer_id, l.contact_name, COALESCE(l.destination, l.city),
      l.check_in, l.check_out, COALESCE(l.adults,0) + COALESCE(l.children_count,0), 'sent',
      vu, _recommendation,
      sel.selling_price, sel.selling_price, sel.net_cost, sel.selling_price - sel.net_cost,
      auth.uid(), l.current_owner_id)
    RETURNING id INTO qid;
  ELSE
    UPDATE public.quotes SET subtotal = sel.selling_price, total_amount = sel.selling_price,
      total_cost = sel.net_cost, total_profit = sel.selling_price - sel.net_cost,
      valid_until = vu, notes = COALESCE(_recommendation, notes),
      status = 'sent', updated_at = now()
     WHERE id = qid;
    DELETE FROM public.quote_items WHERE quote_id = qid;
  END IF;

  FOR o IN SELECT * FROM public.sop_pricing_options WHERE pricing_request_id = _request ORDER BY option_index LOOP
    INSERT INTO public.quote_items (organization_id, quote_id, item_type, description, quantity,
      cost_price, selling_price, total_cost, total_selling, supplier_id, sort_order, details)
    VALUES (r.organization_id, qid, 'option', COALESCE(o.product_name, o.supplier_name, 'Option ' || o.option_index),
      1, o.net_cost, o.selling_price, o.net_cost, o.selling_price, o.supplier_id, o.option_index,
      jsonb_build_object('cancellation_policy', o.cancellation_policy, 'payment_deadline', o.payment_deadline,
        'cancellation_deadline', o.cancellation_deadline, 'release_deadline', o.release_deadline,
        'is_recommended', o.is_recommended, 'supplier_name', o.supplier_name));
  END LOOP;

  UPDATE public.sop_pricing_requests
     SET status = CASE WHEN status IN ('quoted','requoted','recheck') THEN 'requoted' ELSE 'quoted' END,
         quote_id = qid, quoted_at = now(), price_valid_until = vu,
         recommendation = COALESCE(_recommendation, recommendation)
   WHERE id = _request;

  UPDATE public.sop_leads SET quote_id = qid, requote_required = false, owner_department = 'sales'
   WHERE id = r.lead_id;

  PERFORM public.emit_event('sop.pricing_request.published','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('quote_id', qid, 'options', n),
    'sop.pr.published.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'quote_id', qid, 'options', n);
END $function$;

-- 3) Reservations -> CS handover requires a real voucher
CREATE OR REPLACE FUNCTION public.sop_complete_handover(_lead uuid, _type sop_handover_type, _checklist jsonb, _to_user uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; missing text[] := '{}'; viol text[] := '{}'; k text; hid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH k IN ARRAY public.sop_handover_checklist_keys(_type) LOOP
    IF coalesce((_checklist ->> k)::boolean, false) = false THEN missing := missing || k; END IF;
  END LOOP;

  IF _type = 'reservations_to_cs' THEN
    IF l.booking_id IS NULL THEN
      viol := viol || 'no_booking';
    ELSIF NOT EXISTS (SELECT 1 FROM public.booking_vouchers v WHERE v.booking_id = l.booking_id) THEN
      viol := viol || 'voucher_not_issued';
    END IF;
  END IF;

  SELECT id INTO hid FROM public.sop_handovers WHERE lead_id = _lead AND handover_type = _type
   ORDER BY created_at DESC LIMIT 1;
  IF hid IS NULL THEN
    INSERT INTO public.sop_handovers (organization_id, handover_type, lead_id, booking_id, from_user_id,
      to_user_id, checklist, missing_items, is_complete, accepted_at, notes)
    VALUES (l.organization_id, _type, _lead, l.booking_id, auth.uid(), _to_user, _checklist,
      missing || viol,
      array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
      CASE WHEN array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL THEN now() END, _notes)
    RETURNING id INTO hid;
  ELSE
    UPDATE public.sop_handovers SET checklist = _checklist, missing_items = missing || viol,
      is_complete = array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
      to_user_id = COALESCE(_to_user, to_user_id),
      accepted_at = CASE WHEN array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL THEN now() ELSE NULL END,
      notes = COALESCE(_notes, notes), booking_id = COALESCE(l.booking_id, booking_id)
     WHERE id = hid;
  END IF;

  PERFORM public.emit_event('sop.handover.updated','sop_lead', _lead, l.organization_id,
    jsonb_build_object('type', _type,
      'complete', array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
      'missing', missing, 'violations', viol),
    'sop.handover.' || hid::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
    'id', hid,
    'missing_fields', to_jsonb(COALESCE(missing,'{}')),
    'violations', to_jsonb(COALESCE(viol,'{}')));
END $function$;

-- 4) Fair, validated re-assignment
CREATE OR REPLACE FUNCTION public.sop_reassign_lead(_lead uuid, _assignee uuid, _reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; prev uuid; sla int;
BEGIN
  IF coalesce(_reason,'') = '' THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reassignment_reason_required'])); END IF;
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _assignee IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['assignee_required'])); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sop_department_members d
                 WHERE d.organization_id = l.organization_id AND d.user_id = _assignee
                   AND d.department = 'sales' AND d.is_available) THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['assignee_not_available_sales'])); END IF;

  SELECT assignee_id INTO prev FROM public.sop_lead_assignments WHERE lead_id = _lead AND is_current LIMIT 1;
  IF prev = _assignee THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['assignee_unchanged'])); END IF;

  SELECT COALESCE(assignment_ack_sla_minutes,30) INTO sla FROM public.sop_org_policies WHERE organization_id = l.organization_id;
  sla := COALESCE(sla,30);
  UPDATE public.sop_lead_assignments SET is_current = false, released_at = now() WHERE lead_id = _lead AND is_current;
  INSERT INTO public.sop_lead_assignments (organization_id, lead_id, assignee_id, assigned_by, method,
    reassignment_reason, previous_assignee_id, ack_deadline_at)
  VALUES (l.organization_id, _lead, _assignee, auth.uid(), 'reassignment', _reason, prev, now() + make_interval(mins => sla));

  -- keep round-robin fairness counters accurate
  IF prev IS NOT NULL THEN
    UPDATE public.sop_department_members SET active_load = GREATEST(active_load - 1, 0)
     WHERE organization_id = l.organization_id AND user_id = prev AND department = 'sales';
  END IF;
  UPDATE public.sop_department_members SET last_assigned_at = now(), active_load = active_load + 1
   WHERE organization_id = l.organization_id AND user_id = _assignee AND department = 'sales';

  UPDATE public.sop_leads SET current_owner_id = _assignee WHERE id = _lead;
  PERFORM public.emit_event('sop.lead.reassigned','sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', prev, 'to', _assignee, 'reason', _reason),
    'sop.lead.reassigned.' || _lead::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true, 'assignee', _assignee, 'previous', prev, 'ack_sla_minutes', sla);
END $function$;