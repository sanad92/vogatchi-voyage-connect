CREATE OR REPLACE FUNCTION public.sop_publish_pricing(_request uuid, _valid_until date DEFAULT NULL::date, _recommendation text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.sop_pricing_requests; l public.sop_leads; n int; viol text[] := '{}';
        qid uuid; o public.sop_pricing_options; sel public.sop_pricing_options; qnum text; vu date; emp uuid;
BEGIN
  SELECT * INTO r FROM public.sop_pricing_requests WHERE id = _request;
  IF NOT FOUND OR NOT public.user_belongs_to_org(auth.uid(), r.organization_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.sop_has_department(r.organization_id, auth.uid(), 'reservations') THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(ARRAY['reservations_only'])); END IF;

  vu := COALESCE(_valid_until, r.price_valid_until);

  SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = _request;
  IF n = 0 THEN viol := viol || 'no_options'::text; END IF;
  IF n > 3 THEN viol := viol || 'more_than_three_options'::text; END IF;
  IF EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request
             AND (net_cost IS NULL OR net_cost <= 0 OR selling_price IS NULL OR selling_price <= 0
                  OR coalesce(cancellation_policy,'') = ''))
    THEN viol := viol || 'options_missing_net_cost_or_policy'::text; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sop_pricing_options WHERE pricing_request_id = _request AND is_recommended)
    THEN viol := viol || 'no_recommended_option'::text; END IF;
  IF vu IS NULL THEN viol := viol || 'price_validity_required'::text; END IF;
  IF vu IS NOT NULL AND vu < current_date THEN viol := viol || 'price_validity_expired'::text; END IF;
  IF array_length(viol,1) IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'violations', to_jsonb(viol)); END IF;

  SELECT * INTO l FROM public.sop_leads WHERE id = r.lead_id;
  SELECT * INTO sel FROM public.sop_pricing_options WHERE pricing_request_id = _request
    ORDER BY is_selected DESC, is_recommended DESC, option_index ASC LIMIT 1;

  -- resolve employee record for the lead owner (quotes.assigned_employee_id -> employees.id)
  emp := NULL;
  IF l.current_owner_id IS NOT NULL THEN
    SELECT e.id INTO emp FROM public.employees e
     WHERE e.organization_id = r.organization_id AND e.user_id = l.current_owner_id
     LIMIT 1;
    IF emp IS NULL AND EXISTS (SELECT 1 FROM public.employees e2 WHERE e2.id = l.current_owner_id) THEN
      emp := l.current_owner_id;
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

REVOKE EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) TO authenticated;