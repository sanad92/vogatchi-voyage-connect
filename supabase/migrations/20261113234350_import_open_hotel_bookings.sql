CREATE SCHEMA IF NOT EXISTS booking_import_private;
REVOKE ALL ON SCHEMA booking_import_private FROM PUBLIC, anon, authenticated;

CREATE TABLE booking_import_private.hotel_references (
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  source_reference text NOT NULL,
  payload jsonb NOT NULL,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  PRIMARY KEY (organization_id, source_reference)
);
ALTER TABLE booking_import_private.hotel_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON booking_import_private.hotel_references FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.import_open_hotel_bookings(_org uuid, _rows jsonb, _commit boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  entry jsonb;
  position bigint;
  reference text;
  payload jsonb;
  existing booking_import_private.hotel_references%ROWTYPE;
  seen text[] := ARRAY[]::text[];
  entries jsonb := '[]'::jsonb;
  booking jsonb;
  customer uuid;
  supplier uuid;
  customer_label text;
  supplier_label text;
  arrival date;
  departure date;
  imported int := 0;
  skipped int := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.can_org_write(_org), false)
    OR coalesce(public.get_user_org_role(auth.uid(), _org)::text, '') NOT IN ('owner', 'admin', 'manager')
    OR NOT coalesce(public.has_org_permission(_org, 'bookings_create'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'invoices_create'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'customers_view'), false) THEN
    RAISE EXCEPTION 'لا توجد صلاحية لاستيراد حجوزات المؤسسة.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_rows) IS DISTINCT FROM 'array' OR octet_length(_rows::text) > 150000 THEN
    RAISE EXCEPTION 'ملف الحجوزات غير صالح.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_rows) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'الدفعة يجب أن تحتوي على 1 إلى 50 حجزًا.' USING ERRCODE = '22023';
  END IF;
  IF _commit THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('hotel-booking-import:' || _org::text, 0));
  END IF;
  FOR entry, position IN SELECT value, ordinality FROM jsonb_array_elements(_rows) WITH ORDINALITY LOOP
    BEGIN
      IF jsonb_typeof(entry) IS DISTINCT FROM 'object' OR EXISTS (
        SELECT FROM jsonb_object_keys(entry) AS fields(key)
        WHERE key NOT IN ('source_reference','customer_id','supplier_id','hotel_name','check_in','check_out','rooms',
          'room_type','board_type','supplier_reference','currency','selling_price','cost_price','customer_paid','supplier_paid','notes')
      ) THEN RAISE EXCEPTION 'أعمدة الحجز غير صالحة.' USING ERRCODE = '22023'; END IF;

      reference := lower(btrim(entry->>'source_reference'));
      IF nullif(reference, '') IS NULL OR length(reference) > 120 OR reference = ANY(seen) THEN
        RAISE EXCEPTION 'أدخل مرجعًا قديمًا فريدًا لا يزيد عن 120 حرفًا.' USING ERRCODE = '22023';
      END IF;
      seen := array_append(seen, reference);

      IF coalesce(entry->>'customer_paid', '') !~ '^0+(\.0{1,2})?$'
        OR coalesce(entry->>'supplier_paid', '') !~ '^0+(\.0{1,2})?$' THEN
        RAISE EXCEPTION 'أدخل صفرًا صريحًا في تحصيل العميل وسداد المورد.' USING ERRCODE = '22023';
      END IF;
      IF coalesce(entry->>'selling_price', '') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
        OR coalesce(entry->>'cost_price', '') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$'
        OR (entry->>'selling_price')::numeric <= 0 THEN
        RAISE EXCEPTION 'راجع إجمالي البيع والتكلفة. يجب أن يكون البيع أكبر من صفر.' USING ERRCODE = '22023';
      END IF;
      IF coalesce(entry->>'currency', '') NOT IN ('EGP', 'SAR', 'USD', 'EUR', 'AED', 'GBP')
        OR coalesce(entry->>'rooms', '') !~ '^[1-9][0-9]{0,3}$'
        OR length(coalesce(btrim(entry->>'hotel_name'), '')) NOT BETWEEN 1 AND 250
        OR length(coalesce(entry->>'notes', '')) > 1000 THEN
        RAISE EXCEPTION 'راجع العملة وعدد الغرف واسم الفندق والملاحظات.' USING ERRCODE = '22023';
      END IF;
      IF coalesce(entry->>'check_in', '') !~ '^\d{4}-\d{2}-\d{2}$'
        OR coalesce(entry->>'check_out', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'اكتب تاريخ الوصول والمغادرة بصيغة YYYY-MM-DD.' USING ERRCODE = '22023';
      END IF;
      arrival := (entry->>'check_in')::date;
      departure := (entry->>'check_out')::date;
      IF departure <= arrival THEN
        RAISE EXCEPTION 'تاريخ المغادرة يجب أن يكون بعد الوصول.' USING ERRCODE = '22023';
      END IF;

      customer := nullif(entry->>'customer_id', '')::uuid;
      supplier := nullif(entry->>'supplier_id', '')::uuid;
      payload := jsonb_build_object(
        'booking_type', 'hotel', 'customer_id', customer, 'supplier_id', supplier,
        'selling_price', (entry->>'selling_price')::numeric, 'cost_price', (entry->>'cost_price')::numeric,
        'currency', entry->>'currency', 'start_date', arrival, 'end_date', departure,
        'notes', concat_ws(E'\n', 'مرجع النقل: ' || reference, nullif(btrim(entry->>'notes'), '')),
        'hotelDetails', jsonb_strip_nulls(jsonb_build_object(
          'hotel_name', btrim(entry->>'hotel_name'), 'rooms', (entry->>'rooms')::int,
          'room_type', nullif(btrim(entry->>'room_type'), ''), 'board_type', nullif(btrim(entry->>'board_type'), ''),
          'booking_reference', nullif(btrim(entry->>'supplier_reference'), '')))
      );
      SELECT * INTO existing FROM booking_import_private.hotel_references r
      WHERE r.organization_id = _org AND r.source_reference = reference;
      IF FOUND THEN
        IF existing.payload <> payload THEN
          RAISE EXCEPTION 'المرجع سبق نقله ببيانات مختلفة. راجع الحجز المسجل.' USING ERRCODE = '22023';
        END IF;
        skipped := skipped + 1;
      ELSE
        IF departure <= current_date THEN
          RAISE EXCEPTION 'يمكن نقل إقامة مفتوحة بتاريخ مغادرة بعد اليوم فقط.' USING ERRCODE = '22023';
        END IF;
        SELECT name INTO customer_label FROM public.customers WHERE id = customer AND organization_id = _org;
        IF NOT FOUND THEN RAISE EXCEPTION 'معرّف العميل غير موجود في المؤسسة.' USING ERRCODE = '22023'; END IF;
        supplier_label := NULL;
        IF supplier IS NOT NULL OR (entry->>'cost_price')::numeric > 0 THEN
          SELECT name INTO supplier_label FROM public.suppliers WHERE id = supplier AND organization_id = _org AND is_active;
          IF NOT FOUND THEN RAISE EXCEPTION 'اختر معرّف مورد نشط من المؤسسة.' USING ERRCODE = '22023'; END IF;
        END IF;
        IF _commit THEN
          booking := public.create_booking_atomic(_org, gen_random_uuid(), payload);
          INSERT INTO booking_import_private.hotel_references (organization_id, source_reference, payload, booking_id)
          VALUES (_org, reference, payload, (booking->>'id')::uuid);
          imported := imported + 1;
        END IF;
        entries := entries || jsonb_build_array(jsonb_build_object(
          'reference', reference, 'customer', customer_label, 'supplier', supplier_label,
          'hotel', payload#>>'{hotelDetails,hotel_name}', 'check_in', arrival, 'check_out', departure,
          'currency', payload->>'currency',
          'sale', payload->'selling_price', 'cost', payload->'cost_price'
        ));
      END IF;
    EXCEPTION
      WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'الحجز %: راجع صيغة التواريخ والأرقام والمعرّفات.', position USING ERRCODE = '22023';
      WHEN invalid_parameter_value THEN
        RAISE EXCEPTION 'الحجز %: %', position, SQLERRM USING ERRCODE = '22023';
    END;
  END LOOP;
  RETURN jsonb_build_object('entries', entries, 'imported', imported, 'skipped', skipped);
END;
$$;

REVOKE ALL ON FUNCTION public.import_open_hotel_bookings(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_open_hotel_bookings(uuid, jsonb, boolean) TO authenticated;
