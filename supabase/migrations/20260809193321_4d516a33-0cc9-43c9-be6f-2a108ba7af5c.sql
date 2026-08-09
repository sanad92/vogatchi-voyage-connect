
-- ========= completeness helpers =========
CREATE OR REPLACE FUNCTION public.sop_intake_missing(l public.sop_leads)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[] := '{}';
BEGIN
  IF coalesce(l.contact_name,'') = '' THEN m := m || 'contact_name'; END IF;
  IF coalesce(l.contact_phone,'') = '' AND coalesce(l.contact_email,'') = '' THEN m := m || 'contact_phone_or_email'; END IF;
  IF coalesce(l.destination,'') = '' AND coalesce(l.city,'') = '' THEN m := m || 'destination_or_city'; END IF;
  IF l.check_in IS NULL AND coalesce(l.approx_dates,'') = '' THEN m := m || 'dates_or_approx_dates'; END IF;
  IF coalesce(l.adults,0) < 1 THEN m := m || 'adults'; END IF;
  IF coalesce(l.children_count,0) > 0 AND jsonb_array_length(coalesce(l.children_ages,'[]'::jsonb)) < l.children_count
    THEN m := m || 'children_ages'; END IF;
  IF coalesce(l.service_type,'') = 'hotel' AND coalesce(l.rooms,0) < 1 THEN m := m || 'rooms'; END IF;
  IF coalesce(l.budget_level,'') = '' AND l.budget_amount IS NULL THEN m := m || 'budget_or_service_level'; END IF;
  IF coalesce(l.priorities,'') = '' THEN m := m || 'priorities'; END IF;
  IF coalesce(l.lead_source,'') = '' THEN m := m || 'lead_source'; END IF;
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public.sop_brief_missing(l public.sop_leads)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[] := public.sop_intake_missing(l);
BEGIN
  IF coalesce(l.nationality,'') = '' AND coalesce(l.market,'') = '' THEN m := m || 'nationality_or_market'; END IF;
  IF coalesce(l.occupancy,'') = '' AND coalesce(l.rooms,0) < 1 THEN m := m || 'rooms_or_occupancy'; END IF;
  IF l.check_in IS NULL AND coalesce(l.approx_dates,'') = '' THEN m := m || 'dates'; END IF;
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public.sop_handover_checklist_keys(_t public.sop_handover_type)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _t
    WHEN 'cs_to_sales' THEN ARRAY['intake_complete','contact_verified','priorities_captured','source_captured']
    WHEN 'sales_to_reservations' THEN ARRAY['brief_complete','budget_confirmed','special_requests_listed','dates_confirmed']
    WHEN 'reservations_to_sales' THEN ARRAY['options_provided','policies_documented','price_validity_set','recommendation_given']
    WHEN 'reservations_to_cs' THEN ARRAY['voucher_attached','guest_names','dates_and_service','room_and_meals',
      'special_requests_status','transfers_meeting_points','supplier_emergency_contact','outstanding_balance']
  END;
$$;

CREATE OR REPLACE FUNCTION public.sop_handover_status(_lead uuid, _t public.sop_handover_type)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE h public.sop_handovers; missing text[] := '{}'; k text;
BEGIN
  SELECT * INTO h FROM public.sop_handovers WHERE lead_id = _lead AND handover_type = _t
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false, 'is_complete', false,
      'missing', to_jsonb(public.sop_handover_checklist_keys(_t)));
  END IF;
  FOREACH k IN ARRAY public.sop_handover_checklist_keys(_t) LOOP
    IF coalesce((h.checklist ->> k)::boolean, false) = false THEN missing := missing || k; END IF;
  END LOOP;
  RETURN jsonb_build_object('exists', true, 'id', h.id,
    'is_complete', array_length(missing,1) IS NULL, 'missing', to_jsonb(missing));
END $$;

-- ========= collection policy =========
CREATE OR REPLACE FUNCTION public.sop_collection_status(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; due numeric := 0; paid numeric := 0; req numeric := 0;
        pol text; dep numeric; has_appr boolean := false;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','lead_not_found'); END IF;

  SELECT COALESCE(b.selling_price, 0) INTO due FROM public.bookings b WHERE b.id = l.booking_id;
  IF COALESCE(due,0) = 0 THEN
    SELECT COALESCE(q.total_amount,0) INTO due FROM public.quotes q WHERE q.id = l.quote_id;
  END IF;
  due := COALESCE(due, 0);

  SELECT COALESCE(SUM(p.amount),0) INTO paid FROM public.customer_payments p
   WHERE p.status <> 'cancelled'
     AND (p.booking_id = l.booking_id
          OR p.invoice_id IN (SELECT i.id FROM public.invoices i
                              WHERE i.booking_id = l.booking_id OR i.quote_id = l.quote_id));

  pol := COALESCE((SELECT b.payment_policy FROM public.bookings b WHERE b.id = l.booking_id), l.payment_policy, 'full');
  dep := COALESCE((SELECT b.deposit_percent FROM public.bookings b WHERE b.id = l.booking_id),
                  l.deposit_percent,
                  (SELECT default_deposit_percent FROM public.sop_org_policies WHERE organization_id = l.organization_id),
                  30);

  SELECT EXISTS (SELECT 1 FROM public.sop_approvals a
                 WHERE a.lead_id = l.id AND a.status = 'approved'
                   AND a.approval_type IN ('booking_confirmation','free_service','discount'))
    INTO has_appr;

  req := CASE pol
    WHEN 'full' THEN due
    WHEN 'deposit' THEN round(due * dep / 100.0, 2)
    WHEN 'credit' THEN 0
    WHEN 'exception' THEN 0
    ELSE due END;

  RETURN jsonb_build_object(
    'policy', pol, 'deposit_percent', dep, 'due', due, 'paid', paid, 'required', req,
    'requires_approval', pol IN ('credit','exception'),
    'approval_granted', has_appr,
    'satisfied', (paid + 0.01 >= req) AND (pol NOT IN ('credit','exception') OR has_appr));
END $$;

-- ========= stage mapping =========
CREATE OR REPLACE FUNCTION public.sop_stage_to_booking_stage(_s public.sop_lead_stage)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _s
    WHEN 'new' THEN 'lead' WHEN 'qualified' THEN 'qualified' WHEN 'assigned' THEN 'qualified'
    WHEN 'pricing_requested' THEN 'qualified' WHEN 'quoted' THEN 'quoted' WHEN 'follow_up' THEN 'quoted'
    WHEN 'accepted_pending_recheck' THEN 'quoted' WHEN 'rechecked' THEN 'quoted'
    WHEN 'payment_pending' THEN 'confirmed' WHEN 'won' THEN 'paid'
    WHEN 'lost' THEN 'cancelled' WHEN 'cancelled' THEN 'cancelled' END;
$$;

CREATE OR REPLACE FUNCTION public.sop_allowed_next(_s public.sop_lead_stage)
RETURNS public.sop_lead_stage[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _s
    WHEN 'new' THEN ARRAY['qualified','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'qualified' THEN ARRAY['assigned','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'assigned' THEN ARRAY['pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'pricing_requested' THEN ARRAY['quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'quoted' THEN ARRAY['follow_up','accepted_pending_recheck','pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'follow_up' THEN ARRAY['accepted_pending_recheck','quoted','pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'accepted_pending_recheck' THEN ARRAY['rechecked','quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'rechecked' THEN ARRAY['payment_pending','quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'payment_pending' THEN ARRAY['won','quoted','lost','cancelled']::public.sop_lead_stage[]
    ELSE ARRAY[]::public.sop_lead_stage[] END;
$$;

-- ========= validation =========
CREATE OR REPLACE FUNCTION public.sop_validate_transition(_lead uuid, _to public.sop_lead_stage)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; missing text[] := '{}'; viol text[] := '{}';
        hs jsonb; cs jsonb; pr public.sop_pricing_requests; asg public.sop_lead_assignments;
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

  IF _to = 'payment_pending' THEN
    IF l.requote_required THEN viol := viol || 'requote_required'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sop_approvals a WHERE a.lead_id = l.id
        AND a.approval_type = 'booking_confirmation' AND a.status = 'approved')
      THEN viol := viol || 'management_booking_approval_missing'; END IF;
  END IF;

  IF _to = 'won' THEN
    cs := public.sop_collection_status(l.id);
    IF NOT coalesce((cs->>'satisfied')::boolean, false) THEN viol := viol || 'collection_condition_not_met'; END IF;
    IF l.booking_id IS NULL THEN viol := viol || 'no_booking_created'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sop_approvals a WHERE a.lead_id = l.id
        AND a.approval_type = 'booking_confirmation' AND a.status = 'approved')
      THEN viol := viol || 'management_booking_approval_missing'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
    'from', l.stage, 'to', _to,
    'missing_fields', to_jsonb(COALESCE(missing,'{}')),
    'violations', to_jsonb(COALESCE(viol,'{}')),
    'collection', CASE WHEN _to IN ('payment_pending','won') THEN public.sop_collection_status(l.id) ELSE NULL END);
END $$;

-- ========= advance =========
CREATE OR REPLACE FUNCTION public.sop_advance_lead(_lead uuid, _to public.sop_lead_stage, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; v jsonb; bstage text;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _to = 'lost' AND coalesce(_reason,'') <> '' THEN
    UPDATE public.sop_leads SET lost_reason = _reason WHERE id = _lead;
    SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  END IF;

  v := public.sop_validate_transition(_lead, _to);
  IF NOT (v->>'allowed')::boolean THEN RETURN v; END IF;

  UPDATE public.sop_leads
     SET stage = _to,
         owner_department = CASE
            WHEN _to IN ('new','qualified') THEN 'customer_service'::public.sop_department
            WHEN _to = 'pricing_requested' THEN 'reservations'::public.sop_department
            WHEN _to IN ('assigned','quoted','follow_up','accepted_pending_recheck','rechecked','payment_pending') THEN 'sales'::public.sop_department
            WHEN _to = 'won' THEN 'operations'::public.sop_department
            ELSE owner_department END
   WHERE id = _lead;

  bstage := public.sop_stage_to_booking_stage(_to);
  IF l.booking_id IS NOT NULL AND bstage IS NOT NULL THEN
    BEGIN
      PERFORM public.advance_workflow(l.booking_id, bstage, coalesce(_reason,'SOP stage sync'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  PERFORM public.emit_event('sop.lead.stage_changed', 'sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', l.stage, 'to', _to, 'reason', _reason, 'booking_id', l.booking_id,
                       'is_legacy', l.is_legacy),
    'sop.lead.stage.' || _lead::text || '.' || _to::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', _to);
END $$;

-- ========= round robin =========
CREATE OR REPLACE FUNCTION public.sop_assign_lead(_lead uuid, _assignee uuid DEFAULT NULL, _exception_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; target uuid; sla int; meth text := 'round_robin';
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF array_length(public.sop_intake_missing(l),1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['intake_incomplete']),
      'missing_fields', to_jsonb(public.sop_intake_missing(l)));
  END IF;

  IF _assignee IS NOT NULL THEN
    IF coalesce(_exception_reason,'') = '' THEN
      RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['exception_reason_required']));
    END IF;
    target := _assignee; meth := 'exception';
  ELSE
    SELECT d.user_id INTO target FROM public.sop_department_members d
     WHERE d.organization_id = l.organization_id AND d.department = 'sales' AND d.is_available
     ORDER BY d.last_assigned_at NULLS FIRST, d.active_load ASC LIMIT 1;
    IF target IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['no_available_sales_member']));
    END IF;
  END IF;

  SELECT COALESCE(assignment_ack_sla_minutes, 30) INTO sla FROM public.sop_org_policies WHERE organization_id = l.organization_id;
  sla := COALESCE(sla, 30);

  UPDATE public.sop_lead_assignments SET is_current = false, released_at = now()
   WHERE lead_id = _lead AND is_current;

  INSERT INTO public.sop_lead_assignments (organization_id, lead_id, assignee_id, assigned_by, method,
    exception_reason, ack_deadline_at)
  VALUES (l.organization_id, _lead, target, auth.uid(), meth, _exception_reason, now() + make_interval(mins => sla));

  UPDATE public.sop_department_members SET last_assigned_at = now(), active_load = active_load + 1
   WHERE organization_id = l.organization_id AND user_id = target AND department = 'sales';

  UPDATE public.sop_leads SET current_owner_id = target WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.assigned','sop_lead', _lead, l.organization_id,
    jsonb_build_object('assignee', target, 'method', meth, 'reason', _exception_reason),
    'sop.lead.assigned.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'assignee', target, 'method', meth, 'ack_sla_minutes', sla);
END $$;

CREATE OR REPLACE FUNCTION public.sop_acknowledge_assignment(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid;
BEGIN
  SELECT organization_id INTO org FROM public.sop_leads WHERE id = _lead;
  IF org IS NULL OR NOT public.user_belongs_to_org(org, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.sop_lead_assignments SET acknowledged_at = now()
   WHERE lead_id = _lead AND is_current AND acknowledged_at IS NULL;
  PERFORM public.emit_event('sop.lead.assignment_acknowledged','sop_lead', _lead, org,
    jsonb_build_object('by', auth.uid()),
    'sop.lead.ack.' || _lead::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true);
END $$;

CREATE OR REPLACE FUNCTION public.sop_reassign_lead(_lead uuid, _assignee uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; prev uuid; sla int;
BEGIN
  IF coalesce(_reason,'') = '' THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reassignment_reason_required'])); END IF;
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT assignee_id INTO prev FROM public.sop_lead_assignments WHERE lead_id = _lead AND is_current LIMIT 1;
  SELECT COALESCE(assignment_ack_sla_minutes,30) INTO sla FROM public.sop_org_policies WHERE organization_id = l.organization_id;
  sla := COALESCE(sla,30);
  UPDATE public.sop_lead_assignments SET is_current = false, released_at = now() WHERE lead_id = _lead AND is_current;
  INSERT INTO public.sop_lead_assignments (organization_id, lead_id, assignee_id, assigned_by, method,
    reassignment_reason, previous_assignee_id, ack_deadline_at)
  VALUES (l.organization_id, _lead, _assignee, auth.uid(), 'reassignment', _reason, prev, now() + make_interval(mins => sla));
  UPDATE public.sop_leads SET current_owner_id = _assignee WHERE id = _lead;
  PERFORM public.emit_event('sop.lead.reassigned','sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', prev, 'to', _assignee, 'reason', _reason),
    'sop.lead.reassigned.' || _lead::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true, 'assignee', _assignee);
END $$;

-- ========= handovers =========
CREATE OR REPLACE FUNCTION public.sop_complete_handover(_lead uuid, _type public.sop_handover_type,
  _checklist jsonb, _to_user uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; missing text[] := '{}'; k text; hid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH k IN ARRAY public.sop_handover_checklist_keys(_type) LOOP
    IF coalesce((_checklist ->> k)::boolean, false) = false THEN missing := missing || k; END IF;
  END LOOP;

  SELECT id INTO hid FROM public.sop_handovers WHERE lead_id = _lead AND handover_type = _type
   ORDER BY created_at DESC LIMIT 1;
  IF hid IS NULL THEN
    INSERT INTO public.sop_handovers (organization_id, handover_type, lead_id, booking_id, from_user_id,
      to_user_id, checklist, missing_items, is_complete, accepted_at, notes)
    VALUES (l.organization_id, _type, _lead, l.booking_id, auth.uid(), _to_user, _checklist, missing,
      array_length(missing,1) IS NULL, CASE WHEN array_length(missing,1) IS NULL THEN now() END, _notes)
    RETURNING id INTO hid;
  ELSE
    UPDATE public.sop_handovers SET checklist = _checklist, missing_items = missing,
      is_complete = array_length(missing,1) IS NULL, to_user_id = COALESCE(_to_user, to_user_id),
      accepted_at = CASE WHEN array_length(missing,1) IS NULL THEN now() ELSE NULL END,
      notes = COALESCE(_notes, notes), booking_id = COALESCE(l.booking_id, booking_id)
     WHERE id = hid;
  END IF;

  PERFORM public.emit_event('sop.handover.updated','sop_lead', _lead, l.organization_id,
    jsonb_build_object('type', _type, 'complete', array_length(missing,1) IS NULL, 'missing', missing),
    'sop.handover.' || hid::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', array_length(missing,1) IS NULL, 'id', hid,
    'missing_fields', to_jsonb(COALESCE(missing,'{}')));
END $$;

-- ========= pricing =========
CREATE OR REPLACE FUNCTION public.sop_create_pricing_request(_lead uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; miss text[]; rid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  miss := public.sop_brief_missing(l);
  IF array_length(miss,1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['brief_incomplete']),
      'missing_fields', to_jsonb(miss));
  END IF;
  INSERT INTO public.sop_pricing_requests (organization_id, lead_id, customer_id, requested_by, notes, brief, status)
  VALUES (l.organization_id, _lead, l.customer_id, auth.uid(), _notes,
    jsonb_build_object('destination', COALESCE(l.destination, l.city), 'check_in', l.check_in, 'check_out', l.check_out,
      'approx_dates', l.approx_dates, 'adults', l.adults, 'children_count', l.children_count,
      'children_ages', l.children_ages, 'rooms', l.rooms, 'occupancy', l.occupancy,
      'nationality', l.nationality, 'market', l.market, 'budget_level', l.budget_level,
      'budget_amount', l.budget_amount, 'priorities', l.priorities, 'reference_hotel', l.reference_hotel,
      'special_requests', l.special_requests), 'requested')
  RETURNING id INTO rid;
  UPDATE public.sop_leads SET owner_department = 'reservations' WHERE id = _lead;
  PERFORM public.emit_event('sop.pricing_request.created','sop_pricing_request', rid, l.organization_id,
    jsonb_build_object('lead_id', _lead), 'sop.pr.created.' || rid::text);
  RETURN jsonb_build_object('allowed', true, 'pricing_request_id', rid);
END $$;

CREATE OR REPLACE FUNCTION public.sop_publish_pricing(_request uuid, _valid_until date DEFAULT NULL,
  _recommendation text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.sop_pricing_requests; l public.sop_leads; n int; viol text[] := '{}';
        qid uuid; o public.sop_pricing_options; sel public.sop_pricing_options; qnum text;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND OR NOT public.user_belongs_to_org(r.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_has_department(r.organization_id, auth.uid(), 'reservations') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reservations_only'])); END IF;

  SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = _request;
  IF n = 0 THEN viol := viol || 'no_options'; END IF;
  IF n > 3 THEN viol := viol || 'more_than_three_options'; END IF;
  IF EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request
             AND (net_cost IS NULL OR net_cost <= 0 OR selling_price IS NULL OR selling_price <= 0
                  OR coalesce(cancellation_policy,'') = ''))
    THEN viol := viol || 'options_missing_net_cost_or_policy'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request AND is_recommended)
    THEN viol := viol || 'no_recommended_option'; END IF;
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
      COALESCE(_valid_until, (now() + interval '7 days')::date), _recommendation,
      sel.selling_price, sel.selling_price, sel.net_cost, sel.selling_price - sel.net_cost,
      auth.uid(), l.current_owner_id)
    RETURNING id INTO qid;
  ELSE
    UPDATE public.quotes SET subtotal = sel.selling_price, total_amount = sel.selling_price,
      total_cost = sel.net_cost, total_profit = sel.selling_price - sel.net_cost,
      valid_until = COALESCE(_valid_until, valid_until), notes = COALESCE(_recommendation, notes),
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
         quote_id = qid, quoted_at = now(), price_valid_until = COALESCE(_valid_until, price_valid_until),
         recommendation = COALESCE(_recommendation, recommendation)
   WHERE id = _request;

  UPDATE public.sop_leads SET quote_id = qid, requote_required = false, owner_department = 'sales'
   WHERE id = r.lead_id;

  PERFORM public.emit_event('sop.pricing_request.published','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('quote_id', qid, 'options', n),
    'sop.pr.published.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'quote_id', qid, 'options', n);
END $$;

-- ========= recheck =========
CREATE OR REPLACE FUNCTION public.sop_request_recheck(_lead uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; rid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(l.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO rid FROM public.sop_pricing_requests WHERE lead_id = _lead AND status <> 'cancelled'
   ORDER BY created_at DESC LIMIT 1;
  IF rid IS NULL THEN RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['no_pricing_request'])); END IF;
  UPDATE public.sop_pricing_requests SET status = 'recheck', recheck_requested_at = now(),
    recheck_completed_at = NULL, recheck_changed = NULL, recheck_notes = _notes WHERE id = rid;
  UPDATE public.sop_leads SET owner_department = 'reservations' WHERE id = _lead;
  PERFORM public.emit_event('sop.recheck.requested','sop_lead', _lead, l.organization_id,
    jsonb_build_object('pricing_request_id', rid),
    'sop.recheck.req.' || rid::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true, 'pricing_request_id', rid);
END $$;

CREATE OR REPLACE FUNCTION public.sop_complete_recheck(_request uuid, _changed boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.sop_pricing_requests;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND OR NOT public.user_belongs_to_org(r.organization_id, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_has_department(r.organization_id, auth.uid(), 'reservations') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reservations_only'])); END IF;
  UPDATE public.sop_pricing_requests SET recheck_completed_at = now(), recheck_changed = _changed,
    recheck_notes = COALESCE(_notes, recheck_notes),
    status = CASE WHEN _changed THEN 'in_progress' ELSE 'quoted' END
   WHERE id = _request;
  UPDATE public.sop_leads SET requote_required = _changed,
    owner_department = CASE WHEN _changed THEN 'reservations'::public.sop_department ELSE 'sales'::public.sop_department END
   WHERE id = r.lead_id;
  PERFORM public.emit_event('sop.recheck.completed','sop_lead', r.lead_id, r.organization_id,
    jsonb_build_object('changed', _changed, 'pricing_request_id', _request),
    'sop.recheck.done.' || _request::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true, 'changed', _changed, 'requote_required', _changed);
END $$;

-- ========= approvals =========
CREATE OR REPLACE FUNCTION public.sop_request_approval(_type public.sop_approval_type, _lead uuid DEFAULT NULL,
  _booking uuid DEFAULT NULL, _amount numeric DEFAULT NULL, _reason text DEFAULT NULL,
  _supplier_payment_order uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid; aid uuid;
BEGIN
  SELECT organization_id INTO org FROM public.sop_leads WHERE id = _lead;
  IF org IS NULL THEN SELECT organization_id INTO org FROM public.bookings WHERE id = _booking; END IF;
  IF org IS NULL OR NOT public.user_belongs_to_org(org, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.sop_approvals (organization_id, approval_type, lead_id, booking_id, amount, reason,
    requested_by, supplier_payment_order_id)
  VALUES (org, _type, _lead, _booking, _amount, _reason, auth.uid(), _supplier_payment_order)
  RETURNING id INTO aid;
  PERFORM public.emit_event('sop.approval.requested','sop_approval', aid, org,
    jsonb_build_object('type', _type, 'lead_id', _lead, 'booking_id', _booking, 'amount', _amount),
    'sop.appr.req.' || aid::text);
  RETURN jsonb_build_object('allowed', true, 'approval_id', aid);
END $$;

CREATE OR REPLACE FUNCTION public.sop_decide_approval(_approval uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.sop_approvals;
BEGIN
  SELECT * INTO a FROM public.sop_approvals WHERE id = _approval;
  IF NOT FOUND THEN RAISE EXCEPTION 'approval_not_found'; END IF;
  IF NOT public.sop_is_manager(a.organization_id, auth.uid()) THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['management_only'])); END IF;
  UPDATE public.sop_approvals SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.sop_approval_status,
    decided_by = auth.uid(), decided_at = now(), decision_note = _note WHERE id = _approval;
  PERFORM public.emit_event('sop.approval.decided','sop_approval', _approval, a.organization_id,
    jsonb_build_object('type', a.approval_type, 'approved', _approve, 'lead_id', a.lead_id),
    'sop.appr.dec.' || _approval::text || '.' || extract(epoch from now())::bigint::text);
  RETURN jsonb_build_object('allowed', true, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END);
END $$;

-- supplier payment order guard
CREATE OR REPLACE FUNCTION public.sop_guard_supplier_payment_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; cs jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.approval_status = 'approved' AND OLD.approval_status IS DISTINCT FROM 'approved' THEN
    SELECT * INTO l FROM public.sop_leads WHERE booking_id = NEW.booking_id AND is_legacy = false LIMIT 1;
    IF FOUND THEN
      cs := public.sop_collection_status(l.id);
      IF NOT coalesce((cs->>'satisfied')::boolean, false) THEN
        RAISE EXCEPTION 'SOP: supplier payment blocked — customer collection condition not met (policy %, required %, paid %)',
          cs->>'policy', cs->>'required', cs->>'paid';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.sop_approvals a WHERE a.status = 'approved'
          AND a.approval_type IN ('supplier_payment','booking_confirmation')
          AND (a.booking_id = NEW.booking_id OR a.lead_id = l.id)) THEN
        RAISE EXCEPTION 'SOP: supplier payment blocked — management approval required';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sop_guard_spo ON public.supplier_payment_orders;
CREATE TRIGGER trg_sop_guard_spo BEFORE UPDATE ON public.supplier_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.sop_guard_supplier_payment_order();

-- ========= confirmation: deadlines, handover to CS, post-trip, automation =========
CREATE OR REPLACE FUNCTION public.sop_on_booking_confirmed(_lead uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sop_leads; p public.sop_org_policies; o public.sop_pricing_options; rid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR l.booking_id IS NULL THEN RETURN jsonb_build_object('allowed', false,
    'violations', to_jsonb(ARRAY['no_booking'])); END IF;
  SELECT * INTO p FROM public.sop_org_policies WHERE organization_id = l.organization_id;

  SELECT id INTO rid FROM public.sop_pricing_requests WHERE lead_id = _lead ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO o FROM public.sop_pricing_options WHERE pricing_request_id = rid
    ORDER BY is_selected DESC, is_recommended DESC LIMIT 1;

  IF o.payment_deadline IS NOT NULL THEN
    INSERT INTO public.sop_operational_deadlines (organization_id, deadline_type, booking_id, lead_id, pricing_request_id, due_at)
    SELECT l.organization_id, 'payment', l.booking_id, _lead, rid, o.payment_deadline::timestamptz
    WHERE NOT EXISTS (SELECT 1 FROM public.sop_operational_deadlines d WHERE d.lead_id = _lead AND d.deadline_type = 'payment');
  END IF;
  IF o.cancellation_deadline IS NOT NULL THEN
    INSERT INTO public.sop_operational_deadlines (organization_id, deadline_type, booking_id, lead_id, pricing_request_id, due_at)
    SELECT l.organization_id, 'cancellation', l.booking_id, _lead, rid, o.cancellation_deadline::timestamptz
    WHERE NOT EXISTS (SELECT 1 FROM public.sop_operational_deadlines d WHERE d.lead_id = _lead AND d.deadline_type = 'cancellation');
  END IF;
  IF o.release_deadline IS NOT NULL THEN
    INSERT INTO public.sop_operational_deadlines (organization_id, deadline_type, booking_id, lead_id, pricing_request_id, due_at)
    SELECT l.organization_id, 'release', l.booking_id, _lead, rid, o.release_deadline::timestamptz
    WHERE NOT EXISTS (SELECT 1 FROM public.sop_operational_deadlines d WHERE d.lead_id = _lead AND d.deadline_type = 'release');
  END IF;
  IF l.check_in IS NOT NULL THEN
    INSERT INTO public.sop_operational_deadlines (organization_id, deadline_type, booking_id, lead_id, due_at)
    SELECT l.organization_id, 'pre_arrival', l.booking_id, _lead,
      (l.check_in - make_interval(days => COALESCE(p.pre_arrival_days,3)))::timestamptz
    WHERE NOT EXISTS (SELECT 1 FROM public.sop_operational_deadlines d WHERE d.lead_id = _lead AND d.deadline_type = 'pre_arrival');
    INSERT INTO public.sop_operational_deadlines (organization_id, deadline_type, booking_id, lead_id, due_at)
    SELECT l.organization_id, 'reconfirmation', l.booking_id, _lead, (l.check_in - interval '7 days')::timestamptz
    WHERE NOT EXISTS (SELECT 1 FROM public.sop_operational_deadlines d WHERE d.lead_id = _lead AND d.deadline_type = 'reconfirmation');
  END IF;

  INSERT INTO public.sop_post_trip_actions (organization_id, booking_id, lead_id, customer_id, action_type, due_at)
  SELECT l.organization_id, l.booking_id, _lead, l.customer_id, t,
    (COALESCE(l.check_out, l.check_in, current_date) + make_interval(days => COALESCE(p.post_trip_days,2)))::timestamptz
  FROM unnest(ARRAY['feedback','review','referral','repeat_opportunity']) t
  WHERE NOT EXISTS (SELECT 1 FROM public.sop_post_trip_actions a WHERE a.lead_id = _lead AND a.action_type = t);

  BEGIN PERFORM public.run_booking_automation(l.booking_id); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM public.emit_event('sop.booking.confirmed','sop_lead', _lead, l.organization_id,
    jsonb_build_object('booking_id', l.booking_id),
    'sop.booking.confirmed.' || _lead::text);
  RETURN jsonb_build_object('allowed', true, 'booking_id', l.booking_id);
END $$;

-- ========= grants =========
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname LIKE 'sop\_%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
