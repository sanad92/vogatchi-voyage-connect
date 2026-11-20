ALTER TABLE public.whatsapp_passport_reviews
  ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX whatsapp_passport_reviews_booking_idx
  ON public.whatsapp_passport_reviews (organization_id, booking_id)
  WHERE booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wa_approve_passport_reviews(_org uuid, _conversation uuid, _items jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  item record;
  approved integer := 0;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.user_belongs_to_org(actor, _org), false)
    OR NOT coalesce(public.can_org_write(_org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'whatsapp_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'documents_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'documents_create'), false) THEN
    RAISE EXCEPTION 'صلاحياتك لا تسمح باعتماد المستند' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'بيانات المسافرين غير صالحة'; END IF;
  IF jsonb_array_length(_items) NOT BETWEEN 1 AND 15 THEN RAISE EXCEPTION 'راجع من ١ إلى ١٥ مستندًا في كل مرة'; END IF;

  FOR item IN SELECT * FROM jsonb_to_recordset(_items) AS x(
    message_id uuid, full_name text, passport_number text, nationality text, birth_date date, expiry_date date
  )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.whatsapp_messages m
      JOIN public.whatsapp_conversations c ON c.id = m.conversation_id AND c.organization_id = m.organization_id
      WHERE m.id = item.message_id AND c.id = _conversation AND c.organization_id = _org
        AND m.direction = 'inbound' AND m.media_storage_path IS NOT NULL
        AND m.media_mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    ) THEN
      RAISE EXCEPTION 'المرفق غير متاح في هذه المحادثة' USING ERRCODE = '42501';
    END IF;
    IF item.birth_date > current_date THEN RAISE EXCEPTION 'تاريخ الميلاد غير صالح'; END IF;
    INSERT INTO public.whatsapp_passport_reviews (
      organization_id, conversation_id, message_id, full_name, passport_number, nationality, birth_date, expiry_date, approved_by
    ) VALUES (
      _org, _conversation, item.message_id, btrim(item.full_name), upper(btrim(item.passport_number)),
      upper(btrim(item.nationality)), item.birth_date, item.expiry_date, actor
    )
    ON CONFLICT (message_id) DO UPDATE SET full_name = EXCLUDED.full_name, passport_number = EXCLUDED.passport_number,
      nationality = EXCLUDED.nationality, birth_date = EXCLUDED.birth_date, expiry_date = EXCLUDED.expiry_date,
      approved_by = actor, approved_at = now()
    WHERE whatsapp_passport_reviews.organization_id = _org AND whatsapp_passport_reviews.conversation_id = _conversation;
    IF NOT FOUND THEN RAISE EXCEPTION 'المرفق مرتبط بمراجعة أخرى' USING ERRCODE = '42501'; END IF;
    approved := approved + 1;
  END LOOP;
  RETURN approved;
END;
$$;

CREATE FUNCTION public.wa_approve_passport_reviews_for_booking(
  _org uuid, _conversation uuid, _booking uuid, _items jsonb
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  approved integer;
  attached integer;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'bookings_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'bookings_edit'), false) THEN
    RAISE EXCEPTION 'صلاحياتك لا تسمح بتحديث الحجز' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
    FROM public.sop_leads l
    JOIN public.whatsapp_conversations c ON c.id = l.conversation_id AND c.organization_id = l.organization_id
    JOIN public.bookings b ON b.id = l.booking_id AND b.organization_id = l.organization_id
    WHERE l.organization_id = _org AND c.id = _conversation AND b.id = _booking
      AND b.customer_id = coalesce(l.customer_id, c.customer_id)
      AND (c.customer_id IS NULL OR c.customer_id = b.customer_id)
      AND coalesce(b.status, '') NOT IN ('cancelled', 'canceled')
    FOR SHARE OF l, c, b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الحجز غير متاح لهذا العميل والمحادثة' USING ERRCODE = '42501';
  END IF;

  approved := public.wa_approve_passport_reviews(_org, _conversation, _items);

  UPDATE public.whatsapp_passport_reviews r
    SET booking_id = _booking
    WHERE r.organization_id = _org AND r.conversation_id = _conversation
      AND (r.booking_id IS NULL OR r.booking_id = _booking)
      AND r.message_id IN (SELECT (item->>'message_id')::uuid FROM jsonb_array_elements(_items) item);
  GET DIAGNOSTICS attached = ROW_COUNT;
  IF attached <> approved THEN
    RAISE EXCEPTION 'يتضمن الاختيار مستندًا مكررًا أو مرتبطًا بحجز آخر' USING ERRCODE = '42501';
  END IF;
  RETURN attached;
END;
$$;

REVOKE ALL ON FUNCTION public.wa_approve_passport_reviews_for_booking(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wa_approve_passport_reviews_for_booking(uuid, uuid, uuid, jsonb) TO authenticated;
