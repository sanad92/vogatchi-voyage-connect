-- Versioned deployment SQL. Apply transactionally before publishing the new UI.
-- Requires deploy-atomic-quote.sql. Does not convert or repair historical quotes.
CREATE TABLE IF NOT EXISTS public.quote_booking_conversions (
  quote_id uuid PRIMARY KEY REFERENCES public.quotes(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id) ON DELETE RESTRICT,
  discount_amount numeric NOT NULL CHECK(discount_amount>=0),
  source_snapshot jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_booking_conversions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_booking_conversions FROM PUBLIC,anon,authenticated;
GRANT SELECT(quote_id,organization_id,booking_id,invoice_id,created_at)
  ON public.quote_booking_conversions TO authenticated;
DROP POLICY IF EXISTS quote_conversion_read ON public.quote_booking_conversions;
CREATE POLICY quote_conversion_read ON public.quote_booking_conversions FOR SELECT TO authenticated
  USING(public.has_org_permission(organization_id,'quotes_view') AND (
    public.is_platform_admin(auth.uid()) OR EXISTS(SELECT 1 FROM public.quotes q
      CROSS JOIN LATERAL public._org_permission_state(q.organization_id,auth.uid(),'quotes_view') p
      WHERE q.id=quote_id AND (p.data_scope='organization' OR (p.data_scope='own' AND q.created_by=auth.uid())))));

-- Current quote items are immutable once converted. All edits serialize against
-- conversion's parent lock, including deletes and moving a line to another quote.
CREATE OR REPLACE FUNCTION public.guard_converted_quote() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent_id uuid;
BEGIN
  IF TG_TABLE_NAME='quotes' THEN
    parent_id:=OLD.id;
    IF EXISTS(SELECT 1 FROM public.quote_booking_conversions WHERE quote_id=parent_id) THEN
      RAISE EXCEPTION 'العرض محوّل بالفعل؛ استخدم مستند تعديل بدلاً من تغيير الأصل' USING ERRCODE='22023';
    END IF;
  ELSE
    FOR parent_id IN SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP<>'INSERT' THEN OLD.quote_id END,
      CASE WHEN TG_OP<>'DELETE' THEN NEW.quote_id END]) x WHERE x IS NOT NULL ORDER BY x
    LOOP
      PERFORM 1 FROM public.quotes WHERE id=parent_id FOR UPDATE;
      IF EXISTS(SELECT 1 FROM public.quote_booking_conversions WHERE quote_id=parent_id) THEN
        RAISE EXCEPTION 'لا يمكن تغيير بنود عرض محوّل' USING ERRCODE='22023';
      END IF;
    END LOOP;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_converted_quote() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_converted_quote ON public.quotes;
CREATE TRIGGER guard_converted_quote BEFORE UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.guard_converted_quote();
DROP TRIGGER IF EXISTS guard_converted_quote_items ON public.quote_items;
CREATE TRIGGER guard_converted_quote_items BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.guard_converted_quote();

-- Supplier coverage is proved by the individual service obligations, never by a
-- client-writable flag or by assigning the entire package cost to one supplier.
CREATE OR REPLACE FUNCTION public.quote_booking_supplier_coverage(_booking uuid,_org uuid,_cost numeric)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (auth.uid() IS NULL OR public.is_platform_admin(auth.uid()) OR EXISTS(SELECT 1 FROM public.organization_members
      WHERE organization_id=_org AND user_id=auth.uid() AND is_active))
    AND EXISTS(SELECT 1 FROM public.quote_booking_conversions c
      WHERE c.booking_id=_booking AND c.organization_id=_org
      AND _cost=(SELECT COALESCE(sum(i.total_cost),0) FROM public.quote_items i WHERE i.quote_id=c.quote_id)
      AND NOT EXISTS(SELECT 1 FROM public.quote_items i
        LEFT JOIN public.supplier_payment_orders p ON p.booking_id=_booking
          AND p.source_type='quote_items' AND p.source_id=i.id
        WHERE i.quote_id=c.quote_id AND i.total_cost>0 AND
          (p.id IS NULL OR p.organization_id<>_org OR p.supplier_id IS DISTINCT FROM i.supplier_id
           OR p.amount IS DISTINCT FROM i.total_cost OR p.status='cancelled' OR p.approval_status='rejected'))
      AND _cost=(SELECT COALESCE(sum(p.amount),0) FROM public.supplier_payment_orders p
        WHERE p.booking_id=_booking AND p.status<>'cancelled' AND p.approval_status<>'rejected'));
$$;
REVOKE ALL ON FUNCTION public.quote_booking_supplier_coverage(uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_booking_supplier_coverage(uuid,uuid,numeric) TO authenticated,service_role;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_confirmed_supplier_required;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_confirmed_supplier_required CHECK (
  is_demo OR COALESCE(status,'pending') NOT IN ('confirmed','completed') OR COALESCE(cost_price,0)<=0
  OR supplier_id IS NOT NULL OR public.quote_booking_supplier_coverage(id,organization_id,cost_price)
) NOT VALID;

CREATE OR REPLACE FUNCTION public.convert_quote_atomic(_org uuid,_quote uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  q public.quotes%ROWTYPE; item public.quote_items%ROWTYPE;
  previous public.quote_booking_conversions%ROWTYPE;
  bid uuid; iid uuid; poid uuid; item_count integer:=0; sell numeric:=0; cost numeric:=0;
  qty numeric; net numeric; vat numeric; first_type text; scope text; sync_result jsonb;
  booking_number text; invoice_count integer; supplier_count integer:=0; snapshot jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.can_org_write(_org),false)
    OR NOT COALESCE(public.has_org_permission(_org,'quotes_view'),false)
    OR NOT COALESCE(public.has_org_permission(_org,'quotes_edit'),false)
    OR NOT COALESCE(public.has_org_permission(_org,'bookings_create'),false)
    OR NOT COALESCE(public.has_org_permission(_org,'invoices_create'),false) THEN
    RAISE EXCEPTION 'غير مصرح بتحويل عرض السعر' USING ERRCODE='42501';
  END IF;
  SELECT * INTO q FROM public.quotes WHERE id=_quote AND organization_id=_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'عرض السعر غير موجود في الشركة' USING ERRCODE='42501'; END IF;
  IF NOT public.is_platform_admin(auth.uid()) THEN
    FOR scope IN SELECT p.data_scope FROM (VALUES('quotes_view'),('quotes_edit')) k(permission_key)
      CROSS JOIN LATERAL public._org_permission_state(_org,auth.uid(),k.permission_key) p LOOP
      IF NOT COALESCE(scope='organization' OR (scope='own' AND q.created_by=auth.uid()),false) THEN
        RAISE EXCEPTION 'نطاق الصلاحية لا يسمح بتحويل هذا العرض' USING ERRCODE='42501';
      END IF;
    END LOOP;
  END IF;
  SELECT * INTO previous FROM public.quote_booking_conversions WHERE quote_id=q.id;
  IF FOUND THEN
    RETURN jsonb_build_object('booking_id',previous.booking_id,'invoice_id',previous.invoice_id,'already_converted',true);
  END IF;
  IF EXISTS(SELECT 1 FROM public.bookings WHERE quote_id=q.id)
    OR EXISTS(SELECT 1 FROM public.invoices WHERE quote_id=q.id)
    OR EXISTS(SELECT 1 FROM public.hotel_bookings WHERE quote_id=q.id)
    OR EXISTS(SELECT 1 FROM public.flight_bookings WHERE quote_id=q.id)
    OR EXISTS(SELECT 1 FROM public.transport_bookings WHERE quote_id=q.id)
    OR EXISTS(SELECT 1 FROM public.car_rentals WHERE quote_id=q.id) THEN
    RAISE EXCEPTION 'العرض مرتبط بتحويل سابق؛ راجع الروابط قبل أي تحويل جديد' USING ERRCODE='22023';
  END IF;
  IF COALESCE(q.status,'') NOT IN ('draft','sent','accepted') OR q.is_demo THEN
    RAISE EXCEPTION 'حالة العرض لا تسمح بالتحويل' USING ERRCODE='22023';
  END IF;
  IF q.customer_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.customers
    WHERE id=q.customer_id AND organization_id=_org) THEN
    RAISE EXCEPTION 'اربط العرض بعميل من الشركة قبل التحويل' USING ERRCODE='22023';
  END IF;
  IF q.currency IS NULL OR q.currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'حدد عملة العرض القديم قبل التحويل' USING ERRCODE='22023';
  END IF;
  IF q.travel_date IS NULL OR q.return_date IS NULL OR q.travel_date>q.return_date
    OR q.travel_date::text IN ('infinity','-infinity') OR q.return_date::text IN ('infinity','-infinity')
    OR q.valid_until::text IN ('infinity','-infinity') OR q.valid_until<current_date THEN
    RAISE EXCEPTION 'راجع تواريخ السفر وصلاحية العرض' USING ERRCODE='22023';
  END IF;
  IF q.assigned_employee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employees
    WHERE id=q.assigned_employee_id AND organization_id=_org AND is_active) THEN
    RAISE EXCEPTION 'الموظف المعين غير متاح في الشركة' USING ERRCODE='22023';
  END IF;
  IF q.discount_amount IS NULL OR q.vat_rate IS NULL
    OR q.discount_amount::text IN ('NaN','Infinity','-Infinity') OR q.discount_amount<0
    OR q.vat_rate::text IN ('NaN','Infinity','-Infinity') OR q.vat_rate<0 OR q.vat_rate>100 THEN
    RAISE EXCEPTION 'قيم الخصم أو الضريبة غير صحيحة' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT * FROM public.quote_items WHERE quote_id=q.id ORDER BY sort_order,id FOR UPDATE LOOP
    item_count:=item_count+1; first_type:=COALESCE(first_type,item.item_type);
    IF item.organization_id IS DISTINCT FROM _org OR item.item_type NOT IN ('hotel','flight','transport','car_rental')
      OR NULLIF(btrim(item.description),'') IS NULL THEN
      RAISE EXCEPTION 'البند % غير مدعوم أو لا يتبع الشركة',item_count USING ERRCODE='22023';
    END IF;
    IF item.quantity IS NULL OR item.quantity<=0 OR item.cost_price IS NULL OR item.selling_price IS NULL
      OR item.cost_price::text IN ('NaN','Infinity','-Infinity') OR item.selling_price::text IN ('NaN','Infinity','-Infinity')
      OR item.cost_price<0 OR item.selling_price<0 THEN
      RAISE EXCEPTION 'أسعار أو كمية البند % غير صحيحة',item_count USING ERRCODE='22023';
    END IF;
    IF item.total_cost IS DISTINCT FROM round(item.cost_price*item.quantity,2)
      OR item.total_selling IS DISTINCT FROM round(item.selling_price*item.quantity,2) THEN
      RAISE EXCEPTION 'إجماليات البند % لا تطابق الأسعار والكميات',item_count USING ERRCODE='22023';
    END IF;
    IF (item.total_cost>0 AND item.supplier_id IS NULL) OR (item.supplier_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.suppliers WHERE id=item.supplier_id AND organization_id=_org)) THEN
      RAISE EXCEPTION 'حدد مورد الشركة للبند %',item_count USING ERRCODE='22023';
    END IF;
    sell:=sell+item.total_selling; cost:=cost+item.total_cost;
  END LOOP;
  net:=round(sell-q.discount_amount,2); vat:=round(net*q.vat_rate/100,2);
  IF item_count=0 OR item_count>500 OR net<=0 OR q.subtotal IS DISTINCT FROM sell
    OR q.total_cost IS DISTINCT FROM cost OR q.total_amount IS DISTINCT FROM net+vat
    OR q.vat_amount IS DISTINCT FROM vat THEN
    RAISE EXCEPTION 'إجماليات العرض غير متسقة مع بنوده' USING ERRCODE='22023';
  END IF;
  SELECT jsonb_build_object('quote',to_jsonb(q),'items',jsonb_agg(to_jsonb(i) ORDER BY i.sort_order,i.id))
    INTO snapshot FROM public.quote_items i WHERE i.quote_id=q.id;
  booking_number:='QBK-'||q.id::text;
  INSERT INTO public.bookings(organization_id,booking_number,booking_type,customer_id,customer_name,
    employee_id,supplier_id,selling_price,cost_price,base_selling_price,base_cost_price,currency,
    start_date,end_date,notes,quote_id,status)
  VALUES(_org,booking_number,first_type,q.customer_id,q.customer_name,q.assigned_employee_id,NULL,
    sell,cost,0,0,q.currency,q.travel_date,q.return_date,q.notes,q.id,'pending') RETURNING id INTO bid;
  SELECT count(*),(array_agg(id))[1] INTO invoice_count,iid FROM public.invoices
    WHERE booking_id=bid AND COALESCE(status,'draft')<>'cancelled';
  IF invoice_count<>1 THEN RAISE EXCEPTION 'تعذر إنشاء فاتورة الحجز؛ تم إلغاء التحويل بالكامل'; END IF;
  FOR item IN SELECT * FROM public.quote_items WHERE quote_id=q.id ORDER BY sort_order,id LOOP
    CASE item.item_type
      WHEN 'hotel' THEN
        INSERT INTO public.booking_hotel_details(booking_id,hotel_name,check_in,check_out,nights,selling_amount,cost_amount)
        VALUES(bid,item.description,q.travel_date,q.return_date,GREATEST(q.return_date-q.travel_date,1),item.total_selling,item.total_cost);
      WHEN 'flight' THEN
        INSERT INTO public.booking_flight_details(booking_id,airline,departure_date,arrival_date,passengers_count,selling_amount,cost_amount)
        VALUES(bid,item.description,q.travel_date,q.return_date,item.quantity,item.total_selling,item.total_cost);
      WHEN 'transport' THEN
        INSERT INTO public.booking_transport_details(booking_id,route,passengers,selling_amount,cost_amount)
        VALUES(bid,item.description,q.number_of_travelers,item.total_selling,item.total_cost);
      WHEN 'car_rental' THEN
        INSERT INTO public.booking_car_details(booking_id,car_type,pickup_date,dropoff_date,selling_amount,cost_amount)
        VALUES(bid,item.description,q.travel_date,q.return_date,item.total_selling,item.total_cost);
    END CASE;
    IF item.total_cost>0 THEN
      INSERT INTO public.supplier_payment_orders(organization_id,booking_id,supplier_id,service_type,
        reference_number,amount,currency,due_date,status,source_type,source_id,notes)
      VALUES(_org,bid,item.supplier_id,item.item_type,'QPO-'||item.id::text,item.total_cost,q.currency,
        q.travel_date,'draft','quote_items',item.id,'مستحق خدمة من عرض '||q.quote_number) RETURNING id INTO poid;
      IF NOT EXISTS(SELECT 1 FROM public.supplier_invoices WHERE payment_order_id=poid
        AND organization_id=_org AND supplier_id=item.supplier_id AND amount=item.total_cost AND currency=q.currency) THEN
        RAISE EXCEPTION 'تعذر تسجيل مستحق المورد؛ تم إلغاء التحويل بالكامل';
      END IF;
      supplier_count:=supplier_count+1;
    END IF;
  END LOOP;
  UPDATE public.quotes SET status='converted' WHERE id=q.id;
  INSERT INTO public.quote_booking_conversions(quote_id,organization_id,booking_id,invoice_id,discount_amount,source_snapshot,created_by)
    VALUES(q.id,_org,bid,iid,q.discount_amount,snapshot,auth.uid());
  UPDATE public.invoices SET quote_id=q.id,discount_amount=q.discount_amount,vat_rate=q.vat_rate WHERE id=iid;
  sync_result:=public.sync_booking_financials(bid);
  IF (sync_result->>'invoice_updated')::boolean IS NOT TRUE
    OR NOT EXISTS(SELECT 1 FROM public.invoices WHERE id=iid AND subtotal=sell AND final_amount=net+vat) THEN
    RAISE EXCEPTION 'تعذر مزامنة فاتورة العرض؛ تم إلغاء التحويل بالكامل';
  END IF;
  PERFORM public.run_booking_automation(bid);
  IF EXISTS(SELECT 1 FROM public.booking_automation_steps WHERE booking_id=bid
    AND step_key IN ('invoice','supplier_po','financial_snapshot') AND status='failed') THEN
    RAISE EXCEPTION 'لم تكتمل الأتمتة المالية؛ تم إلغاء التحويل بالكامل';
  END IF;
  RETURN jsonb_build_object('booking_id',bid,'invoice_id',iid,'already_converted',false,'supplier_order_count',supplier_count);
END $$;
REVOKE ALL ON FUNCTION public.convert_quote_atomic(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_atomic(uuid,uuid) TO authenticated;

-- Retire the unsafe second path while retaining its signature for old callers.
CREATE OR REPLACE FUNCTION public.convert_quote_to_bookings(p_quote_id uuid)
RETURNS TABLE(booking_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE org uuid; result jsonb;
BEGIN
  SELECT organization_id INTO org FROM public.quotes WHERE id=p_quote_id;
  result:=public.convert_quote_atomic(org,p_quote_id);
  RETURN QUERY SELECT (result->>'booking_id')::uuid;
END $$;
REVOKE ALL ON FUNCTION public.convert_quote_to_bookings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_bookings(uuid) TO authenticated;

-- Keep quote discounts in booking contribution; invoice retains gross subtotal
-- and its explicit discount. Ordinary bookings retain their original behavior.
CREATE OR REPLACE FUNCTION public.normalize_booking_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.revenue_recognition_mode IS NULL THEN
    SELECT s.default_revenue_recognition_mode
      INTO NEW.revenue_recognition_mode
    FROM public.organization_settings s
    WHERE s.organization_id = NEW.organization_id;
    NEW.revenue_recognition_mode := COALESCE(NEW.revenue_recognition_mode, 'principal_gross');
  END IF;

  IF NEW.revenue_recognition_mode NOT IN ('principal_gross', 'agent_net') THEN
    RAISE EXCEPTION 'Invalid revenue recognition mode';
  END IF;

  NEW.selling_price := COALESCE(NEW.selling_price, 0);
  NEW.cost_price := COALESCE(NEW.cost_price, 0);
  IF NEW.selling_price < 0 OR NEW.cost_price < 0 THEN
    RAISE EXCEPTION 'Booking selling price and supplier cost must be non-negative';
  END IF;
  NEW.profit := NEW.selling_price - NEW.cost_price;

  IF NOT COALESCE(NEW.is_demo, false)
     AND COALESCE(NEW.status, 'pending') IN ('confirmed', 'completed')
     AND NEW.cost_price > 0
     AND NEW.supplier_id IS NULL
     AND NOT public.quote_booking_supplier_coverage(NEW.id,NEW.organization_id,NEW.cost_price) THEN
    RAISE EXCEPTION 'A supplier is required before confirming a booking with supplier cost';
  END IF;

  IF COALESCE(NEW.status, 'pending') IN ('confirmed', 'completed')
     AND (
       NEW.selling_price <= 0 OR NEW.cost_price <= 0
       OR NEW.start_date IS NULL OR NEW.end_date IS NULL
       OR NEW.start_date > NEW.end_date
     ) THEN
    NEW.data_quality_status := 'incomplete';
  ELSIF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL
        AND NEW.start_date > NEW.end_date THEN
    NEW.data_quality_status := 'review_needed';
  ELSE
    NEW.data_quality_status := 'ok';
  END IF;

  RETURN NEW;
END;
$function$;

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
  v_quote_discount numeric := 0;
  r record;
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
    UNION ALL
    SELECT COALESCE(total_cost_customer, 0),
           COALESCE(cost_per_night, 0) * GREATEST(COALESCE(number_of_nights, 1), 1) * GREATEST(COALESCE(number_of_rooms, 1), 1)
    FROM public.hotel_bookings WHERE booking_id = p_booking_id
    UNION ALL
    SELECT COALESCE(total_cost, 0), COALESCE(supplier_cost, GREATEST(COALESCE(total_cost, 0) - COALESCE(total_profit, 0), 0))
    FROM public.flight_bookings WHERE booking_id = p_booking_id
    UNION ALL
    SELECT COALESCE(total_cost, 0), COALESCE(supplier_cost, GREATEST(COALESCE(total_cost, 0) - COALESCE(total_profit, 0), 0))
    FROM public.transport_bookings WHERE booking_id = p_booking_id
    UNION ALL
    SELECT COALESCE(total_rental_cost, 0), COALESCE(supplier_total_cost, GREATEST(COALESCE(total_rental_cost, 0) - COALESCE(total_profit, 0), 0))
    FROM public.car_rentals WHERE booking_id = p_booking_id
  ) s;

  v_base_sell := COALESCE(b.base_selling_price, GREATEST(COALESCE(b.selling_price, 0) - v_sell, 0));
  v_base_cost := COALESCE(b.base_cost_price, GREATEST(COALESCE(b.cost_price, 0) - v_cost, 0));
  v_total_sell := round(v_base_sell + v_sell, 2);
  v_total_cost := round(v_base_cost + v_cost, 2);

  SELECT COALESCE((SELECT discount_amount FROM public.quote_booking_conversions WHERE booking_id=p_booking_id),0) INTO v_quote_discount;
  IF v_total_sell < v_quote_discount THEN RAISE EXCEPTION 'Service total is below the converted quote discount'; END IF;

  UPDATE public.bookings
  SET selling_price = v_total_sell - v_quote_discount,
      cost_price = v_total_cost,
      profit = v_total_sell - v_quote_discount - v_total_cost,
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
    RETURN jsonb_build_object('booking_total', v_total_sell - v_quote_discount, 'invoice_updated', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.organization_id = v_inv.organization_id
      AND je.source_type = 'invoice'
      AND je.source_id = v_inv.id
      AND je.is_locked
  ) INTO v_locked;

  IF v_locked THEN
    RETURN jsonb_build_object('booking_total', v_total_sell - v_quote_discount, 'invoice_updated', false, 'reason', 'locked');
  END IF;

  DELETE FROM public.invoice_items WHERE invoice_id = v_inv.id;

  IF v_base_sell > 0 THEN
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
    UNION ALL
    SELECT 'فندق: ' || COALESCE(hotel_name, '') || ' - ' || COALESCE(internal_booking_number, '') ||
           CASE WHEN COALESCE(supplier_name, '') <> '' THEN ' (' || supplier_name || ')' ELSE '' END,
           COALESCE(total_cost_customer, 0)
    FROM public.hotel_bookings WHERE booking_id = p_booking_id AND COALESCE(total_cost_customer, 0) > 0
    UNION ALL
    SELECT 'طيران: ' || COALESCE(flight_number, '') || ' - ' || COALESCE(booking_reference, '') ||
           CASE WHEN COALESCE(supplier_name, '') <> '' THEN ' (' || supplier_name || ')' ELSE '' END,
           COALESCE(total_cost, 0)
    FROM public.flight_bookings WHERE booking_id = p_booking_id AND COALESCE(total_cost, 0) > 0
    UNION ALL
    SELECT 'نقل: ' || COALESCE(pickup_location, '') || ' → ' || COALESCE(dropoff_location, '') || ' - ' || COALESCE(booking_reference, '') ||
           CASE WHEN COALESCE(supplier_name, '') <> '' THEN ' (' || supplier_name || ')' ELSE '' END,
           COALESCE(total_cost, 0)
    FROM public.transport_bookings WHERE booking_id = p_booking_id AND COALESCE(total_cost, 0) > 0
    UNION ALL
    SELECT 'تأجير سيارة: ' || COALESCE(vehicle_model, '') || ' - ' || COALESCE(rental_reference, '') ||
           CASE WHEN COALESCE(supplier_name, '') <> '' THEN ' (' || supplier_name || ')' ELSE '' END,
           COALESCE(total_rental_cost, 0)
    FROM public.car_rentals WHERE booking_id = p_booking_id AND COALESCE(total_rental_cost, 0) > 0
  LOOP
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, total_price)
    VALUES (v_inv.id, r.label, 1, r.selling_amount, r.selling_amount);
  END LOOP;

  UPDATE public.invoices
  SET subtotal = v_total_sell,
      updated_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'booking_total', v_total_sell - v_quote_discount,
    'invoice_id', v_inv.id,
    'invoice_updated', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_quote_booking_supplier() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.supplier_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.quote_booking_conversions
   WHERE booking_id=NEW.id) THEN
   RAISE EXCEPTION 'موردو هذا الحجز محددون لكل خدمة؛ لا يمكن تحميل مورد واحد إجمالي التكلفة' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_quote_booking_supplier() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_quote_booking_supplier ON public.bookings;
CREATE TRIGGER guard_quote_booking_supplier BEFORE UPDATE OF supplier_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_booking_supplier();

-- Stale frontends must fail before their first write, rather than create legacy
-- rows and only discover the immutable quote when they update its status last.
CREATE OR REPLACE FUNCTION public.guard_quote_conversion_links() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent uuid; c public.quote_booking_conversions%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME='invoices' THEN
    SELECT * INTO c FROM public.quote_booking_conversions WHERE booking_id=NEW.booking_id;
    IF FOUND AND NEW.id IS DISTINCT FROM c.invoice_id THEN
      RAISE EXCEPTION 'هذا الحجز له فاتورة تحويل بالفعل' USING ERRCODE='22023';
    END IF;
  END IF;
  FOR parent IN SELECT DISTINCT x FROM unnest(ARRAY[
    CASE WHEN TG_OP='UPDATE' THEN OLD.quote_id END,NEW.quote_id]) x WHERE x IS NOT NULL ORDER BY x LOOP
    PERFORM 1 FROM public.quotes WHERE id=parent FOR UPDATE;
    SELECT * INTO c FROM public.quote_booking_conversions WHERE quote_id=parent;
    IF FOUND THEN
      IF TG_OP='UPDATE' AND TG_TABLE_NAME='bookings' AND NEW.id=c.booking_id
        AND NEW.quote_id=parent AND NEW.organization_id=c.organization_id THEN CONTINUE; END IF;
      IF TG_OP='UPDATE' AND TG_TABLE_NAME='invoices' AND NEW.id=c.invoice_id
        AND NEW.quote_id=parent AND NEW.organization_id=c.organization_id AND NEW.booking_id=c.booking_id THEN CONTINUE; END IF;
      RAISE EXCEPTION 'العرض محوّل بالفعل؛ لا يمكن إنشاء أو نقل روابط إضافية' USING ERRCODE='22023';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_quote_conversion_links() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['bookings','invoices','hotel_bookings','flight_bookings','transport_bookings','car_rentals'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_quote_conversion_links ON public.%I',t);
    EXECUTE format('CREATE TRIGGER guard_quote_conversion_links BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_quote_conversion_links()',t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_quote_supplier_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.source_type='quote_items' AND EXISTS(SELECT 1 FROM public.quote_booking_conversions WHERE booking_id=OLD.booking_id) THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'لا يمكن حذف مستحق خدمة محوّلة' USING ERRCODE='22023'; END IF;
   IF ROW(NEW.booking_id,NEW.organization_id,NEW.supplier_id,NEW.amount,NEW.currency,NEW.source_type,NEW.source_id)
      IS DISTINCT FROM ROW(OLD.booking_id,OLD.organization_id,OLD.supplier_id,OLD.amount,OLD.currency,OLD.source_type,OLD.source_id) THEN
     RAISE EXCEPTION 'تعديل مستحق الخدمة يحتاج مستند تصحيح' USING ERRCODE='22023';
   END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_quote_supplier_order() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_quote_supplier_order ON public.supplier_payment_orders;
CREATE TRIGGER guard_quote_supplier_order BEFORE UPDATE OR DELETE ON public.supplier_payment_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_supplier_order();
