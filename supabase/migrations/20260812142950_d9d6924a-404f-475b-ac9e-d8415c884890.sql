-- 1) Canonical stage order: new -> assigned (claim) -> qualified (sales decision) -> pricing_requested
CREATE OR REPLACE FUNCTION public.sop_allowed_next(_s sop_lead_stage)
RETURNS sop_lead_stage[]
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE _s
    WHEN 'new' THEN ARRAY['assigned','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'assigned' THEN ARRAY['qualified','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'qualified' THEN ARRAY['pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'pricing_requested' THEN ARRAY['quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'quoted' THEN ARRAY['follow_up','accepted_pending_recheck','pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'follow_up' THEN ARRAY['accepted_pending_recheck','quoted','pricing_requested','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'accepted_pending_recheck' THEN ARRAY['rechecked','quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'rechecked' THEN ARRAY['payment_pending','quoted','lost','cancelled']::public.sop_lead_stage[]
    WHEN 'payment_pending' THEN ARRAY['won','quoted','lost','cancelled']::public.sop_lead_stage[]
    ELSE ARRAY[]::public.sop_lead_stage[] END;
$function$;

-- 2) Qualification is a Sales-owner decision taken after claim
CREATE OR REPLACE FUNCTION public.sop_validate_transition(_lead uuid, _to sop_lead_stage)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  IF _to = 'lost' AND coalesce(l.lost_reason,'') = '' THEN missing := missing || 'lost_reason'::text; END IF;

  -- Sales qualification: only the assigned Sales owner (or a manager) decides,
  -- and intake completeness is still required but is a separate gate.
  IF _to = 'qualified' THEN
    missing := missing || public.sop_intake_missing(l);
    IF l.current_owner_id IS NULL THEN
      viol := viol || 'lead_not_claimed'::text;
    ELSIF l.current_owner_id <> auth.uid() AND NOT public.sop_is_manager(l.organization_id, auth.uid()) THEN
      viol := viol || 'only_sales_owner_can_qualify'::text;
    END IF;
  END IF;

  IF _to = 'assigned' THEN
    SELECT * INTO asg FROM public.sop_lead_assignments WHERE lead_id = l.id AND is_current LIMIT 1;
    IF NOT FOUND THEN viol := viol || 'no_sales_assignment'::text; END IF;
  END IF;

  IF _to = 'pricing_requested' THEN
    IF l.stage NOT IN ('qualified','quoted','follow_up') THEN viol := viol || 'lead_not_qualified'::text; END IF;
    missing := missing || public.sop_brief_missing(l);
    IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_requests r WHERE r.lead_id = l.id AND r.status <> 'cancelled')
      THEN viol := viol || 'no_pricing_request'::text; END IF;
  END IF;

  IF _to = 'quoted' THEN
    SELECT * INTO pr FROM public.sop_pricing_requests WHERE lead_id = l.id AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN viol := viol || 'no_pricing_request'::text;
    ELSE
      IF pr.status NOT IN ('quoted','requoted') THEN viol := viol || 'pricing_not_completed'::text; END IF;
      IF (SELECT count(*) FROM public.sop_pricing_options o WHERE o.pricing_request_id = pr.id) = 0
        THEN viol := viol || 'no_pricing_options'::text; END IF;
      IF (SELECT count(*) FROM public.sop_pricing_options o WHERE o.pricing_request_id = pr.id) > 3
        THEN viol := viol || 'more_than_three_options'::text; END IF;
    END IF;
  END IF;

  IF _to = 'accepted_pending_recheck' AND l.quote_id IS NULL THEN viol := viol || 'no_quote_linked'::text; END IF;

  IF _to = 'rechecked' THEN
    SELECT * INTO pr FROM public.sop_pricing_requests WHERE lead_id = l.id AND status <> 'cancelled'
      ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND OR pr.recheck_completed_at IS NULL THEN viol := viol || 'recheck_not_completed'::text; END IF;
    IF COALESCE(pr.recheck_changed, false) OR l.requote_required THEN viol := viol || 'requote_required'::text; END IF;
  END IF;

  IF _to IN ('payment_pending','won') THEN
    SELECT COALESCE(require_management_approval, true), approval_required_above_amount
      INTO req_appr, thr FROM public.sop_org_policies WHERE organization_id = l.organization_id;
    req_appr := COALESCE(req_appr, true);
    cs := public.sop_collection_status(l.id);
    need_appr := req_appr AND (thr IS NULL OR COALESCE((cs->>'due')::numeric, 0) > thr);
    IF COALESCE((cs->>'requires_approval')::boolean, false) THEN need_appr := true; END IF;
    IF need_appr AND NOT EXISTS (SELECT 1 FROM public.sop_approvals a WHERE a.lead_id = l.id
        AND a.approval_type = 'booking_confirmation' AND a.status = 'approved')
      THEN viol := viol || 'management_booking_approval_missing'::text; END IF;
  END IF;

  IF _to = 'payment_pending' THEN
    IF l.requote_required THEN viol := viol || 'requote_required'::text; END IF;
  END IF;

  IF _to = 'won' THEN
    IF NOT COALESCE((cs->>'satisfied')::boolean, false) THEN viol := viol || 'collection_condition_not_met'::text; END IF;
    IF l.booking_id IS NULL THEN viol := viol || 'no_booking_created'::text; END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', array_length(missing,1) IS NULL AND array_length(viol,1) IS NULL,
    'from', l.stage, 'to', _to,
    'missing_fields', to_jsonb(COALESCE(missing,'{}')),
    'violations', to_jsonb(COALESCE(viol,'{}')),
    'collection', CASE WHEN _to IN ('payment_pending','won') THEN public.sop_collection_status(l.id) ELSE NULL END);
END $function$;

-- 3) Department ownership: qualification now belongs to Sales
CREATE OR REPLACE FUNCTION public.sop_advance_lead(_lead uuid, _to sop_lead_stage, _reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; v jsonb; bstage text;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _to = 'lost' AND coalesce(_reason,'') <> '' THEN
    UPDATE public.sop_leads SET lost_reason = _reason WHERE id = _lead;
    SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  END IF;

  v := public.sop_validate_transition(_lead, _to);
  IF NOT (v->>'allowed')::boolean THEN RETURN v; END IF;

  UPDATE public.sop_leads
     SET stage = _to,
         owner_department = CASE
            WHEN _to = 'new' THEN 'customer_service'::public.sop_department
            WHEN _to = 'pricing_requested' THEN 'reservations'::public.sop_department
            WHEN _to IN ('assigned','qualified','quoted','follow_up','accepted_pending_recheck','rechecked','payment_pending') THEN 'sales'::public.sop_department
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
END $function$;

CREATE OR REPLACE FUNCTION public.sop_move_back(_lead uuid, _to sop_lead_stage, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  l public.sop_leads;
  ord text[] := ARRAY['new','assigned','qualified','pricing_requested','quoted','follow_up',
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
            WHEN _to = 'new' THEN 'customer_service'::public.sop_department
            WHEN _to = 'pricing_requested' THEN 'reservations'::public.sop_department
            ELSE 'sales'::public.sop_department END,
         lost_reason = NULL,
         updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.moved_back','sop_lead', _lead, l.organization_id,
    jsonb_build_object('from', l.stage, 'to', _to, 'reason', _reason, 'by', auth.uid()),
    'sop.lead.back.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', _to);
END $function$;

-- Reopening puts the lead back in the intake / ready-for-sales queue, never "qualified"
CREATE OR REPLACE FUNCTION public.sop_reopen_lead(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF l.stage NOT IN ('lost','cancelled') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_not_closed']::text[]));
  END IF;

  UPDATE public.sop_leads
     SET stage = 'new', owner_department = 'customer_service'::public.sop_department,
         current_owner_id = NULL, lost_reason = NULL, updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.reopened','sop_lead', _lead, l.organization_id,
    jsonb_build_object('by', auth.uid()),
    'sop.lead.reopen.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'stage', 'new');
END $function$;

-- 4) Claiming moves the lead into "under qualification" without qualifying it
CREATE OR REPLACE FUNCTION public.sop_claim_lead(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; miss text[]; sla int; ok boolean; is_mgr boolean;
        my_depts text[]; sales_row public.sop_department_members; new_stage public.sop_lead_stage;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  is_mgr := public.sop_is_manager(l.organization_id, auth.uid());

  SELECT * INTO sales_row FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = auth.uid() AND m.department = 'sales';

  SELECT COALESCE(array_agg(m.department::text), '{}') INTO my_depts
    FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = auth.uid();

  ok := is_mgr OR (sales_row.id IS NOT NULL AND COALESCE(sales_row.is_available, true));

  IF NOT ok THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'violations', to_jsonb(ARRAY[
        CASE WHEN sales_row.id IS NULL THEN 'not_sales_member' ELSE 'sales_member_unavailable' END
      ]::text[]),
      'my_departments', to_jsonb(my_depts),
      'is_manager', is_mgr
    );
  END IF;

  IF l.stage NOT IN ('new','assigned','qualified') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_already_in_pipeline']::text[]));
  END IF;

  IF l.current_owner_id IS NOT NULL AND l.current_owner_id <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['already_claimed']::text[]));
  END IF;

  IF l.current_owner_id = auth.uid() AND l.stage IN ('assigned','qualified') THEN
    RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid(), 'stage', l.stage, 'idempotent', true);
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

  -- Legacy leads already marked qualified keep that stage; new leads land "under qualification".
  new_stage := CASE WHEN l.stage = 'qualified' THEN 'qualified'::public.sop_lead_stage
                    ELSE 'assigned'::public.sop_lead_stage END;

  UPDATE public.sop_leads
     SET current_owner_id = auth.uid(),
         stage = new_stage,
         owner_department = 'sales'::public.sop_department,
         updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.lead.claimed','sop_lead', _lead, l.organization_id,
    jsonb_build_object('assignee', auth.uid(), 'method', 'self_claim'),
    'sop.lead.claim.' || _lead::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'assignee', auth.uid(), 'stage', new_stage);
END $function$;

-- 5) Pricing requests are blocked until the Sales owner qualified the lead
CREATE OR REPLACE FUNCTION public.sop_create_pricing_request(_lead uuid, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE l public.sop_leads; miss text[]; rid uuid;
BEGIN
  SELECT * INTO l FROM public.sop_leads WHERE id = _lead;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), l.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF l.stage NOT IN ('qualified','pricing_requested','quoted','follow_up') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['lead_not_qualified']::text[]));
  END IF;

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

  UPDATE public.sop_leads
     SET owner_department = 'reservations'::public.sop_department,
         stage = CASE WHEN stage = 'qualified' THEN 'pricing_requested'::public.sop_lead_stage ELSE stage END,
         updated_at = now()
   WHERE id = _lead;

  PERFORM public.emit_event('sop.pricing_request.created','sop_pricing_request', rid, l.organization_id,
    jsonb_build_object('lead_id', _lead), 'sop.pr.created.' || rid::text);
  RETURN jsonb_build_object('allowed', true, 'pricing_request_id', rid);
END $function$;

-- 6) Audit: distinguish sales claim from the sales qualification decision
CREATE OR REPLACE FUNCTION public.sop_trg_lead_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'lead_created', NULL, NEW.stage,
      coalesce(NEW.created_by, auth.uid()), NEW.lead_source, 'trigger', false, NULL, NEW.quote_id, NEW.booking_id,
      jsonb_build_object('lead_source', NEW.lead_source, 'is_legacy', NEW.is_legacy),
      coalesce(NEW.arrived_at, NEW.created_at, now()), 'created:' || NEW.id::text);
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id,
      CASE WHEN NEW.stage = 'assigned' THEN 'sales_claimed'
           WHEN NEW.stage = 'qualified' THEN 'sales_qualified'
           WHEN NEW.stage = 'accepted_pending_recheck' THEN 'customer_accepted'
           WHEN NEW.stage = 'won' THEN 'booking_confirmed'
           WHEN NEW.stage = 'lost' THEN 'lead_lost'
           ELSE 'stage_changed' END,
      OLD.stage, NEW.stage, auth.uid(), NEW.lost_reason, 'trigger', false, NULL, NEW.quote_id, NEW.booking_id,
      jsonb_build_object('owner_department', NEW.owner_department), now(),
      'stage:' || NEW.id::text || ':' || NEW.stage::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
  END IF;

  IF NEW.intake_completed_at IS NOT NULL AND OLD.intake_completed_at IS NULL THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'intake_completed', NULL, NEW.stage,
      auth.uid(), NULL, 'trigger', false, NULL, NULL, NULL, '{}'::jsonb, NEW.intake_completed_at,
      'intake:' || NEW.id::text);
  END IF;

  IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
    PERFORM public.sop_history_write(NEW.organization_id, NEW.id, 'cs_first_response', NULL, NEW.stage,
      auth.uid(), NULL, 'trigger', false, NULL, NULL, NULL, '{}'::jsonb, NEW.first_response_at,
      'firstresp:' || NEW.id::text);
  END IF;

  RETURN NEW;
END $function$;

-- 7) KPI: qualification duration measured from Sales claim to the qualification decision
CREATE OR REPLACE FUNCTION public.sop_lead_cycle_report(p_org uuid, p_from timestamp with time zone DEFAULT (now() - '90 days'::interval), p_to timestamp with time zone DEFAULT now(), p_department sop_department DEFAULT NULL::sop_department, p_employee uuid DEFAULT NULL::uuid, p_stage sop_lead_stage DEFAULT NULL::sop_lead_stage, p_source text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text, p_include_legacy boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      min(h.occurred_at) FILTER (WHERE h.action = 'sales_qualified') AS t_qualified,
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
         m.t_first_response, m.t_intake, m.t_claimed, m.t_qualified, m.t_ack, m.t_pricing_req, m.t_pricing_claim,
         m.t_pricing_done, m.t_accepted, m.t_recheck_req, m.t_recheck_done, m.t_booked, m.t_lost,
         coalesce(m.events, 0) AS events,
         round(extract(epoch FROM (m.t_first_response - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS first_response_minutes,
         round(extract(epoch FROM (m.t_intake - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS intake_minutes,
         round(extract(epoch FROM (m.t_claimed - coalesce(m.t_created, b.arrived_at, b.created_at)))/60) AS wait_sales_claim_minutes,
         round(extract(epoch FROM (m.t_qualified - m.t_claimed))/60) AS qualification_minutes,
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
      UNION ALL SELECT 'qualification', qualification_minutes, NULL FROM _rep
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
      AND h.action IN ('sales_claimed','sales_assigned','sales_qualified','pricing_claimed','pricing_published',
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
END $function$;

-- Internal functions stay server-side only
REVOKE EXECUTE ON FUNCTION public.sop_allowed_next(sop_lead_stage) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_validate_transition(uuid, sop_lead_stage) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_advance_lead(uuid, sop_lead_stage, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_move_back(uuid, sop_lead_stage, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_reopen_lead(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_claim_lead(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_create_pricing_request(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_lead_cycle_report(uuid, timestamptz, timestamptz, sop_department, uuid, sop_lead_stage, text, text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_allowed_next(sop_lead_stage) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_validate_transition(uuid, sop_lead_stage) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_advance_lead(uuid, sop_lead_stage, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_move_back(uuid, sop_lead_stage, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_reopen_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_claim_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_create_pricing_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_lead_cycle_report(uuid, timestamptz, timestamptz, sop_department, uuid, sop_lead_stage, text, text, boolean) TO authenticated;