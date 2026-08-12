
CREATE OR REPLACE FUNCTION public.sop_publish_pricing(_request uuid, _valid_until date DEFAULT NULL::date, _recommendation text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.sop_pricing_requests; l public.sop_leads; n int; viol text[] := '{}';
        qid uuid; o public.sop_pricing_options; sel public.sop_pricing_options; qnum text; vu date; emp uuid;
        nights int; target uuid; new_stage public.sop_lead_stage;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT (public.sop_has_department(r.organization_id, auth.uid(), 'reservations')
          OR public.sop_is_manager(r.organization_id, auth.uid())) THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reservations_only']::text[])); END IF;

  vu := COALESCE(_valid_until, r.price_valid_until);

  SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = _request;
  IF n = 0 THEN viol := viol || 'no_options'::text; END IF;
  IF n > 3 THEN viol := viol || 'more_than_three_options'::text; END IF;
  IF EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request
             AND (net_cost IS NULL OR net_cost <= 0 OR selling_price IS NULL OR selling_price <= 0
                  OR coalesce(cancellation_policy, cancellation_type, '') = ''))
    THEN viol := viol || 'options_missing_net_cost_or_policy'::text; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request AND is_recommended)
    THEN viol := viol || 'no_recommended_option'::text; END IF;
  IF EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request
             AND is_recommended AND price_valid_until IS NOT NULL AND price_valid_until < now())
    THEN viol := viol || 'option_price_expired'::text; END IF;
  IF vu IS NULL THEN viol := viol || 'price_validity_required'::text; END IF;
  IF vu IS NOT NULL AND vu < current_date THEN viol := viol || 'price_validity_expired'::text; END IF;
  IF array_length(viol,1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(viol)); END IF;

  SELECT * INTO l FROM public.sop_leads WHERE id = r.lead_id;
  SELECT * INTO sel FROM public.sop_pricing_options WHERE pricing_request_id = _request
    ORDER BY is_selected DESC, is_recommended DESC, option_index ASC LIMIT 1;

  emp := NULL;
  IF l.current_owner_id IS NOT NULL THEN
    SELECT e.id INTO emp FROM public.employees e
     WHERE e.id = l.current_owner_id AND e.organization_id = r.organization_id LIMIT 1;
    IF emp IS NULL THEN
      SELECT e.id INTO emp FROM public.profiles p
        JOIN public.employees e ON e.id = p.linked_employee_id
       WHERE p.id = l.current_owner_id AND e.organization_id = r.organization_id LIMIT 1;
    END IF;
    IF emp IS NULL THEN
      SELECT e.id INTO emp FROM public.profiles p
        JOIN public.employees e ON lower(e.email) = lower(p.email)
       WHERE p.id = l.current_owner_id AND e.organization_id = r.organization_id LIMIT 1;
    END IF;
  END IF;

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
      auth.uid(), emp)
    RETURNING id INTO qid;
  ELSE
    UPDATE public.quotes SET subtotal = sel.selling_price, total_amount = sel.selling_price,
      total_cost = sel.net_cost, total_profit = sel.selling_price - sel.net_cost,
      valid_until = vu, notes = COALESCE(_recommendation, notes),
      assigned_employee_id = COALESCE(emp, assigned_employee_id),
      status = 'sent', updated_at = now()
     WHERE id = qid;
    DELETE FROM public.quote_items WHERE quote_id = qid;
  END IF;

  FOR o IN SELECT * FROM public.sop_pricing_options WHERE pricing_request_id = _request ORDER BY option_index LOOP
    nights := NULLIF(GREATEST(COALESCE(o.check_out, l.check_out) - COALESCE(o.check_in, l.check_in), 0), 0);
    INSERT INTO public.quote_items (organization_id, quote_id, item_type, description, quantity,
      cost_price, selling_price, total_cost, total_selling, supplier_id, sort_order, details)
    VALUES (r.organization_id, qid, 'option',
      COALESCE(o.hotel_name, o.product_name, o.supplier_name, 'Option ' || o.option_index),
      1, o.net_cost, o.selling_price, o.net_cost, o.selling_price, o.supplier_id, o.option_index,
      jsonb_strip_nulls(jsonb_build_object(
        'hotel_name', COALESCE(o.hotel_name, o.product_name),
        'destination', COALESCE(o.destination, l.destination),
        'check_in', COALESCE(o.check_in, l.check_in),
        'check_out', COALESCE(o.check_out, l.check_out),
        'nights', nights,
        'room_type', o.room_type,
        'room_view', o.room_view,
        'meal_plan', o.meal_plan,
        'rooms_count', o.rooms_count,
        'currency', o.currency,
        'selling_price', o.selling_price,
        'price_per_night', CASE WHEN nights IS NOT NULL THEN round(o.selling_price / nights, 2) END,
        'ota_price', o.ota_price,
        'ota_source', o.ota_source,
        'hotel_direct_price', o.hotel_direct_price,
        'saving_vs_ota', CASE WHEN COALESCE(o.ota_price,0) > 0 THEN o.ota_price - o.selling_price END,
        'saving_vs_hotel_direct', CASE WHEN COALESCE(o.hotel_direct_price,0) > 0 THEN o.hotel_direct_price - o.selling_price END,
        'cancellation_type', o.cancellation_type,
        'cancellation_policy', o.cancellation_policy,
        'free_cancellation_until', o.free_cancellation_until,
        'cancellation_charge_model', o.cancellation_charge_model,
        'cancellation_charge_value', o.cancellation_charge_value,
        'cancellation_notes', o.cancellation_notes,
        'payment_deadline', o.payment_deadline,
        'cancellation_deadline', o.cancellation_deadline,
        'release_deadline', o.release_deadline,
        'price_valid_until', o.price_valid_until,
        'transfer_status', o.transfer_status,
        'transfer_type', o.transfer_type,
        'transfer_selling_price', o.transfer_selling_price,
        'transfer_notes', o.transfer_notes,
        'is_recommended', o.is_recommended,
        'recommendation_reason', o.recommendation_reason,
        'recommendation_note', o.recommendation_note,
        'sales_notes', o.notes,
        'supplier_name', o.supplier_name)));
  END LOOP;

  UPDATE public.sop_pricing_requests
     SET status = (CASE WHEN status IN ('quoted','requoted','recheck') THEN 'requoted' ELSE 'quoted' END)::public.sop_pricing_status,
         quote_id = qid, quoted_at = now(), price_valid_until = vu,
         recommendation = COALESCE(_recommendation, recommendation),
         updated_at = now()
   WHERE id = _request;

  -- Hand ownership straight back to the Sales consultant who requested the pricing.
  SELECT m.user_id INTO target FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = r.requested_by AND m.department = 'sales';
  target := COALESCE(target, l.current_owner_id, r.requested_by);

  new_stage := CASE
    WHEN l.stage IN ('new','qualified','assigned','pricing_requested','follow_up')
      THEN 'quoted'::public.sop_lead_stage
    ELSE l.stage END;

  UPDATE public.sop_leads
     SET quote_id = qid,
         requote_required = false,
         owner_department = 'sales'::public.sop_department,
         current_owner_id = target,
         stage = new_stage,
         updated_at = now()
   WHERE id = r.lead_id;

  PERFORM public.emit_event('sop.pricing_request.published','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('quote_id', qid, 'options', n),
    'sop.pr.published.' || _request::text || '.' || extract(epoch from now())::bigint::text);
  PERFORM public.emit_event('sop.pricing_request.returned','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('lead_id', l.id, 'owner', target, 'quote_id', qid),
    'sop.pr.return.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'quote_id', qid, 'options', n,
    'owner', target, 'lead_stage', new_stage, 'returned_to_sales', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sop_return_to_sales(_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.sop_pricing_requests; l public.sop_leads; target uuid; new_stage public.sop_lead_stage;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF r.status NOT IN ('quoted','requoted') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['pricing_not_published']::text[]));
  END IF;

  SELECT * INTO l FROM public.sop_leads WHERE id = r.lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  SELECT m.user_id INTO target FROM public.sop_department_members m
   WHERE m.organization_id = l.organization_id AND m.user_id = r.requested_by AND m.department = 'sales';
  target := COALESCE(target, l.current_owner_id, r.requested_by);

  new_stage := CASE
    WHEN l.stage IN ('new','qualified','assigned','pricing_requested','follow_up')
      THEN 'quoted'::public.sop_lead_stage
    ELSE l.stage END;

  UPDATE public.sop_leads
     SET owner_department = 'sales'::public.sop_department,
         current_owner_id = target,
         stage = new_stage,
         quote_id = COALESCE(r.quote_id, quote_id),
         updated_at = now()
   WHERE id = l.id;

  PERFORM public.emit_event('sop.pricing_request.returned','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('lead_id', l.id, 'owner', target),
    'sop.pr.return.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'owner', target, 'lead_stage', new_stage);
END $function$;

REVOKE EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_return_to_sales(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sop_return_to_sales(uuid) TO authenticated;
