-- Versioned deployment SQL: apply transactionally before publishing the UI.
-- Creates no business records and does not repair historical incomplete bookings.
CREATE TABLE IF NOT EXISTS public.booking_creation_requests (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  request_id uuid NOT NULL,
  created_by uuid NOT NULL,
  request_payload jsonb NOT NULL,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organization_id,request_id)
);
ALTER TABLE public.booking_creation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_creation_requests FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_booking_atomic(_org uuid,_request_id uuid,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  previous public.booking_creation_requests%ROWTYPE; b public.bookings%ROWTYPE;
  kind text; detail_key text; detail_table text; required_name text;
  allowed text[]; d jsonb; k text; value numeric; sell numeric; cost numeric;
  start_on date; end_on date; detail_start date; detail_end date; start_key text; end_key text;
  customer uuid; customer_label text; customer_phone text; customer_email text; supplier uuid; supplier_label text; employee uuid;
  currency_code text; matches bigint; invoice uuid; detail_id uuid;
  columns_sql text; values_sql text; sync_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_org)
    OR NOT COALESCE(public.can_org_write(_org),false)
    OR NOT COALESCE(public.has_org_permission(_org,'bookings_create'),false)
    OR NOT COALESCE(public.has_org_permission(_org,'invoices_create'),false)
    OR NOT COALESCE(public.has_org_permission(_org,'customers_view'),false) THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء الحجز وفاتورته في هذه الشركة' USING ERRCODE='42501';
  END IF;
  IF _request_id IS NULL OR jsonb_typeof(_payload) IS DISTINCT FROM 'object'
    OR octet_length(_payload::text)>100000 THEN
    RAISE EXCEPTION 'طلب إنشاء الحجز غير صالح' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:'||_org::text||':'||_request_id::text,0));
  SELECT * INTO previous FROM public.booking_creation_requests
    WHERE organization_id=_org AND request_id=_request_id;
  IF FOUND THEN
    IF previous.created_by IS DISTINCT FROM auth.uid() OR previous.request_payload IS DISTINCT FROM _payload THEN
      RAISE EXCEPTION 'مفتاح الحفظ مستخدم لطلب أو مستخدم آخر' USING ERRCODE='22023';
    END IF;
    SELECT * INTO b FROM public.bookings WHERE id=previous.booking_id AND organization_id=_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'تعذر استرجاع الحجز المحفوظ' USING ERRCODE='22023'; END IF;
    RETURN to_jsonb(b)||jsonb_build_object('invoice_id',previous.invoice_id,'already_created',true);
  END IF;
  FOR k IN SELECT jsonb_object_keys(_payload) LOOP
    IF NOT k=ANY(ARRAY['booking_type','customer_id','customer_name','customer_phone','customer_email','supplier_id','supplier_name','employee_id',
      'selling_price','cost_price','currency','start_date','end_date','notes',
      'hotelDetails','flightDetails','carDetails','transportDetails']) THEN
      RAISE EXCEPTION 'حقل غير مسموح في طلب الحجز: %',k USING ERRCODE='22023';
    END IF;
  END LOOP;
  kind:=_payload->>'booking_type';
  CASE kind
    WHEN 'hotel' THEN
      detail_key:='hotelDetails'; detail_table:='booking_hotel_details'; required_name:='hotel_name';
      start_key:='check_in'; end_key:='check_out';
      allowed:=ARRAY['hotel_name','room_type','board_type','check_in','check_out','nights','rooms','star_rating',
        'city','adults','children','children_ages','meal_plan','cancellation_policy','booking_reference'];
    WHEN 'flight' THEN
      detail_key:='flightDetails'; detail_table:='booking_flight_details'; required_name:='airline';
      start_key:='departure_date'; end_key:='arrival_date';
      allowed:=ARRAY['airline','flight_number','departure_airport','arrival_airport','departure_date','departure_time',
        'arrival_date','arrival_time','ticket_number','pnr','passengers_count','flight_class','ticket_price_per_person',
        'taxes_and_fees','is_round_trip','seat_preferences','meal_preferences'];
    WHEN 'car_rental' THEN
      detail_key:='carDetails'; detail_table:='booking_car_details'; required_name:='car_type';
      start_key:='pickup_date'; end_key:='dropoff_date';
      allowed:=ARRAY['car_type','pickup_location','dropoff_location','pickup_date','dropoff_date','daily_rate','insurance_included'];
    WHEN 'transport' THEN
      detail_key:='transportDetails'; detail_table:='booking_transport_details'; required_name:='vehicle_type';
      allowed:=ARRAY['vehicle_type','route','pickup_point','dropoff_point','passengers'];
    ELSE RAISE EXCEPTION 'نوع الحجز غير مدعوم' USING ERRCODE='22023';
  END CASE;
  d:=_payload->detail_key;
  IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR NULLIF(btrim(d->>required_name),'') IS NULL THEN
    RAISE EXCEPTION 'أكمل تفاصيل الخدمة المطلوبة قبل حفظ الحجز' USING ERRCODE='22023';
  END IF;
  FOR k IN SELECT jsonb_object_keys(d) LOOP
    IF NOT k=ANY(allowed) THEN RAISE EXCEPTION 'حقل غير مسموح في تفاصيل الخدمة: %',k USING ERRCODE='22023'; END IF;
    IF jsonb_typeof(d->k) IN ('object','array') THEN
      RAISE EXCEPTION 'قيمة غير صالحة في تفاصيل الخدمة: %',k USING ERRCODE='22023';
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['hotelDetails','flightDetails','carDetails','transportDetails'] LOOP
    IF k<>detail_key AND _payload ? k AND _payload->k<>'null'::jsonb THEN
      RAISE EXCEPTION 'تفاصيل الخدمة لا تطابق نوع الحجز' USING ERRCODE='22023';
    END IF;
  END LOOP;
  -- Empty optional controls mean absent; database defaults still apply.
  SELECT COALESCE(jsonb_object_agg(key,val),'{}'::jsonb) INTO d
    FROM jsonb_each(d) e(key,val) WHERE val<>'null'::jsonb AND val<>'""'::jsonb;
  FOREACH k IN ARRAY ARRAY['rooms','adults','children','passengers_count','passengers','star_rating','nights'] LOOP
    IF d ? k THEN
      value:=(d->>k)::numeric;
      IF value::text IN ('NaN','Infinity','-Infinity') OR value<>trunc(value) OR value>100000
        OR value<(CASE WHEN k='children' THEN 0 ELSE 1 END) OR (k='star_rating' AND value>5) THEN
        RAISE EXCEPTION 'عدد غير صالح في تفاصيل الخدمة: %',k USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['daily_rate','ticket_price_per_person','taxes_and_fees'] LOOP
    IF d ? k THEN
      value:=(d->>k)::numeric;
      IF value::text IN ('NaN','Infinity','-Infinity') OR value<0 THEN
        RAISE EXCEPTION 'سعر غير صالح في تفاصيل الخدمة: %',k USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['insurance_included','is_round_trip'] LOOP
    IF d ? k AND jsonb_typeof(d->k)<>'boolean' THEN
      RAISE EXCEPTION 'قيمة اختيار غير صالحة: %',k USING ERRCODE='22023';
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['departure_time','arrival_time'] LOOP
    IF d ? k AND d->>k !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' THEN
      RAISE EXCEPTION 'وقت غير صالح: %',k USING ERRCODE='22023';
    END IF;
  END LOOP;
  start_on:=NULLIF(_payload->>'start_date','')::date;
  end_on:=NULLIF(_payload->>'end_date','')::date;
  IF start_key IS NOT NULL THEN
    detail_start:=(d->>start_key)::date; detail_end:=(d->>end_key)::date;
    IF (start_on IS NOT NULL AND detail_start IS NOT NULL AND start_on<>detail_start)
      OR (end_on IS NOT NULL AND detail_end IS NOT NULL AND end_on<>detail_end) THEN
      RAISE EXCEPTION 'تواريخ الحجز لا تطابق تواريخ الخدمة' USING ERRCODE='22023';
    END IF;
    start_on:=COALESCE(start_on,detail_start); end_on:=COALESCE(end_on,detail_end);
  END IF;
  IF start_on IS NULL OR end_on IS NULL OR NOT isfinite(start_on) OR NOT isfinite(end_on)
    OR start_on>end_on OR (kind='hotel' AND start_on=end_on) THEN
    RAISE EXCEPTION 'أدخل تاريخ بداية ونهاية صحيحين للحجز' USING ERRCODE='22023';
  END IF;
  IF start_key IS NOT NULL THEN d:=d||jsonb_build_object(start_key,start_on,end_key,end_on); END IF;
  IF kind='hotel' THEN d:=d||jsonb_build_object('nights',end_on-start_on); END IF;
  sell:=(_payload->>'selling_price')::numeric; cost:=(_payload->>'cost_price')::numeric;
  IF sell IS NULL OR cost IS NULL OR sell::text IN ('NaN','Infinity','-Infinity')
    OR cost::text IN ('NaN','Infinity','-Infinity') OR sell<=0 OR cost<0 OR round(sell,2)<=0 THEN
    RAISE EXCEPTION 'أدخل إجمالي بيع موجب وتكلفة غير سالبة' USING ERRCODE='22023';
  END IF;
  sell:=round(sell,2); cost:=round(cost,2);
  currency_code:=upper(NULLIF(btrim(_payload->>'currency'),''));
  IF currency_code IS NULL THEN
    SELECT currency INTO currency_code FROM public.organization_settings WHERE organization_id=_org;
  END IF;
  IF currency_code IS NULL OR currency_code !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'حدد عملة الحجز' USING ERRCODE='22023';
  END IF;
  supplier:=NULLIF(_payload->>'supplier_id','')::uuid;
  IF cost>0 AND supplier IS NULL THEN
    RAISE EXCEPTION 'حدد مورد الخدمة لتسجيل التكلفة المستحقة' USING ERRCODE='22023';
  END IF;
  IF supplier IS NOT NULL THEN
    SELECT name INTO supplier_label FROM public.suppliers WHERE id=supplier AND organization_id=_org AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'المورد غير متاح في الشركة' USING ERRCODE='22023'; END IF;
  END IF;
  employee:=NULLIF(_payload->>'employee_id','')::uuid;
  IF employee IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.employees WHERE id=employee AND organization_id=_org AND is_active) THEN
    RAISE EXCEPTION 'الموظف غير متاح في الشركة' USING ERRCODE='22023';
  END IF;
  customer:=NULLIF(_payload->>'customer_id','')::uuid;
  customer_label:=NULLIF(btrim(_payload->>'customer_name'),'');
  customer_phone:=NULLIF(btrim(_payload->>'customer_phone'),'');
  customer_email:=NULLIF(btrim(_payload->>'customer_email'),'');
  IF customer IS NULL THEN
    IF customer_label IS NULL THEN RAISE EXCEPTION 'اختر العميل أو أدخل اسمه' USING ERRCODE='22023'; END IF;
    -- Exact name matching avoids treating % or _ as wildcards and serializes
    -- quick creation of the same name through this API.
    PERFORM pg_advisory_xact_lock(hashtextextended('booking-customer:'||_org::text||':'||lower(customer_label),0));
    SELECT count(*),(array_agg(id))[1] INTO matches,customer FROM public.customers
      WHERE organization_id=_org AND lower(btrim(name))=lower(customer_label);
    -- Contact data means explicit new-customer entry. Never attach it to a
    -- same-name person; existing identity/duplicate triggers validate the insert.
    IF customer_phone IS NOT NULL OR customer_email IS NOT NULL THEN matches:=0; customer:=NULL; END IF;
    IF matches>1 THEN RAISE EXCEPTION 'يوجد أكثر من عميل بهذا الاسم؛ اختر سجل العميل من البحث' USING ERRCODE='22023'; END IF;
    IF matches=0 THEN
      IF customer_phone IS NULL AND customer_email IS NULL THEN
        RAISE EXCEPTION 'العميل جديد؛ أدخل رقم هاتف أو بريدًا إلكترونيًا' USING ERRCODE='22023';
      END IF;
      IF NOT COALESCE(public.has_org_permission(_org,'customers_create'),false) THEN
        RAISE EXCEPTION 'إضافة عميل جديد تحتاج صلاحية إنشاء العملاء' USING ERRCODE='42501';
      END IF;
      INSERT INTO public.customers(organization_id,name,phone,email)
        VALUES(_org,customer_label,customer_phone,customer_email) RETURNING id INTO customer;
    END IF;
  END IF;
  SELECT name INTO customer_label FROM public.customers WHERE id=customer AND organization_id=_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'العميل غير متاح في الشركة' USING ERRCODE='22023'; END IF;
  INSERT INTO public.bookings(organization_id,booking_number,booking_type,customer_id,customer_name,
    supplier_id,supplier_name,employee_id,selling_price,cost_price,base_selling_price,base_cost_price,
    currency,start_date,end_date,notes,status)
  VALUES(_org,'BK-'||_request_id::text,kind,customer,customer_label,supplier,supplier_label,employee,
    sell,cost,0,0,currency_code,start_on,end_on,NULLIF(_payload->>'notes',''),'pending') RETURNING * INTO b;
  -- Identifiers and financial totals cannot be supplied inside the detail object.
  -- Both table and column identifiers come from the fixed allowlists above.
  d:=d||jsonb_build_object('booking_id',b.id,'selling_amount',sell,'cost_amount',cost);
  SELECT string_agg(format('%I',key),',' ORDER BY key),string_agg(format('r.%I',key),',' ORDER BY key)
    INTO columns_sql,values_sql FROM jsonb_object_keys(d) e(key);
  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r RETURNING id',
    detail_table,columns_sql,values_sql,detail_table) INTO detail_id USING d;
  sync_result:=public.sync_booking_financials(b.id);
  IF (sync_result->>'invoice_updated')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'لم تكتمل فاتورة الحجز؛ لم يتم حفظ أي جزء من الطلب' USING ERRCODE='22023';
  END IF;
  SELECT count(*),(array_agg(id))[1] INTO matches,invoice FROM public.invoices
    WHERE booking_id=b.id AND COALESCE(status,'draft')<>'cancelled';
  IF matches<>1 OR NOT EXISTS(SELECT 1 FROM public.invoices WHERE id=invoice AND organization_id=_org
    AND customer_id=customer AND currency=currency_code AND subtotal=sell AND final_amount=sell) THEN
    RAISE EXCEPTION 'فاتورة الحجز غير متسقة؛ لم يتم حفظ الطلب' USING ERRCODE='22023';
  END IF;
  IF cost>0 AND NOT EXISTS(SELECT 1 FROM public.supplier_payment_orders p
    JOIN public.supplier_invoices s ON s.payment_order_id=p.id
    WHERE p.booking_id=b.id AND p.source_type='bookings' AND p.source_id=b.id
      AND p.organization_id=_org AND p.supplier_id=supplier AND p.amount=cost AND p.currency=currency_code
      AND s.organization_id=_org AND s.supplier_id=supplier AND s.amount=cost AND s.currency=currency_code) THEN
    RAISE EXCEPTION 'لم تكتمل مستحقات المورد؛ لم يتم حفظ الطلب' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.booking_automation_steps WHERE booking_id=b.id
    AND step_key IN ('invoice','supplier_po','voucher','financial_snapshot') AND status='failed') THEN
    RAISE EXCEPTION 'لم تكتمل مستندات الحجز؛ لم يتم حفظ الطلب' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.booking_creation_requests(organization_id,request_id,created_by,request_payload,booking_id,invoice_id)
    VALUES(_org,_request_id,auth.uid(),_payload,b.id,invoice);
  SELECT * INTO b FROM public.bookings WHERE id=b.id;
  RETURN to_jsonb(b)||jsonb_build_object('invoice_id',invoice,'already_created',false);
EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'راجع تنسيق الأرقام والتواريخ والمراجع في الحجز' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION public.create_booking_atomic(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,uuid,jsonb) TO authenticated;
