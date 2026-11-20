CREATE OR REPLACE FUNCTION public.manage_supplier_allotment_usage(
  _allotment_id uuid, _action text, _booking_reference text DEFAULT NULL,
  _quantity integer DEFAULT NULL, _usage_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  allotment public.supplier_allotments%ROWTYPE;
  booking public.bookings%ROWTYPE;
  usage public.allotment_usage%ROWTYPE;
  reference text := nullif(btrim(_booking_reference), '');
  last_service_date date;
  service_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  allocation_deadline date;
BEGIN
  SELECT * INTO allotment FROM public.supplier_allotments
  WHERE id = _allotment_id AND public.user_belongs_to_org(actor, organization_id)
  FOR UPDATE;
  IF actor IS NULL OR NOT FOUND
    OR NOT coalesce(public.can_org_write(allotment.organization_id), false)
    OR NOT coalesce(public.has_org_permission(allotment.organization_id, 'suppliers_edit'), false) THEN
    RAISE EXCEPTION 'صلاحياتك لا تسمح بتعديل الحصة' USING ERRCODE = '42501';
  END IF;

  IF _action = 'release_allotment' THEN
    IF allotment.status = 'released' THEN RETURN allotment.id; END IF;
    IF allotment.status <> 'active' THEN
      RAISE EXCEPTION 'الحصة غير نشطة' USING ERRCODE = '22023';
    END IF;
    UPDATE public.supplier_allotments SET status = 'released' WHERE id = allotment.id;
    RETURN allotment.id;
  END IF;

  IF _action = 'release_usage' THEN
    SELECT * INTO usage FROM public.allotment_usage
    WHERE id = _usage_id AND allotment_id = allotment.id AND organization_id = allotment.organization_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'حركة الحصة غير موجودة' USING ERRCODE = '22023';
    END IF;
    IF usage.released_at IS NULL THEN
      UPDATE public.allotment_usage SET released_at = now(), released_by = actor WHERE id = usage.id;
    END IF;
    RETURN usage.id;
  END IF;

  IF _action IS DISTINCT FROM 'reserve' OR _quantity IS NULL OR _quantity <= 0
    OR reference IS NULL OR char_length(reference) > 120 THEN
    RAISE EXCEPTION 'اكتب رقم الحجز وكمية صحيحة' USING ERRCODE = '22023';
  END IF;

  IF NOT coalesce(public.has_org_permission(allotment.organization_id, 'bookings_view'), false) THEN
    RAISE EXCEPTION 'تحتاج إلى صلاحية عرض الحجوزات' USING ERRCODE = '42501';
  END IF;

  BEGIN
    SELECT * INTO STRICT booking FROM public.bookings
    WHERE organization_id = allotment.organization_id AND booking_number = reference
      AND supplier_id = allotment.supplier_id AND booking_type = allotment.service_type
    FOR SHARE;
  EXCEPTION
    WHEN no_data_found THEN
      RAISE EXCEPTION 'لم يوجد حجز مطابق لنوع الخدمة والمورد' USING ERRCODE = '22023';
    WHEN too_many_rows THEN
      RAISE EXCEPTION 'رقم الحجز مكرر. راجع سجل الحجوزات قبل التخصيص' USING ERRCODE = '22023';
  END;

  SELECT * INTO usage FROM public.allotment_usage
  WHERE allotment_id = allotment.id AND booking_id = booking.id AND released_at IS NULL;
  IF FOUND THEN
    IF usage.quantity_used = _quantity THEN RETURN usage.id; END IF;
    RAISE EXCEPTION 'الحجز له تخصيص قائم. أرجع الكمية قبل تخصيص كمية مختلفة' USING ERRCODE = '23505';
  END IF;

  IF allotment.status <> 'active' OR allotment.end_date < service_today
    OR booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'الحجز أو الحصة غير متاح للتخصيص' USING ERRCODE = '22023';
  END IF;
  last_service_date := coalesce(booking.end_date, booking.start_date);
  IF booking.booking_type = 'hotel' AND last_service_date > booking.start_date THEN
    last_service_date := last_service_date - 1;
  END IF;
  IF booking.start_date IS NULL OR booking.start_date < allotment.start_date
    OR last_service_date < booking.start_date OR last_service_date > allotment.end_date THEN
    RAISE EXCEPTION 'فترة الحجز خارج فترة الحصة' USING ERRCODE = '22023';
  END IF;
  -- Existing allocations are returned above, including retries after the cutoff.
  allocation_deadline := booking.start_date - coalesce(allotment.release_days, 0);
  IF service_today > allocation_deadline THEN
    RAISE EXCEPTION 'انتهت مهلة تخصيص الحصة لهذا الحجز في %', to_char(allocation_deadline, 'YYYY-MM-DD')
      USING ERRCODE = '22023';
  END IF;

  IF _quantity > allotment.total_quantity - allotment.used_quantity THEN
    RAISE EXCEPTION 'الكمية المتاحة في الحصة غير كافية' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.allotment_usage
    (organization_id, allotment_id, booking_id, booking_type, booking_reference, quantity_used, usage_date, created_by)
  VALUES
    (allotment.organization_id, allotment.id, booking.id, booking.booking_type, booking.booking_number,
      _quantity, booking.start_date, actor)
  RETURNING * INTO usage;
  RETURN usage.id;
END;
$$;
