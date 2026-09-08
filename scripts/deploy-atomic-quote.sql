-- Reviewed schema deployment script. Run as a privileged database operator.
-- Apply before publishing the frontend; does not rewrite historical quotes.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS creation_request_id uuid;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS creation_request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_creation_request_unique
  ON public.quotes(organization_id,creation_request_id)
  WHERE creation_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_quote_atomic(
  _org uuid, _request_id uuid, _payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q public.quotes%ROWTYPE;
  item jsonb;
  normalized_items jsonb := '[]'::jsonb;
  customer uuid; employee uuid; supplier uuid;
  customer_label text; currency_code text; state text;
  departure date; arrival date; expiry date;
  travelers numeric; quantity numeric; cost numeric; selling numeric;
  discount numeric; vat_rate numeric; vat numeric; subtotal numeric := 0;
  costs numeric := 0; item_cost numeric; item_sell numeric; position integer := 0;
BEGIN
  IF auth.uid() IS NULL OR _org IS NULL
    OR NOT COALESCE(public.can_org_write(_org),false)
    OR NOT COALESCE(public.has_org_permission(_org,'quotes_create'),false) THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء عروض الأسعار' USING ERRCODE='42501';
  END IF;
  IF _request_id IS NULL OR jsonb_typeof(_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'بيانات عرض السعر غير صحيحة' USING ERRCODE='22023';
  END IF;
  -- A retry with the same key is serialized, including concurrent requests.
  PERFORM pg_advisory_xact_lock(hashtextextended(_org::text||_request_id::text,0));
  SELECT * INTO q FROM public.quotes
    WHERE organization_id=_org AND creation_request_id=_request_id;
  IF FOUND THEN
    IF q.created_by IS DISTINCT FROM auth.uid()
      OR q.creation_request_hash IS DISTINCT FROM md5(_payload::text) THEN
      RAISE EXCEPTION 'مفتاح الطلب مستخدم لعرض مختلف' USING ERRCODE='22023';
    END IF;
    RETURN to_jsonb(q);
  END IF;

  IF jsonb_typeof(_payload->'items') IS DISTINCT FROM 'array'
    OR jsonb_array_length(_payload->'items') NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'أضف من بند واحد إلى 500 بند' USING ERRCODE='22023';
  END IF;
  customer := NULLIF(_payload->>'customer_id','')::uuid;
  employee := NULLIF(_payload->>'assigned_employee_id','')::uuid;
  customer_label := NULLIF(btrim(_payload->>'customer_name'),'');
  IF customer IS NOT NULL THEN
    SELECT name INTO customer_label FROM public.customers
      WHERE id=customer AND organization_id=_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'العميل لا يتبع الشركة' USING ERRCODE='22023'; END IF;
  ELSIF customer_label IS NULL THEN
    RAISE EXCEPTION 'اختر العميل أو أدخل اسمه' USING ERRCODE='22023';
  END IF;
  IF employee IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.employees
    WHERE id=employee AND organization_id=_org AND is_active=true) THEN
    RAISE EXCEPTION 'الموظف غير متاح في الشركة' USING ERRCODE='22023';
  END IF;
  SELECT upper(NULLIF(btrim(currency),'')) INTO currency_code
    FROM public.organization_settings WHERE organization_id=_org;
  IF currency_code IS NULL OR currency_code !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'اضبط عملة الشركة أولاً' USING ERRCODE='22023';
  END IF;
  state := COALESCE(_payload->>'status','draft');
  IF state NOT IN ('draft','sent') THEN
    RAISE EXCEPTION 'حالة الإنشاء يجب أن تكون مسودة أو مرسلة' USING ERRCODE='22023';
  END IF;
  departure := NULLIF(_payload->>'travel_date','')::date;
  arrival := NULLIF(_payload->>'return_date','')::date;
  expiry := NULLIF(_payload->>'valid_until','')::date;
  IF departure::text IN ('infinity','-infinity') OR arrival::text IN ('infinity','-infinity')
    OR expiry::text IN ('infinity','-infinity') OR arrival < departure THEN
    RAISE EXCEPTION 'تواريخ العرض غير صحيحة' USING ERRCODE='22023';
  END IF;
  travelers := COALESCE((_payload->>'number_of_travelers')::numeric,1);
  discount := COALESCE((_payload->>'discount_amount')::numeric,0);
  vat_rate := COALESCE((_payload->>'vat_rate')::numeric,0);
  IF travelers::text IN ('NaN','Infinity','-Infinity') OR travelers < 1
    OR travelers > 100000 OR travelers <> trunc(travelers)
    OR discount::text IN ('NaN','Infinity','-Infinity') OR discount < 0
    OR vat_rate::text IN ('NaN','Infinity','-Infinity') OR vat_rate < 0 OR vat_rate > 100 THEN
    RAISE EXCEPTION 'عدد المسافرين أو الخصم أو الضريبة غير صحيح' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(_payload->'items') LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR COALESCE(item->>'item_type','') NOT IN ('hotel','flight','transport','car_rental','service')
      OR NULLIF(btrim(item->>'description'),'') IS NULL
      OR (item ? 'details' AND jsonb_typeof(item->'details') IS DISTINCT FROM 'object') THEN
      RAISE EXCEPTION 'نوع أو وصف أو تفاصيل البند غير صحيحة' USING ERRCODE='22023';
    END IF;
    quantity := (item->>'quantity')::numeric;
    cost := (item->>'cost_price')::numeric;
    selling := (item->>'selling_price')::numeric;
    IF quantity IS NULL OR cost IS NULL OR selling IS NULL
      OR quantity::text IN ('NaN','Infinity','-Infinity')
      OR cost::text IN ('NaN','Infinity','-Infinity')
      OR selling::text IN ('NaN','Infinity','-Infinity')
      OR quantity < 1 OR quantity > 100000 OR quantity <> trunc(quantity)
      OR cost < 0 OR selling < 0 OR cost > 1000000000000 OR selling > 1000000000000 THEN
      RAISE EXCEPTION 'كمية أو أسعار البند غير صحيحة' USING ERRCODE='22023';
    END IF;
    supplier := NULLIF(item->>'supplier_id','')::uuid;
    IF supplier IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.suppliers
      WHERE id=supplier AND organization_id=_org) THEN
      RAISE EXCEPTION 'المورد لا يتبع الشركة' USING ERRCODE='22023';
    END IF;
    item_cost := round(cost*quantity,2); item_sell := round(selling*quantity,2);
    costs := costs+item_cost; subtotal := subtotal+item_sell;
    normalized_items := normalized_items || jsonb_build_array(jsonb_build_object(
      'item_type',item->>'item_type','description',btrim(item->>'description'),
      'supplier_id',supplier,'cost_price',cost,'selling_price',selling,
      'quantity',quantity,'total_cost',item_cost,'total_selling',item_sell,
      'details',COALESCE(item->'details','{}'::jsonb),'sort_order',position));
    position := position+1;
  END LOOP;
  discount := round(discount,2);
  IF discount > subtotal THEN
    RAISE EXCEPTION 'الخصم أكبر من قيمة العرض' USING ERRCODE='22023';
  END IF;
  vat := round((subtotal-discount)*vat_rate/100,2);
  INSERT INTO public.quotes(organization_id,quote_number,customer_id,customer_name,
    status,travel_date,return_date,destination,number_of_travelers,notes,
    subtotal,discount_amount,vat_rate,vat_amount,total_amount,total_cost,total_profit,
    valid_until,assigned_employee_id,created_by,currency,creation_request_id,creation_request_hash)
  VALUES(_org,public.generate_quote_number(),customer,customer_label,state,departure,arrival,
    NULLIF(btrim(_payload->>'destination'),''),travelers::integer,NULLIF(_payload->>'notes',''),
    subtotal,discount,vat_rate,vat,subtotal-discount+vat,costs,subtotal-discount-costs,
    expiry,employee,auth.uid(),currency_code,_request_id,md5(_payload::text)) RETURNING * INTO q;
  INSERT INTO public.quote_items(quote_id,organization_id,item_type,description,supplier_id,
    cost_price,selling_price,quantity,total_cost,total_selling,details,sort_order)
  SELECT q.id,_org,x.item_type,x.description,x.supplier_id,x.cost_price,x.selling_price,
    x.quantity,x.total_cost,x.total_selling,x.details,x.sort_order
  FROM jsonb_to_recordset(normalized_items) AS x(item_type text,description text,
    supplier_id uuid,cost_price numeric,selling_price numeric,quantity integer,
    total_cost numeric,total_selling numeric,details jsonb,sort_order integer);
  RETURN to_jsonb(q);
END;
$$;
REVOKE ALL ON FUNCTION public.create_quote_atomic(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_quote_atomic(uuid,uuid,jsonb) TO authenticated;
