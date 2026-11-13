-- Channel ownership is derived from the connected number, including existing
-- conversations. Unlinked numbers are shared company inboxes.
CREATE SCHEMA wa_branch_private;
REVOKE ALL ON SCHEMA wa_branch_private FROM PUBLIC;
GRANT USAGE ON SCHEMA wa_branch_private TO authenticated, service_role;

CREATE TABLE public.whatsapp_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  manager_user_id uuid,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, name),
  FOREIGN KEY (organization_id, manager_user_id)
    REFERENCES public.organization_members (organization_id, user_id)
    ON DELETE SET NULL (manager_user_id)
);
CREATE INDEX wa_regions_manager_idx ON public.whatsapp_regions (organization_id, manager_user_id);
ALTER TABLE public.whatsapp_regions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_regions TO authenticated;
GRANT ALL ON public.whatsapp_regions TO service_role;

CREATE POLICY wa_regions_read ON public.whatsapp_regions FOR SELECT TO authenticated
  USING (public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner','admin'));
CREATE POLICY wa_regions_manage ON public.whatsapp_regions FOR ALL TO authenticated
  USING (public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner','admin') AND public.can_org_write(organization_id))
  WITH CHECK (public.get_user_org_role((SELECT auth.uid()), organization_id) IN ('owner','admin') AND public.can_org_write(organization_id));

ALTER TABLE public.branches ADD CONSTRAINT branches_org_id_unique UNIQUE (organization_id, id);
ALTER TABLE public.branches ADD COLUMN whatsapp_region_id uuid,
  ADD CONSTRAINT branches_whatsapp_region_fkey FOREIGN KEY (organization_id, whatsapp_region_id)
    REFERENCES public.whatsapp_regions (organization_id, id) ON DELETE SET NULL (whatsapp_region_id);
CREATE INDEX branches_whatsapp_region_idx ON public.branches (organization_id, whatsapp_region_id);
ALTER TABLE public.whatsapp_settings ADD COLUMN branch_id uuid,
  ADD CONSTRAINT whatsapp_settings_branch_fkey FOREIGN KEY (organization_id, branch_id)
    REFERENCES public.branches (organization_id, id) ON DELETE NO ACTION,
  ADD CONSTRAINT whatsapp_settings_branch_requires_org CHECK (branch_id IS NULL OR organization_id IS NOT NULL);
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_wa_branch_org_fkey
  FOREIGN KEY (organization_id, branch_id) REFERENCES public.branches (organization_id, id) NOT VALID;
CREATE INDEX whatsapp_settings_branch_idx ON public.whatsapp_settings (organization_id, branch_id);

CREATE FUNCTION wa_branch_private.inbox_allowed(_org uuid, _inbox uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    LEFT JOIN public.whatsapp_settings s ON s.id = _inbox AND s.organization_id = m.organization_id
    LEFT JOIN public.branches b ON b.id = s.branch_id AND b.organization_id = m.organization_id
    LEFT JOIN public.whatsapp_regions r ON r.id = b.whatsapp_region_id AND r.organization_id = m.organization_id
    WHERE m.organization_id = _org AND m.user_id = _user AND m.is_active
      AND (_inbox IS NULL OR s.id IS NOT NULL)
      AND (SELECT granted FROM public._org_permission_state(_org, _user, 'whatsapp_view'))
      AND (s.branch_id IS NULL OR m.role IN ('owner','admin')
        OR (b.is_active AND (r.manager_user_id = m.user_id OR (b.id = m.branch_id AND NOT EXISTS (
          SELECT 1 FROM public.whatsapp_regions managed
          WHERE managed.organization_id = m.organization_id AND managed.manager_user_id = m.user_id
        )))))
  );
$$;
REVOKE ALL ON FUNCTION wa_branch_private.inbox_allowed(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wa_branch_private.inbox_allowed(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION wa_branch_private.can_access_inbox(_org uuid, _inbox uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT wa_branch_private.inbox_allowed(_org, _inbox, (SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION wa_branch_private.can_access_inbox(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wa_branch_private.can_access_inbox(uuid,uuid) TO authenticated;

CREATE FUNCTION public.wa_inbox_channels(_org uuid)
RETURNS TABLE(id uuid, label text, business_name text, display_phone_number text,
              branch_id uuid, branch_name text, is_active boolean, is_default boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id, s.label, s.business_name, s.display_phone_number,
         s.branch_id, b.name, coalesce(s.is_active, false) AND s.phone_number_id IS NOT NULL, s.is_default
  FROM public.whatsapp_settings s
  LEFT JOIN public.branches b ON b.id = s.branch_id AND b.organization_id = s.organization_id
  WHERE s.organization_id = _org AND wa_branch_private.inbox_allowed(_org, s.id, (SELECT auth.uid()))
  ORDER BY s.is_default DESC, s.created_at, s.id;
$$;
REVOKE ALL ON FUNCTION public.wa_inbox_channels(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wa_inbox_channels(uuid) TO authenticated;

-- Restrictive policies compose with all pre-existing permission and write policies.
CREATE POLICY wa_branch_scope ON public.whatsapp_conversations AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (wa_branch_private.can_access_inbox(organization_id, whatsapp_settings_id))
  WITH CHECK (wa_branch_private.can_access_inbox(organization_id, whatsapp_settings_id));

DO $$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY[
    'whatsapp_messages', 'conversation_internal_notes', 'conversation_tag_assignments',
    'conversation_assignments_history', 'whatsapp_followups', 'wa_bot_intake',
    'ai_sales_briefs', 'whatsapp_chatbot_interactions', 'whatsapp_automation_executions'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY wa_branch_scope ON public.%1$I AS RESTRICTIVE FOR ALL TO authenticated
       USING (EXISTS (SELECT 1 FROM public.whatsapp_conversations c
                      WHERE c.id = %1$I.conversation_id AND c.organization_id = %1$I.organization_id)
              OR (%1$I.conversation_id IS NULL AND public.get_user_org_role((SELECT auth.uid()), %1$I.organization_id) IN (''owner'',''admin'')))',
      relation
    );
  END LOOP;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY wa_branch_media_scope ON storage.objects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (bucket_id <> 'whatsapp-media' OR EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    WHERE c.id = CASE WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
                      THEN ((storage.foldername(name))[2])::uuid END
      AND c.organization_id::text = (storage.foldername(name))[1]
  ));

CREATE OR REPLACE FUNCTION public.whatsapp_window_open(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_messages
    WHERE conversation_id = _conversation_id AND direction = 'inbound'
      AND sent_at > now() - interval '24 hours'
  );
$$;

CREATE FUNCTION wa_branch_private.guard_channel_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE channel_branch uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.whatsapp_settings_id IS DISTINCT FROM OLD.whatsapp_settings_id AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن تغيير رقم واتساب لمحادثة قائمة' USING ERRCODE = '42501';
    END IF;
    IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to
      AND NEW.whatsapp_settings_id IS NOT DISTINCT FROM OLD.whatsapp_settings_id THEN RETURN NEW; END IF;
  END IF;

  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employees e JOIN public.profiles p ON p.linked_employee_id = e.id
    WHERE e.id = NEW.assigned_to AND e.organization_id = NEW.organization_id AND e.is_active
      AND (p.id = auth.uid() OR public.has_org_permission(NEW.organization_id, 'whatsapp_admin'))
  ) THEN
    RAISE EXCEPTION 'الموظف غير متاح لإسناد المحادثة' USING ERRCODE = '42501';
  END IF;
  IF NEW.whatsapp_settings_id IS NULL THEN RETURN NEW; END IF;
  SELECT branch_id INTO channel_branch FROM public.whatsapp_settings
  WHERE id = NEW.whatsapp_settings_id AND organization_id = NEW.organization_id;
  IF channel_branch IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.linked_employee_id = NEW.assigned_to
      AND wa_branch_private.inbox_allowed(NEW.organization_id, NEW.whatsapp_settings_id, p.id)
  ) THEN
    RAISE EXCEPTION 'الموظف لا يملك صلاحية الوصول لصندوق واتساب الخاص بهذا الفرع' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION wa_branch_private.guard_channel_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wa_guard_channel_assignment
  BEFORE INSERT OR UPDATE OF assigned_to, whatsapp_settings_id ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION wa_branch_private.guard_channel_assignment();

-- Linking or moving a number puts conversations whose owners lose access back in the queue.
CREATE FUNCTION wa_branch_private.requeue_out_of_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  org_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
BEGIN
  UPDATE public.whatsapp_conversations c
  SET assigned_to = NULL, status = 'pending', auto_assigned = false, assignment_reason = 'human_queue'
  FROM public.whatsapp_settings s
  WHERE c.organization_id = org_id AND s.organization_id = org_id AND s.id = c.whatsapp_settings_id
    AND s.branch_id IS NOT NULL
    AND c.assigned_to IS NOT NULL AND c.status IN ('open','active','pending','transferred')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.linked_employee_id = c.assigned_to
        AND wa_branch_private.inbox_allowed(org_id, s.id, p.id)
    );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION wa_branch_private.requeue_out_of_scope() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wa_requeue_out_of_scope AFTER UPDATE OF branch_id ON public.whatsapp_settings
  FOR EACH ROW WHEN (OLD.branch_id IS DISTINCT FROM NEW.branch_id)
  EXECUTE FUNCTION wa_branch_private.requeue_out_of_scope();
CREATE TRIGGER wa_requeue_branch_change AFTER UPDATE OF whatsapp_region_id, is_active ON public.branches
  FOR EACH ROW WHEN (OLD.whatsapp_region_id IS DISTINCT FROM NEW.whatsapp_region_id OR OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION wa_branch_private.requeue_out_of_scope();
CREATE TRIGGER wa_requeue_region_change AFTER INSERT OR UPDATE OF manager_user_id OR DELETE ON public.whatsapp_regions
  FOR EACH ROW EXECUTE FUNCTION wa_branch_private.requeue_out_of_scope();
CREATE TRIGGER wa_requeue_member_change AFTER UPDATE OF branch_id, is_active, role OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION wa_branch_private.requeue_out_of_scope();

CREATE OR REPLACE FUNCTION public.wa_dispatch_queue(_org_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE settings public.wa_routing_settings; agent record; convo record; total integer:=0;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Internal only' USING ERRCODE='42501'; END IF;
  IF NOT public.org_has_active_subscription(_org_id) THEN RETURN 0; END IF;
  SELECT * INTO settings FROM public.wa_routing_settings WHERE organization_id=_org_id;
  IF settings.mode IS NULL OR settings.mode='manual' THEN RETURN 0; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_org_id::text,0));
  FOR convo IN SELECT c.id,c.whatsapp_settings_id FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id
    AND c.assigned_to IS NULL AND c.status='pending'
    ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'low' THEN 3 ELSE 2 END,c.created_at,c.id
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT a.user_id,a.employee_id INTO agent FROM public.wa_queue_agents a
      JOIN public.employees e ON e.id=a.employee_id AND e.organization_id=a.organization_id AND e.is_active
      JOIN public.profiles p ON p.id=a.user_id AND p.linked_employee_id=e.id
      JOIN public.organization_members m ON m.user_id=a.user_id AND m.organization_id=a.organization_id AND m.is_active
      WHERE a.organization_id=_org_id AND a.available AND a.heartbeat_at > now()-interval '90 seconds'
        AND wa_branch_private.inbox_allowed(_org_id,convo.whatsapp_settings_id,a.user_id)
        AND ((SELECT granted FROM public._org_permission_state(_org_id,a.user_id,'customer_service_edit'))
          OR (SELECT granted FROM public._org_permission_state(_org_id,a.user_id,'whatsapp_admin')))
        AND (SELECT count(*) FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id AND c.assigned_to=a.employee_id
          AND c.status IN ('open','active','pending','transferred')) < settings.max_conversations
      ORDER BY (SELECT count(*) FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id AND c.assigned_to=a.employee_id
          AND c.status IN ('open','active','pending','transferred')),a.last_assigned_at NULLS FIRST,a.user_id LIMIT 1;
    IF agent.user_id IS NULL THEN CONTINUE; END IF;
    UPDATE public.whatsapp_conversations SET assigned_to=agent.employee_id,status='active',auto_assigned=true,assignment_reason='queue_auto'
      WHERE id=convo.id AND assigned_to IS NULL;
    UPDATE public.wa_queue_agents SET last_assigned_at=now() WHERE organization_id=_org_id AND user_id=agent.user_id;
    INSERT INTO public.conversation_assignments_history(conversation_id,organization_id,action,to_user_id,reason,metadata)
      VALUES(convo.id,_org_id,'assigned',agent.user_id,'queue_auto',jsonb_build_object('employee_id',agent.employee_id));
    total:=total+1;
    EXIT WHEN total >= 50;
  END LOOP;
  RETURN total;
END $$;

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

  SELECT * INTO conversation FROM public.whatsapp_conversations
  WHERE id = _conversation AND organization_id = _org
    AND wa_branch_private.inbox_allowed(_org, whatsapp_settings_id, actor)
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
