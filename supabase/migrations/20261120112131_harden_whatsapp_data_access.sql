-- Keep ordinary inbox access for members granted organization-wide WhatsApp
-- access. A narrower grant follows the active employee's assignment. The
-- shared pickup queue remains available to staff who can take conversations.
CREATE SCHEMA IF NOT EXISTS private;

CREATE FUNCTION private.whatsapp_active_employee(_org uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.id
  FROM public.profiles AS p
  JOIN public.employees AS e ON e.id = p.linked_employee_id
    AND e.organization_id = _org AND e.is_active
  WHERE p.id = (SELECT auth.uid())
    AND public.user_belongs_to_org(p.id, _org);
$$;

CREATE FUNCTION private.can_read_whatsapp_conversation(_org uuid, _assigned uuid, _status text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    public.is_platform_admin((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public._org_permission_state(_org, (SELECT auth.uid()), 'whatsapp_view') AS permission
      WHERE permission.granted AND (
        permission.data_scope = 'organization'
        OR (
          permission.data_scope IN ('own', 'team', 'branch')
          AND EXISTS (
            SELECT 1 FROM private.whatsapp_active_employee(_org) AS employee(id)
            WHERE id IS NOT NULL AND (
              _assigned = id
              OR (
                _assigned IS NULL AND _status IN ('open', 'active', 'pending', 'transferred')
                AND (public.has_org_permission(_org, 'customer_service_edit')
                  OR public.has_org_permission(_org, 'whatsapp_admin'))
              )
            )
          )
        )
      )
    )
  );
$$;

-- Read this classification even when the approved passport row is hidden by
-- its own RLS. Otherwise a missing visible row could be mistaken for ordinary
-- media by someone whose role does not allow document access.
CREATE FUNCTION private.whatsapp_media_has_approved_passport(_org uuid, _path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_messages AS message
    JOIN public.whatsapp_passport_reviews AS review ON review.message_id = message.id
      AND review.organization_id = message.organization_id
      AND review.conversation_id = message.conversation_id
    WHERE message.organization_id = _org AND message.media_storage_path = _path
      AND public.user_belongs_to_org((SELECT auth.uid()), _org)
  );
$$;

REVOKE ALL ON FUNCTION private.whatsapp_active_employee(uuid),
  private.can_read_whatsapp_conversation(uuid, uuid, text),
  private.whatsapp_media_has_approved_passport(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.whatsapp_active_employee(uuid),
  private.can_read_whatsapp_conversation(uuid, uuid, text),
  private.whatsapp_media_has_approved_passport(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can manage conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can manage assigned conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Org view whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS whatsapp_conversations_select_org ON public.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_select_org ON public.whatsapp_conversations FOR SELECT TO authenticated
USING (private.can_read_whatsapp_conversation(organization_id, assigned_to, status));

DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org view whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_select_org ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select_org ON public.whatsapp_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations AS conversation
    WHERE conversation.id = whatsapp_messages.conversation_id
      AND conversation.organization_id = whatsapp_messages.organization_id
  )
);

-- Message records are written by the webhook, send/broadcast and retry
-- functions using the service role. Keep those records a trusted link between
-- media readings and the conversation instead of accepting client edits.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.whatsapp_messages FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Users can send messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org insert whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org update whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Org delete whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_insert_org ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_update_org ON public.whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_delete_org ON public.whatsapp_messages;

CREATE INDEX IF NOT EXISTS whatsapp_messages_storage_reference_idx
ON public.whatsapp_messages (media_storage_path, organization_id)
WHERE media_storage_path IS NOT NULL;

-- The browser first uploads a new file, then submits the path to the send
-- function. Only the uploader can read the staged object until metadata is
-- recorded. Existing inbound/outbound files use their exact message record,
-- including older org/file paths. Service-role upload and media cleanup
-- continue to use trusted handlers.
DROP POLICY IF EXISTS wa_media_read_org_members ON storage.objects;
DROP POLICY IF EXISTS wa_media_insert_org_members ON storage.objects;
DROP POLICY IF EXISTS wa_media_delete_org_members ON storage.objects;

CREATE POLICY wa_media_read_visible_message_or_staged ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (
    EXISTS (
      SELECT 1
      FROM public.whatsapp_messages AS message
      WHERE message.media_storage_path = storage.objects.name
        AND message.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
        AND (
          message.conversation_id::text = pg_catalog.split_part(storage.objects.name, '/', 2)
          OR storage.objects.name ~ '^[^/]+/[^/]+$'
        )
        AND public.user_belongs_to_org((SELECT auth.uid()), message.organization_id)
        AND (
          public.has_org_permission(message.organization_id, 'documents_view')
          OR NOT private.whatsapp_media_has_approved_passport(message.organization_id, storage.objects.name)
        )
    )
    OR (
      owner_id = (SELECT auth.uid())::text
      AND created_at > pg_catalog.now() - interval '10 minutes'
      AND pg_catalog.split_part(name, '/', 3) ~ '^outbound-[0-9a-f-]{36}[.][^/]+$'
      AND name ~ '^[^/]+/[^/]+/[^/]+$'
      AND NOT EXISTS (SELECT 1 FROM public.whatsapp_messages AS message WHERE message.media_storage_path = storage.objects.name)
      AND EXISTS (
        SELECT 1
        FROM public.whatsapp_conversations AS conversation
        WHERE conversation.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
          AND conversation.id::text = pg_catalog.split_part(storage.objects.name, '/', 2)
          AND public.user_belongs_to_org((SELECT auth.uid()), conversation.organization_id)
          AND (public.has_org_permission(conversation.organization_id, 'whatsapp_admin')
            OR (public.has_org_permission(conversation.organization_id, 'customer_service_edit')
              AND conversation.assigned_to = private.whatsapp_active_employee(conversation.organization_id)))
      )
    )
  )
);

CREATE POLICY wa_media_insert_staged_by_sender ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND owner_id = (SELECT auth.uid())::text
  AND pg_catalog.split_part(name, '/', 3) ~ '^outbound-[0-9a-f-]{36}[.][^/]+$'
  AND name ~ '^[^/]+/[^/]+/[^/]+$'
  AND EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations AS conversation
    WHERE conversation.organization_id::text = pg_catalog.split_part(storage.objects.name, '/', 1)
      AND conversation.id::text = pg_catalog.split_part(storage.objects.name, '/', 2)
      AND public.user_belongs_to_org((SELECT auth.uid()), conversation.organization_id)
      AND public.can_org_write(conversation.organization_id)
      AND (public.has_org_permission(conversation.organization_id, 'whatsapp_admin')
        OR (public.has_org_permission(conversation.organization_id, 'customer_service_edit')
          AND conversation.assigned_to = private.whatsapp_active_employee(conversation.organization_id)))
  )
);

-- These workflow RPCs use definer rights to perform atomic writes. Require
-- the same conversation visibility as ordinary reads before those writes.
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
        AND private.can_read_whatsapp_conversation(c.organization_id, c.assigned_to, c.status)
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

CREATE OR REPLACE FUNCTION public.sop_save_whatsapp_lead(_org uuid, _conversation uuid, _payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  conversation public.whatsapp_conversations%ROWTYPE;
  existing public.sop_leads%ROWTYPE;
  saved public.sop_leads%ROWTYPE;
  result jsonb;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.user_belongs_to_org(actor, _org), false)
    OR NOT coalesce(public.can_org_write(_org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'whatsapp_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'crm_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'crm_create'), false) THEN
    RAISE EXCEPTION 'صلاحياتك لا تسمح بفتح ملف من واتساب' USING ERRCODE = '42501';
  END IF;

  SELECT c.* INTO conversation FROM public.whatsapp_conversations AS c
  WHERE c.id = _conversation AND c.organization_id = _org
    AND private.can_read_whatsapp_conversation(c.organization_id, c.assigned_to, c.status)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المحادثة غير موجودة في المؤسسة' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO existing FROM public.sop_leads
  WHERE conversation_id = conversation.id AND organization_id = _org;
  IF FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'lead', to_jsonb(existing));
  END IF;

  result := public.sop_save_lead(_org, NULL, _payload || jsonb_build_object('lead_source', 'whatsapp'));
  IF (result->>'allowed')::boolean IS DISTINCT FROM true THEN
    RETURN result;
  END IF;

  UPDATE public.sop_leads
  SET conversation_id = conversation.id,
      customer_id = (SELECT id FROM public.customers
        WHERE id = conversation.customer_id AND organization_id = _org)
  WHERE id = (result->'lead'->>'id')::uuid AND organization_id = _org
  RETURNING * INTO STRICT saved;

  RETURN jsonb_build_object('allowed', true, 'lead', to_jsonb(saved));
END;
$$;
