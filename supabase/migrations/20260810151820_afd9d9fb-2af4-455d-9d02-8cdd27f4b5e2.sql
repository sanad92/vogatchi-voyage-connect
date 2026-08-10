-- A) Additive columns on the existing offers table
ALTER TABLE public.sop_pricing_options
  ADD COLUMN IF NOT EXISTS hotel_name text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS check_in date,
  ADD COLUMN IF NOT EXISTS check_out date,
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS room_view text,
  ADD COLUMN IF NOT EXISTS meal_plan text,
  ADD COLUMN IF NOT EXISTS rooms_count integer,
  ADD COLUMN IF NOT EXISTS ota_price numeric,
  ADD COLUMN IF NOT EXISTS ota_source text,
  ADD COLUMN IF NOT EXISTS hotel_direct_price numeric,
  ADD COLUMN IF NOT EXISTS cancellation_type text,
  ADD COLUMN IF NOT EXISTS free_cancellation_until timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_charge_model text,
  ADD COLUMN IF NOT EXISTS cancellation_charge_value numeric,
  ADD COLUMN IF NOT EXISTS cancellation_notes text,
  ADD COLUMN IF NOT EXISTS price_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_status text NOT NULL DEFAULT 'not_included',
  ADD COLUMN IF NOT EXISTS transfer_type text,
  ADD COLUMN IF NOT EXISTS transfer_net_cost numeric,
  ADD COLUMN IF NOT EXISTS transfer_selling_price numeric,
  ADD COLUMN IF NOT EXISTS transfer_notes text,
  ADD COLUMN IF NOT EXISTS recommendation_reason text,
  ADD COLUMN IF NOT EXISTS recommendation_note text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

COMMENT ON COLUMN public.sop_pricing_options.notes IS 'Sales-facing notes (visible to Sales, Reservations, Management)';
COMMENT ON COLUMN public.sop_pricing_options.internal_notes IS 'Reservations + Management only. Never exposed to customer-facing output.';

-- Backfill hotel_name from the legacy product_name so existing rows render.
UPDATE public.sop_pricing_options
   SET hotel_name = product_name
 WHERE hotel_name IS NULL AND product_name IS NOT NULL;

-- B) Backend enforcement: max 3 offers + exactly one recommended
CREATE OR REPLACE FUNCTION public.sop_enforce_option_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO n FROM public.sop_pricing_options WHERE pricing_request_id = NEW.pricing_request_id;
    IF n >= 3 THEN
      RAISE EXCEPTION 'SOP: a pricing request may not have more than 3 offers';
    END IF;
  END IF;

  IF NEW.is_recommended AND pg_trigger_depth() = 1 THEN
    UPDATE public.sop_pricing_options
       SET is_recommended = false
     WHERE pricing_request_id = NEW.pricing_request_id
       AND id <> NEW.id
       AND is_recommended;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sop_enforce_option_rules ON public.sop_pricing_options;
CREATE TRIGGER trg_sop_enforce_option_rules
AFTER INSERT OR UPDATE ON public.sop_pricing_options
FOR EACH ROW EXECUTE FUNCTION public.sop_enforce_option_rules();

REVOKE ALL ON FUNCTION public.sop_enforce_option_rules() FROM PUBLIC, anon;

-- Guard: protect the new internal cost field from non-Reservations edits too
CREATE OR REPLACE FUNCTION public.sop_guard_pricing_option()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.sop_has_department(NEW.organization_id, auth.uid(), 'reservations') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'SOP: only Reservations may create pricing options';
  END IF;
  IF NEW.net_cost IS DISTINCT FROM OLD.net_cost
     OR NEW.selling_price IS DISTINCT FROM OLD.selling_price
     OR NEW.markup_value IS DISTINCT FROM OLD.markup_value
     OR NEW.markup_type IS DISTINCT FROM OLD.markup_type
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.transfer_net_cost IS DISTINCT FROM OLD.transfer_net_cost
     OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     OR NEW.cancellation_policy IS DISTINCT FROM OLD.cancellation_policy THEN
    RAISE EXCEPTION 'SOP: only Reservations may change pricing or policy fields';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sop_guard_pricing_option() FROM PUBLIC, anon;

-- C) Publish: carry customer-facing offer details into quote_items, block expired offers
CREATE OR REPLACE FUNCTION public.sop_publish_pricing(
  _request uuid, _valid_until date DEFAULT NULL::date, _recommendation text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.sop_pricing_requests; l public.sop_leads; n int; viol text[] := '{}';
        qid uuid; o public.sop_pricing_options; sel public.sop_pricing_options; qnum text; vu date; emp uuid;
        nights int;
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
      SELECT e.id INTO emp
        FROM public.profiles p
        JOIN public.employees e ON e.id = p.linked_employee_id
       WHERE p.id = l.current_owner_id AND e.organization_id = r.organization_id
       LIMIT 1;
    END IF;
    IF emp IS NULL THEN
      SELECT e.id INTO emp
        FROM public.profiles p
        JOIN public.employees e ON lower(e.email) = lower(p.email)
       WHERE p.id = l.current_owner_id AND e.organization_id = r.organization_id
       LIMIT 1;
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
        'cancellation_notes', o.cancellation_notes,
        'payment_deadline', o.payment_deadline,
        'cancellation_deadline', o.cancellation_deadline,
        'release_deadline', o.release_deadline,
        'price_valid_until', o.price_valid_until,
        'transfer_status', o.transfer_status,
        'transfer_type', o.transfer_type,
        'transfer_selling_price', o.transfer_selling_price,
        'is_recommended', o.is_recommended,
        'recommendation_reason', o.recommendation_reason,
        'recommendation_note', o.recommendation_note,
        'sales_notes', o.notes,
        'supplier_name', o.supplier_name)));
  END LOOP;

  UPDATE public.sop_pricing_requests
     SET status = (CASE WHEN status IN ('quoted','requoted','recheck') THEN 'requoted' ELSE 'quoted' END)::public.sop_pricing_status,
         quote_id = qid, quoted_at = now(), price_valid_until = vu,
         recommendation = COALESCE(_recommendation, recommendation)
   WHERE id = _request;

  UPDATE public.sop_leads SET quote_id = qid, requote_required = false, owner_department = 'sales'
   WHERE id = r.lead_id;

  PERFORM public.emit_event('sop.pricing_request.published','sop_pricing_request', _request, r.organization_id,
    jsonb_build_object('quote_id', qid, 'options', n),
    'sop.pr.published.' || _request::text || '.' || extract(epoch from now())::bigint::text);

  RETURN jsonb_build_object('allowed', true, 'quote_id', qid, 'options', n);
END;
$$;

REVOKE ALL ON FUNCTION public.sop_publish_pricing(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) TO authenticated;