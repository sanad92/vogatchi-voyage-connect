BEGIN;

ALTER TABLE public.bookings ADD COLUMN cancellation_terms jsonb;
ALTER TABLE public.supplier_payment_orders
  ADD COLUMN supplier_due_at timestamptz,
  ADD COLUMN supplier_due_timezone text,
  ADD COLUMN planned_payment_date date;

CREATE FUNCTION trip_amendment_private.local_cancellation_time(_value text, _zone text)
RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE wall timestamp;
DECLARE instant timestamptz;
BEGIN
  IF _value IS NULL OR _value = '' THEN RETURN NULL; END IF;
  IF _value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' THEN
    RAISE EXCEPTION 'راجع تاريخ وساعة شروط الإلغاء والسداد' USING ERRCODE = '22023';
  END IF;
  wall := _value::timestamp;
  instant := wall AT TIME ZONE _zone;
  IF instant AT TIME ZONE _zone <> wall THEN
    RAISE EXCEPTION 'الساعة المختارة غير متاحة في هذه المنطقة الزمنية' USING ERRCODE = '22023';
  END IF;
  RETURN instant;
END
$$;

CREATE FUNCTION trip_amendment_private.validate_cancellation_terms(_terms jsonb, _supplier_cost numeric, _customer_price numeric)
RETURNS void LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE zone text := _terms->>'timezone';
DECLARE party text;
DECLARE policy jsonb;
DECLARE entry jsonb;
DECLARE amount numeric;
DECLARE basis numeric;
DECLARE due timestamptz;
DECLARE starts timestamptz;
DECLARE previous_start timestamptz;
DECLARE planned date;
BEGIN
  IF _terms IS NULL THEN RETURN; END IF;
  IF jsonb_typeof(_terms) IS DISTINCT FROM 'object' OR octet_length(_terms::text) > 12000
    OR NOT EXISTS (SELECT FROM pg_timezone_names WHERE name = zone) THEN
    RAISE EXCEPTION 'راجع المنطقة الزمنية لشروط الحجز' USING ERRCODE = '22023';
  END IF;
  due := trip_amendment_private.local_cancellation_time(_terms->>'payment_due', zone);
  IF nullif(_terms->>'planned_payment', '') IS NOT NULL THEN
    IF (_terms->>'planned_payment') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'تاريخ الدفع المخطط غير صالح' USING ERRCODE = '22023';
    END IF;
    planned := (_terms->>'planned_payment')::date;
    IF due IS NULL OR planned > (due AT TIME ZONE zone)::date THEN
      RAISE EXCEPTION 'موعد الدفع المخطط لازم يكون في يوم الاستحقاق أو قبله' USING ERRCODE = '22023';
    END IF;
  END IF;
  FOREACH party IN ARRAY ARRAY['supplier','customer'] LOOP
    policy := _terms->party;
    basis := CASE party WHEN 'supplier' THEN _supplier_cost ELSE _customer_price END;
    IF jsonb_typeof(policy) IS DISTINCT FROM 'object'
      OR coalesce(policy->>'kind','') NOT IN ('pending','free_until','penalty','non_refundable')
      OR jsonb_typeof(policy->'rules') IS DISTINCT FROM 'array'
      OR jsonb_array_length(policy->'rules') > 10 THEN
      RAISE EXCEPTION 'راجع سياسة الإلغاء ومراحل الغرامة' USING ERRCODE = '22023';
    END IF;
    IF policy->>'kind' = 'pending' THEN CONTINUE; END IF;
    previous_start := NULL;
    IF policy->>'kind' = 'free_until' THEN
      previous_start := trip_amendment_private.local_cancellation_time(policy->>'free_until', zone);
      IF previous_start IS NULL THEN RAISE EXCEPTION 'حدّد آخر موعد للإلغاء المجاني' USING ERRCODE = '22023'; END IF;
    END IF;
    FOR entry IN SELECT value FROM jsonb_array_elements(jsonb_build_array(policy) || policy->'rules') LOOP
      IF coalesce(entry->>'unit','') NOT IN ('fixed','percent')
        OR coalesce(entry->>'value','') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' THEN
        RAISE EXCEPTION 'أدخل غرامة صالحة أو نسبة من ٠ إلى ١٠٠' USING ERRCODE = '22023';
      END IF;
      amount := (entry->>'value')::numeric;
      IF (entry->>'unit' = 'percent' AND amount > 100) OR (entry->>'unit' = 'fixed' AND amount > basis) THEN
        RAISE EXCEPTION 'الغرامة تتجاوز قيمة الخدمة' USING ERRCODE = '22023';
      END IF;
      IF entry ? 'from' THEN
        starts := trip_amendment_private.local_cancellation_time(entry->>'from', zone);
        IF starts IS NULL OR starts <= previous_start THEN
          RAISE EXCEPTION 'رتّب مواعيد مراحل الغرامة من الأقدم للأحدث' USING ERRCODE = '22023';
        END IF;
        previous_start := starts;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

CREATE FUNCTION trip_amendment_private.booking_cancellation_fee(_policy jsonb, _zone text, _basis numeric, _at timestamptz)
RETURNS numeric LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE fee jsonb := _policy;
DECLARE rule jsonb;
BEGIN
  IF _policy IS NULL OR _policy->>'kind' = 'pending' THEN RETURN NULL; END IF;
  IF _policy->>'kind' = 'free_until'
    AND _at < trip_amendment_private.local_cancellation_time(_policy->>'free_until', _zone) THEN RETURN 0; END IF;
  FOR rule IN SELECT value FROM jsonb_array_elements(_policy->'rules') LOOP
    EXIT WHEN _at < trip_amendment_private.local_cancellation_time(rule->>'from', _zone);
    fee := rule;
  END LOOP;
  RETURN CASE fee->>'unit' WHEN 'percent' THEN round(_basis * (fee->>'value')::numeric / 100, 2)
    ELSE (fee->>'value')::numeric END;
END
$$;

-- Copy the agreed terms onto the booking before its financial automation runs.
-- Each item keeps its own terms. Older callers and quotes without terms work as before.
DO $creation$
DECLARE definition text;
DECLARE anchor text;
BEGIN
  definition := pg_get_functiondef('public.create_booking_atomic(uuid,uuid,jsonb)'::regprocedure);
  anchor := '''end_date'',''notes'',';
  IF strpos(definition, anchor) = 0 THEN RAISE EXCEPTION 'Unexpected booking fields'; END IF;
  definition := replace(definition, anchor, anchor || '''cancellation_terms'',');
  anchor := 'currency,start_date,end_date,notes,status)';
  IF strpos(definition, anchor) = 0 THEN RAISE EXCEPTION 'Unexpected booking columns'; END IF;
  definition := replace(definition, anchor, 'currency,start_date,end_date,notes,status,cancellation_terms)');
  anchor := '''pending'') RETURNING * INTO b;';
  IF strpos(definition, anchor) = 0 THEN RAISE EXCEPTION 'Unexpected booking values'; END IF;
  EXECUTE replace(definition, anchor, $values$'pending', CASE WHEN nullif(_payload->'cancellation_terms','null') IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object('label',d->>required_name,'terms',_payload->'cancellation_terms',
      'selling',sell,'cost',cost,'currency',currency_code)) END) RETURNING * INTO b;$values$);

  definition := pg_get_functiondef('public.convert_quote_atomic(uuid,uuid)'::regprocedure);
  anchor := 'start_date,end_date,notes,quote_id,status)';
  IF strpos(definition, anchor) = 0 THEN RAISE EXCEPTION 'Unexpected quote booking columns'; END IF;
  definition := replace(definition, anchor, 'start_date,end_date,notes,quote_id,status,cancellation_terms)');
  anchor := 'q.id,''pending'') RETURNING id INTO bid;';
  IF strpos(definition, anchor) = 0 THEN RAISE EXCEPTION 'Unexpected quote booking values'; END IF;
  EXECUTE replace(definition, anchor, $values$q.id,'pending',(
    SELECT CASE WHEN bool_or(nullif(i.details->'cancellation_terms','null') IS NOT NULL) THEN
      jsonb_agg(jsonb_build_object('source_id',i.id,'label',i.description,
        'terms',nullif(i.details->'cancellation_terms','null'),'selling',i.total_selling,'cost',i.total_cost,'currency',q.currency)
        ORDER BY i.sort_order,i.id) END
    FROM public.quote_items i WHERE i.quote_id = q.id AND i.organization_id = _org
  )) RETURNING id INTO bid;$values$);
END
$creation$;

-- The saved terms are a snapshot. They are validated on the original insert
-- and cannot be silently replaced by editing an existing booking.
CREATE FUNCTION trip_amendment_private.guard_booking_cancellation_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE service jsonb;
DECLARE terms jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.cancellation_terms IS DISTINCT FROM OLD.cancellation_terms THEN
      RAISE EXCEPTION 'شروط الإلغاء المسجلة جزء من ملف الحجز المعتمد' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.cancellation_terms IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.cancellation_terms) IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.cancellation_terms) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'راجع شروط الإلغاء المسجلة للخدمات' USING ERRCODE = '22023';
  END IF;
  FOR service IN SELECT value FROM jsonb_array_elements(NEW.cancellation_terms) LOOP
    terms := nullif(service->'terms','null');
    IF service->>'currency' IS DISTINCT FROM NEW.currency
      OR coalesce(service->>'cost','') !~ '^[0-9]+(\.[0-9]+)?$'
      OR coalesce(service->>'selling','') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'شروط الإلغاء غير مطابقة لقيمة وعملة الخدمة' USING ERRCODE = '22023';
    END IF;
    PERFORM trip_amendment_private.validate_cancellation_terms(terms,(service->>'cost')::numeric,(service->>'selling')::numeric);
  END LOOP;
  RETURN NEW;
END
$$;
CREATE TRIGGER trg_guard_booking_cancellation_terms BEFORE INSERT OR UPDATE OF cancellation_terms ON public.bookings
FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.guard_booking_cancellation_terms();

CREATE FUNCTION trip_amendment_private.schedule_supplier_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE terms jsonb;
DECLARE zone text;
BEGIN
  IF NEW.booking_id IS NULL OR coalesce(NEW.source_type,'') NOT IN ('bookings','quote_items') THEN RETURN NEW; END IF;
  SELECT entry->'terms' INTO terms
  FROM public.bookings b CROSS JOIN LATERAL jsonb_array_elements(b.cancellation_terms) entry
  WHERE b.id = NEW.booking_id AND b.organization_id = NEW.organization_id
    AND (CASE NEW.source_type WHEN 'bookings' THEN entry->>'source_id' IS NULL AND NEW.source_id = b.id
      ELSE entry->>'source_id' = NEW.source_id::text END);
  IF nullif(terms,'null') IS NULL THEN RETURN NEW; END IF;
  zone := terms->>'timezone';
  NEW.supplier_due_at := trip_amendment_private.local_cancellation_time(terms->>'payment_due', zone);
  NEW.supplier_due_timezone := CASE WHEN NEW.supplier_due_at IS NOT NULL THEN zone END;
  NEW.due_date := (NEW.supplier_due_at AT TIME ZONE zone)::date;
  NEW.planned_payment_date := coalesce(nullif(terms->>'planned_payment','')::date, NEW.due_date - 1);
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_schedule_supplier_order
BEFORE INSERT ON public.supplier_payment_orders
FOR EACH ROW EXECUTE FUNCTION trip_amendment_private.schedule_supplier_order();

-- Existing open documents keep their historical due date when no planned date is recorded.
ALTER TABLE public.supplier_payment_orders ADD COLUMN schedule_date date
  GENERATED ALWAYS AS (coalesce(planned_payment_date,due_date)) STORED;
CREATE INDEX supplier_payment_orders_schedule_idx ON public.supplier_payment_orders(organization_id,schedule_date)
WHERE status IN ('draft','pending','approved','partially_paid') AND approval_status <> 'rejected';

-- Generated columns are assigned after BEFORE triggers.
DO $order_guard$
DECLARE definition text := pg_get_functiondef('trip_amendment_private.guard_settled_supplier_document()'::regprocedure);
BEGIN
  EXECUTE replace(definition, 'ARRAY[''status'',''updated_at''', 'ARRAY[''status'',''updated_at'',''schedule_date''');
END
$order_guard$;

CREATE FUNCTION trip_amendment_private.cancellation_policy_estimates(b public.bookings, _preview jsonb, _at timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE row jsonb;
DECLARE service jsonb;
DECLARE supplier_fees jsonb := '{}';
DECLARE customer_fees jsonb := '{}';
DECLARE customer_fee numeric;
DECLARE basis numeric;
DECLARE eligible numeric;
DECLARE total_selling numeric;
DECLARE quote_discount numeric;
BEGIN
  IF b.cancellation_terms IS NULL THEN RETURN NULL; END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(_preview->'suppliers') LOOP
    SELECT entry INTO service
    FROM jsonb_array_elements(b.cancellation_terms) entry
    WHERE (entry->>'source_id' IS NULL AND (
        row->>'id' = b.id::text OR EXISTS (SELECT FROM public.supplier_invoices si
          WHERE si.id::text = row->>'invoice_id' AND si.booking_id = b.id AND si.organization_id = b.organization_id
            AND si.payment_order_id IS NULL AND si.supplier_id = b.supplier_id AND si.amount = b.cost_price AND si.currency = b.currency)
        OR EXISTS (SELECT FROM public.supplier_payment_orders o WHERE o.id::text = row->>'order_id'
          AND o.booking_id = b.id AND o.organization_id = b.organization_id AND o.source_type = 'bookings' AND o.source_id = b.id)))
      OR EXISTS (SELECT FROM public.supplier_payment_orders o WHERE o.id::text = row->>'order_id'
        AND o.booking_id = b.id AND o.organization_id = b.organization_id AND o.source_type = 'quote_items'
        AND entry->>'source_id' = o.source_id::text);
    customer_fee := trip_amendment_private.booking_cancellation_fee(service #> '{terms,supplier}',
      service #>> '{terms,timezone}', (row->>'amount')::numeric, _at);
    IF customer_fee IS NOT NULL AND customer_fee <= (row->>'amount')::numeric - (row->>'refunded')::numeric THEN
      supplier_fees := supplier_fees || jsonb_build_object(row->>'id',customer_fee);
    END IF;
  END LOOP;

  -- Quote services share a single invoice. Allocate its actual total across
  -- the service selling values so percentage fees respect discounts and VAT.
  IF jsonb_array_length(_preview #> '{customer,invoices}') = 1 THEN
    row := _preview #> '{customer,invoices,0}';
    eligible := (row->>'due')::numeric + (row->>'paid')::numeric;
    SELECT i.final_amount INTO basis FROM public.invoices i
      WHERE i.id::text = row->>'id' AND i.organization_id = b.organization_id AND i.booking_id = b.id;
    SELECT sum((entry->>'selling')::numeric) INTO total_selling FROM jsonb_array_elements(b.cancellation_terms) entry;
    SELECT coalesce((SELECT (to_jsonb(c)->>'discount_amount')::numeric FROM public.quote_booking_conversions c
      WHERE c.booking_id = b.id AND c.organization_id = b.organization_id), 0) INTO quote_discount;
    IF total_selling > 0 AND total_selling = b.selling_price + quote_discount AND row->>'currency' = b.currency THEN
      SELECT CASE WHEN count(fee) = count(*) THEN sum(fee) END INTO customer_fee
      FROM (
        SELECT trip_amendment_private.booking_cancellation_fee(nullif(entry #> '{terms,customer}','null'),
          entry #>> '{terms,timezone}', basis * (entry->>'selling')::numeric / total_selling, _at) AS fee
        FROM jsonb_array_elements(b.cancellation_terms) entry
        WHERE (entry->>'selling')::numeric > 0
      ) fees;
      IF customer_fee IS NOT NULL AND customer_fee <= eligible THEN
        customer_fees := jsonb_build_object(row->>'id',customer_fee);
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('customer',customer_fees,'suppliers',supplier_fees);
END
$$;

DO $cancellation$
DECLARE definition text;
DECLARE anchor text;
BEGIN
  definition := pg_get_functiondef('public.get_booking_cancellation_workflow(uuid)'::regprocedure);
  anchor := 'DECLARE b public.bookings%ROWTYPE;';
  IF strpos(definition,anchor) = 0 THEN RAISE EXCEPTION 'Unexpected cancellation preview'; END IF;
  definition := replace(definition,anchor,anchor || ' preview jsonb;');
  definition := replace(definition,'RETURN jsonb_build_object(''customer'',','preview := jsonb_build_object(''customer'',');
  anchor := 'END' || chr(10);
  IF strpos(definition,anchor) = 0 THEN RAISE EXCEPTION 'Unexpected cancellation preview end'; END IF;
  EXECUTE replace(definition,anchor, $append$
  RETURN preview || CASE WHEN b.cancellation_terms IS NOT NULL THEN
    jsonb_build_object('policy_estimates',trip_amendment_private.cancellation_policy_estimates(b,preview,statement_timestamp()))
    ELSE '{}'::jsonb END;
END
$append$);

  definition := pg_get_functiondef('public.settle_booking_cancellation_workflow(uuid,text,jsonb,jsonb,jsonb)'::regprocedure);
  anchor := 'IF v_workflow #> ''{customer,settled}'' = ''null'' THEN';
  IF strpos(definition,anchor) = 0 THEN RAISE EXCEPTION 'Unexpected settlement definition'; END IF;
  EXECUTE replace(definition,anchor,$validate$
  IF EXISTS (
    SELECT FROM jsonb_each(v_workflow #> '{policy_estimates,suppliers}') f
    WHERE _supplier_terms->f.key->'fee' IS DISTINCT FROM f.value
      AND length(btrim(coalesce(_supplier_terms->f.key->>'override_reason',''))) NOT BETWEEN 3 AND 500
  ) THEN
    RAISE EXCEPTION 'سجّل سبب اختلاف غرامة المورد عن السياسة المسجلة';
  END IF;
  $validate$ || anchor);
  definition := pg_get_functiondef('trip_amendment_private.apply_supplier_cancellation(public.bookings,jsonb,jsonb)'::regprocedure);
  anchor := '''fee_order_id'', v_fee_order, ''confirmation'', v_reference';
  IF strpos(definition,anchor) = 0 THEN RAISE EXCEPTION 'Unexpected supplier settlement result'; END IF;
  definition := replace(definition,anchor,anchor || ', ''override_reason'', nullif(btrim(_terms->(v_line.id::text)->>''override_reason''),'''')');
  anchor := 'v_due, v_line.currency, v_order.due_date,';
  IF strpos(definition,anchor) = 0 THEN RAISE EXCEPTION 'Unexpected cancellation fee deadline'; END IF;
  EXECUTE replace(definition,anchor,'v_due, v_line.currency, CURRENT_DATE,');
END
$cancellation$;

REVOKE ALL ON FUNCTION trip_amendment_private.local_cancellation_time(text,text),
  trip_amendment_private.validate_cancellation_terms(jsonb,numeric,numeric),
  trip_amendment_private.booking_cancellation_fee(jsonb,text,numeric,timestamptz),
  trip_amendment_private.guard_booking_cancellation_terms(),
  trip_amendment_private.schedule_supplier_order(),
  trip_amendment_private.cancellation_policy_estimates(public.bookings,jsonb,timestamptz)
FROM PUBLIC, anon, authenticated;

COMMIT;
