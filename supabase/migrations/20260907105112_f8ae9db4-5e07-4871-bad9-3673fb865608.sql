ALTER TABLE public.booking_hotel_details
  ADD COLUMN IF NOT EXISTS selling_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.booking_flight_details
  ADD COLUMN IF NOT EXISTS selling_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.booking_transport_details
  ADD COLUMN IF NOT EXISTS selling_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.booking_car_details
  ADD COLUMN IF NOT EXISTS selling_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS base_selling_price numeric,
  ADD COLUMN IF NOT EXISTS base_cost_price numeric;

CREATE OR REPLACE FUNCTION public.sync_booking_financials(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  v_sell numeric := 0;
  v_cost numeric := 0;
  v_base_sell numeric := 0;
  v_base_cost numeric := 0;
  v_total_sell numeric := 0;
  v_total_cost numeric := 0;
  v_inv public.invoices%ROWTYPE;
  v_locked boolean := false;
  r record;
  v_order int := 0;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.user_belongs_to_org(auth.uid(), b.organization_id) THEN
    RAISE EXCEPTION 'Not authorized for this booking';
  END IF;

  SELECT COALESCE(SUM(selling_amount), 0), COALESCE(SUM(cost_amount), 0)
    INTO v_sell, v_cost
  FROM (
    SELECT selling_amount, cost_amount FROM public.booking_hotel_details WHERE booking_id = p_booking_id
    UNION ALL
    SELECT selling_amount, cost_amount FROM public.booking_flight_details WHERE booking_id = p_booking_id
    UNION ALL
    SELECT selling_amount, cost_amount FROM public.booking_transport_details WHERE booking_id = p_booking_id
    UNION ALL
    SELECT selling_amount, cost_amount FROM public.booking_car_details WHERE booking_id = p_booking_id
  ) s;

  v_base_sell := COALESCE(b.base_selling_price, GREATEST(COALESCE(b.selling_price, 0) - v_sell, 0));
  v_base_cost := COALESCE(b.base_cost_price, GREATEST(COALESCE(b.cost_price, 0) - v_cost, 0));
  v_total_sell := round(v_base_sell + v_sell, 2);
  v_total_cost := round(v_base_cost + v_cost, 2);

  UPDATE public.bookings
  SET selling_price = v_total_sell,
      cost_price = v_total_cost,
      profit = v_total_sell - v_total_cost,
      base_selling_price = v_base_sell,
      base_cost_price = v_base_cost,
      updated_at = now()
  WHERE id = p_booking_id;

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE booking_id = p_booking_id
    AND COALESCE(status, 'draft') <> 'cancelled'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_inv.id IS NULL THEN
    RETURN jsonb_build_object('booking_total', v_total_sell, 'invoice_updated', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.organization_id = v_inv.organization_id
      AND je.source_type = 'invoice'
      AND je.source_id = v_inv.id
      AND je.is_locked
  ) INTO v_locked;

  IF v_locked THEN
    RETURN jsonb_build_object('booking_total', v_total_sell, 'invoice_updated', false, 'reason', 'locked');
  END IF;

  DELETE FROM public.invoice_items WHERE invoice_id = v_inv.id;

  IF v_base_sell > 0 THEN
    v_order := v_order + 1;
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price)
    VALUES (v_inv.id, 'خدمات الحجز الأساسية - ' || COALESCE(b.booking_number, ''), 1, v_base_sell, v_base_sell);
  END IF;

  FOR r IN
    SELECT 'فندق: ' || COALESCE(hotel_name, '') AS label, selling_amount FROM public.booking_hotel_details WHERE booking_id = p_booking_id AND selling_amount > 0
    UNION ALL
    SELECT 'طيران: ' || COALESCE(airline, '') || ' ' || COALESCE(flight_number, ''), selling_amount FROM public.booking_flight_details WHERE booking_id = p_booking_id AND selling_amount > 0
    UNION ALL
    SELECT 'نقل: ' || COALESCE(route, COALESCE(vehicle_type, '')), selling_amount FROM public.booking_transport_details WHERE booking_id = p_booking_id AND selling_amount > 0
    UNION ALL
    SELECT 'تأجير سيارة: ' || COALESCE(car_type, ''), selling_amount FROM public.booking_car_details WHERE booking_id = p_booking_id AND selling_amount > 0
  LOOP
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price)
    VALUES (v_inv.id, r.label, 1, r.selling_amount, r.selling_amount);
  END LOOP;

  UPDATE public.invoices
  SET subtotal = v_total_sell,
      updated_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'booking_total', v_total_sell,
    'invoice_id', v_inv.id,
    'invoice_updated', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_booking_financials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_booking_financials(uuid) TO authenticated, service_role;