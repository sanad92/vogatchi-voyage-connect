
-- Helper: current user's SOP departments + availability in an org
CREATE OR REPLACE FUNCTION public.sop_my_departments(_org uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'departments', COALESCE(jsonb_agg(jsonb_build_object('department', m.department, 'is_available', COALESCE(m.is_available,true))), '[]'::jsonb),
    'is_manager', public.sop_is_manager(_org, auth.uid())
  )
  FROM public.sop_department_members m
  WHERE m.organization_id = _org AND m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.sop_my_departments(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sop_my_departments(uuid) FROM anon, public;

-- Self toggle availability
CREATE OR REPLACE FUNCTION public.sop_set_my_availability(_org uuid, _department public.sop_department, _available boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.user_belongs_to_org(auth.uid(), _org) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.sop_department_members
     SET is_available = _available, updated_at = now()
   WHERE organization_id = _org AND user_id = auth.uid() AND department = _department;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['not_department_member']::text[]));
  END IF;
  RETURN jsonb_build_object('allowed', true);
END $$;

GRANT EXECUTE ON FUNCTION public.sop_set_my_availability(uuid, public.sop_department, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sop_set_my_availability(uuid, public.sop_department, boolean) FROM anon, public;

-- Claim lead: allow managers/admins/owners, richer diagnostics
CREATE OR REPLACE FUNCTION public.sop_claim_lead(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE l public.sop_leads; miss text[]; sla int; ok boolean; is_mgr boolean;
        my_depts text[]; sales_row public.sop_department_members;
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
END $$;

-- Claim pricing request: same treatment
CREATE OR REPLACE FUNCTION public.sop_claim_pricing_request(_request uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r public.sop_pricing_requests; ok boolean; is_mgr boolean;
        my_depts text[]; res_row public.sop_department_members;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  is_mgr := public.sop_is_manager(r.organization_id, auth.uid());

  SELECT * INTO res_row FROM public.sop_department_members m
   WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid() AND m.department = 'reservations';

  SELECT COALESCE(array_agg(m.department::text), '{}') INTO my_depts
    FROM public.sop_department_members m
   WHERE m.organization_id = r.organization_id AND m.user_id = auth.uid();

  ok := is_mgr OR (res_row.id IS NOT NULL AND COALESCE(res_row.is_available, true));

  IF NOT ok THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'violations', to_jsonb(ARRAY[
        CASE WHEN res_row.id IS NULL THEN 'not_reservations_member' ELSE 'reservations_member_unavailable' END
      ]::text[]),
      'my_departments', to_jsonb(my_depts),
      'is_manager', is_mgr
    );
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
END $$;
