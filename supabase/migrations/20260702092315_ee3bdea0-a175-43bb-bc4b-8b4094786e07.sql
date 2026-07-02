
-- Phase 2: Booking Lifecycle State Machine

-- Ensure required statuses exist (already do). Cache their IDs via helper.
CREATE OR REPLACE FUNCTION public.get_booking_status_id(_name text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.booking_statuses WHERE lower(name) = lower(_name) LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_booking_status_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_status_id(text) TO authenticated, service_role;

-- Validate transitions & auto-log history
CREATE OR REPLACE FUNCTION public.trg_booking_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_name text;
  new_name text;
  allowed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_id IS NULL THEN
      NEW.status_id := public.get_booking_status_id('Pending');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    SELECT lower(name) INTO old_name FROM public.booking_statuses WHERE id = OLD.status_id;
    SELECT lower(name) INTO new_name FROM public.booking_statuses WHERE id = NEW.status_id;

    -- Allowed transitions
    allowed := CASE
      WHEN old_name IS NULL THEN true
      WHEN old_name = 'pending'   AND new_name IN ('confirmed','cancelled') THEN true
      WHEN old_name = 'confirmed' AND new_name IN ('completed','cancelled') THEN true
      WHEN old_name = 'completed' AND new_name IN ('cancelled') THEN true
      WHEN old_name = 'cancelled' AND new_name IN ('pending') THEN true
      ELSE false
    END;

    IF NOT allowed THEN
      RAISE EXCEPTION 'انتقال حالة غير مسموح: % → %', COALESCE(old_name,'-'), COALESCE(new_name,'-')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_transition ON public.bookings;
CREATE TRIGGER trg_booking_status_transition
BEFORE INSERT OR UPDATE OF status_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_booking_status_transition();

-- Auto-history logger (AFTER)
CREATE OR REPLACE FUNCTION public.trg_booking_status_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    INSERT INTO public.booking_status_history (booking_id, status_id, changed_by, organization_id, notes)
    VALUES (NEW.id, NEW.status_id, auth.uid(), NEW.organization_id, 'تغيير تلقائي عبر state machine');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_history ON public.bookings;
CREATE TRIGGER trg_booking_status_history
AFTER UPDATE OF status_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_booking_status_history();

-- Convert Quote → Booking(s) RPC
CREATE OR REPLACE FUNCTION public.convert_quote_to_bookings(p_quote_id uuid)
RETURNS TABLE(booking_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q record;
  it record;
  new_id uuid;
  status_pending uuid := public.get_booking_status_id('Pending');
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id;
  IF q IS NULL THEN RAISE EXCEPTION 'عرض السعر غير موجود'; END IF;
  IF q.status = 'converted' THEN RAISE EXCEPTION 'تم تحويل هذا العرض مسبقاً'; END IF;

  FOR it IN SELECT * FROM public.quote_items WHERE quote_id = p_quote_id ORDER BY sort_order LOOP
    INSERT INTO public.bookings (
      organization_id, booking_type, customer_id, customer_name,
      supplier_id, selling_price, cost_price, profit,
      currency, start_date, end_date, notes, quote_id, status_id,
      booking_number
    ) VALUES (
      q.organization_id, it.item_type, q.customer_id, q.customer_name,
      it.supplier_id, COALESCE(it.total_selling, it.selling_price), COALESCE(it.total_cost, it.cost_price),
      COALESCE(it.total_selling,0) - COALESCE(it.total_cost,0),
      'EGP', q.travel_date, q.return_date, it.description, p_quote_id, status_pending,
      'BK-' || to_char(now(),'YYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)
    ) RETURNING id INTO new_id;
    booking_id := new_id;
    RETURN NEXT;
  END LOOP;

  UPDATE public.quotes SET status = 'converted', updated_at = now() WHERE id = p_quote_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_bookings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_bookings(uuid) TO authenticated;
