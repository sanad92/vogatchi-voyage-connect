ALTER TABLE public.whatsapp_settings
  ADD COLUMN auto_ad_leads boolean NOT NULL DEFAULT false;
GRANT SELECT (auto_ad_leads), UPDATE (auto_ad_leads) ON public.whatsapp_settings TO authenticated;

CREATE FUNCTION public.wa_open_ad_lead(_org uuid, _message uuid, _ad text, _name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  chat public.whatsapp_conversations;
  lead_id uuid;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Internal only' USING ERRCODE = '42501';
  END IF;
  IF _ad IS NULL OR _ad !~ '^[0-9]{1,32}$' THEN RETURN NULL; END IF;

  SELECT c.* INTO chat FROM public.whatsapp_conversations c
  JOIN public.whatsapp_messages m ON m.conversation_id = c.id
    AND m.organization_id = c.organization_id AND m.whatsapp_settings_id = c.whatsapp_settings_id
  JOIN public.whatsapp_settings s ON s.id = c.whatsapp_settings_id AND s.organization_id = c.organization_id
  WHERE c.organization_id = _org AND m.id = _message AND m.direction = 'inbound'
    AND s.auto_ad_leads AND s.is_active IS TRUE
  FOR UPDATE OF c;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.sop_leads (
    organization_id, lead_number, conversation_id, customer_id, contact_name, contact_phone, lead_source, campaign
  ) VALUES (
    _org, 'LD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    chat.id, (SELECT id FROM public.customers WHERE id = chat.customer_id AND organization_id = _org),
    coalesce((SELECT name FROM public.customers WHERE id = chat.customer_id AND organization_id = _org),
      nullif(left(btrim(_name), 120), '')),
    chat.phone_number, 'whatsapp', 'إعلان واتساب #' || _ad
  )
  ON CONFLICT (organization_id, conversation_id) WHERE conversation_id IS NOT NULL DO NOTHING
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_open_ad_lead(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_open_ad_lead(uuid, uuid, text, text) TO service_role;

-- The existing guided bot gathers answers without using an AI provider.
-- Keep unstructured dates, traveler counts and budgets visible for staff review.
CREATE FUNCTION public.wa_copy_completed_intake_to_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.completed AND NOT OLD.completed THEN
    UPDATE public.sop_leads l SET
      destination = coalesce(l.destination, nullif(left(NEW.answers->>'destination', 200), '')),
      approx_dates = coalesce(l.approx_dates, nullif(left(NEW.answers->>'dates', 200), '')),
      special_requests = coalesce(l.special_requests, concat_ws(E'\n',
        'عدد المسافرين: ' || left(NEW.answers->>'travelers', 300),
        'الميزانية: ' || left(NEW.answers->>'budget', 300),
        'التفضيلات: ' || left(NEW.answers->>'style', 300))),
      updated_at = now()
    WHERE l.organization_id = NEW.organization_id AND l.conversation_id = NEW.conversation_id
      AND l.campaign LIKE 'إعلان واتساب #%' AND l.stage = 'new' AND l.intake_completed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.wa_copy_completed_intake_to_lead() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wa_copy_completed_intake_to_lead AFTER UPDATE OF completed ON public.wa_bot_intake
  FOR EACH ROW EXECUTE FUNCTION public.wa_copy_completed_intake_to_lead();

CREATE TABLE public.whatsapp_passport_reviews (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id uuid PRIMARY KEY REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120),
  passport_number text NOT NULL CHECK (passport_number ~ '^[A-Z0-9]{3,20}$'),
  nationality text NOT NULL CHECK (nationality ~ '^[A-Z]{3}$'),
  birth_date date NOT NULL,
  expiry_date date NOT NULL CHECK (birth_date < expiry_date),
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_passport_reviews_chat_idx
  ON public.whatsapp_passport_reviews (organization_id, conversation_id);
ALTER TABLE public.whatsapp_passport_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.whatsapp_passport_reviews TO authenticated;
CREATE POLICY whatsapp_passport_reviews_read ON public.whatsapp_passport_reviews FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.has_org_permission(organization_id, 'documents_view')
    AND public.has_org_permission(organization_id, 'whatsapp_view')
    AND EXISTS (SELECT 1 FROM public.whatsapp_conversations c
      WHERE c.id = conversation_id AND c.organization_id = whatsapp_passport_reviews.organization_id)
  );

-- Write through a single atomic review action. The caller may approve only
-- inbound images already visible in the selected conversation.
CREATE FUNCTION public.wa_approve_passport_reviews(_org uuid, _conversation uuid, _items jsonb)
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
        AND m.media_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
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
REVOKE ALL ON FUNCTION public.wa_approve_passport_reviews(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wa_approve_passport_reviews(uuid, uuid, jsonb) TO authenticated;
