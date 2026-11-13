CREATE UNIQUE INDEX sop_leads_org_conversation_idx
  ON public.sop_leads (organization_id, conversation_id) WHERE conversation_id IS NOT NULL;

CREATE FUNCTION public.sop_save_whatsapp_lead(_org uuid, _conversation uuid, _payload jsonb)
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

  SELECT * INTO conversation FROM public.whatsapp_conversations
  WHERE id = _conversation AND organization_id = _org FOR UPDATE;
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

REVOKE ALL ON FUNCTION public.sop_save_whatsapp_lead(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sop_save_whatsapp_lead(uuid, uuid, jsonb) TO authenticated;
