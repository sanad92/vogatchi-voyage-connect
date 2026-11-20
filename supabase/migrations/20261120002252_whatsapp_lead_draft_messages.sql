-- Provide only the newest incoming plain text to the reviewed lead draft.
CREATE INDEX whatsapp_messages_lead_draft_recent
  ON public.whatsapp_messages (organization_id, conversation_id, sent_at DESC NULLS LAST, id DESC)
  WHERE direction = 'inbound' AND message_type = 'text';

CREATE FUNCTION public.sop_review_whatsapp_lead_messages(_org uuid, _conversation uuid)
RETURNS TABLE(content text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _org), false)
    OR NOT coalesce(public.can_org_write(_org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'whatsapp_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'crm_view'), false)
    OR NOT coalesce(public.has_org_permission(_org, 'crm_create'), false)
    OR NOT EXISTS (
      SELECT 1 FROM public.whatsapp_conversations c WHERE c.id = _conversation AND c.organization_id = _org
    ) THEN
    RAISE EXCEPTION 'صلاحياتك لا تسمح باستخراج طلب من هذه المحادثة' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT left(m.content, 1000) FROM public.whatsapp_messages m
  WHERE m.organization_id = _org AND m.conversation_id = _conversation
    AND m.direction = 'inbound' AND m.message_type = 'text' AND nullif(btrim(m.content), '') IS NOT NULL
  ORDER BY m.sent_at DESC NULLS LAST, m.id DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION public.sop_review_whatsapp_lead_messages(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_review_whatsapp_lead_messages(uuid, uuid) TO authenticated;
