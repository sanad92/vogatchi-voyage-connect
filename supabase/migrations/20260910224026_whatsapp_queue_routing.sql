-- Queue routing is opt-in per organization. No existing assignments are migrated.
CREATE TABLE public.wa_routing_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual','automatic','hybrid')),
  max_conversations integer NOT NULL DEFAULT 5 CHECK (max_conversations BETWEEN 1 AND 50)
);
CREATE TABLE public.wa_queue_agents (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT false,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  last_assigned_at timestamptz,
  PRIMARY KEY (organization_id,user_id), UNIQUE (organization_id,employee_id)
);
ALTER TABLE public.wa_routing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_queue_agents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.wa_routing_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wa_queue_agents TO authenticated;
GRANT ALL ON public.wa_routing_settings, public.wa_queue_agents TO service_role;
CREATE POLICY wa_routing_read ON public.wa_routing_settings FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id,'whatsapp_view'));
CREATE POLICY wa_routing_manage ON public.wa_routing_settings FOR ALL TO authenticated
  USING (public.has_org_permission(organization_id,'whatsapp_admin'))
  WITH CHECK (public.can_org_write(organization_id) AND public.has_org_permission(organization_id,'whatsapp_admin'));
CREATE POLICY wa_agents_read ON public.wa_queue_agents FOR SELECT TO authenticated
  USING (public.has_org_permission(organization_id,'whatsapp_view'));
CREATE POLICY wa_agents_self ON public.wa_queue_agents FOR ALL TO authenticated
  USING (user_id=auth.uid() AND public.has_org_permission(organization_id,'whatsapp_view'))
  WITH CHECK (public.can_org_write(organization_id) AND user_id=auth.uid() AND public.has_org_permission(organization_id,'whatsapp_view')
    AND (public.has_org_permission(organization_id,'customer_service_edit') OR public.has_org_permission(organization_id,'whatsapp_admin'))
    AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.employees e ON e.id=p.linked_employee_id
      JOIN public.organization_members m ON m.user_id=p.id AND m.organization_id=e.organization_id
      WHERE p.id=auth.uid() AND e.id=wa_queue_agents.employee_id AND e.organization_id=wa_queue_agents.organization_id AND e.is_active AND m.is_active));

CREATE FUNCTION public.wa_claim_conversation(_org_id uuid, _conversation_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE employee uuid; target public.whatsapp_conversations; capacity integer; routing_mode text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_org_write(_org_id) OR NOT public.has_org_permission(_org_id,'whatsapp_view') OR NOT
    (public.has_org_permission(_org_id,'customer_service_edit') OR public.has_org_permission(_org_id,'whatsapp_admin')) THEN
    RAISE EXCEPTION 'غير مصرح باستلام المحادثات' USING ERRCODE='42501';
  END IF;
  SELECT e.id INTO employee FROM public.profiles p JOIN public.employees e ON e.id=p.linked_employee_id
    JOIN public.organization_members m ON m.user_id=p.id AND m.organization_id=_org_id AND m.is_active
    WHERE p.id=auth.uid() AND e.organization_id=_org_id AND e.is_active;
  IF employee IS NULL THEN RAISE EXCEPTION 'اربط حسابك بملف موظف نشط في المؤسسة'; END IF;
  -- All queue assignment paths share an organization lock, including automatic routing.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_org_id::text,0));
  SELECT max_conversations,mode INTO capacity,routing_mode FROM public.wa_routing_settings WHERE organization_id=_org_id;
  IF routing_mode='automatic' AND NOT public.has_org_permission(_org_id,'whatsapp_admin') THEN
    RAISE EXCEPTION 'التوزيع تلقائي؛ فعّل حالة متاح وانتظر الإسناد';
  END IF;
  IF (SELECT count(*) FROM public.whatsapp_conversations WHERE organization_id=_org_id AND assigned_to=employee
      AND status IN ('open','active','pending','transferred')) >= coalesce(capacity,5) THEN
    RAISE EXCEPTION 'وصلت للحد الأقصى من المحادثات المفتوحة';
  END IF;
  SELECT * INTO target FROM public.whatsapp_conversations WHERE organization_id=_org_id AND assigned_to IS NULL
    AND status IN ('open','active','pending','transferred') AND (_conversation_id IS NULL OR id=_conversation_id)
    ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'low' THEN 3 ELSE 2 END, created_at, id
    LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF target.id IS NULL THEN RAISE EXCEPTION 'المحادثة لم تعد متاحة أو الطابور فارغ'; END IF;
  UPDATE public.whatsapp_conversations SET assigned_to=employee,status='active',auto_assigned=false,assignment_reason='manual_pickup'
    WHERE id=target.id AND organization_id=_org_id AND assigned_to IS NULL;
  INSERT INTO public.conversation_assignments_history(conversation_id,organization_id,action,to_user_id,performed_by,reason,metadata)
    VALUES(target.id,_org_id,'assigned',auth.uid(),auth.uid(),'manual_pickup',jsonb_build_object('employee_id',employee));
  RETURN target.id;
END $$;
REVOKE ALL ON FUNCTION public.wa_claim_conversation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wa_claim_conversation(uuid,uuid) TO authenticated;

-- Called only by authenticated internal Edge Functions, never directly by browsers.
GRANT EXECUTE ON FUNCTION public._org_permission_state(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.wa_dispatch_queue(_org_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE settings public.wa_routing_settings; agent record; convo record; total integer:=0;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Internal only' USING ERRCODE='42501'; END IF;
  IF NOT public.org_has_active_subscription(_org_id) THEN RETURN 0; END IF;
  SELECT * INTO settings FROM public.wa_routing_settings WHERE organization_id=_org_id;
  IF settings.mode IS NULL OR settings.mode='manual' THEN RETURN 0; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_org_id::text,0));
  FOR convo IN SELECT c.id FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id
    AND c.assigned_to IS NULL AND c.status='pending'
    ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'low' THEN 3 ELSE 2 END,c.created_at,c.id
    LIMIT 50 FOR UPDATE SKIP LOCKED
  LOOP
    SELECT a.user_id,a.employee_id INTO agent FROM public.wa_queue_agents a
      JOIN public.employees e ON e.id=a.employee_id AND e.organization_id=a.organization_id AND e.is_active
      JOIN public.profiles p ON p.id=a.user_id AND p.linked_employee_id=e.id
      JOIN public.organization_members m ON m.user_id=a.user_id AND m.organization_id=a.organization_id AND m.is_active
      WHERE a.organization_id=_org_id AND a.available AND a.heartbeat_at > now()-interval '90 seconds'
        AND (SELECT granted FROM public._org_permission_state(_org_id,a.user_id,'whatsapp_view'))
        AND ((SELECT granted FROM public._org_permission_state(_org_id,a.user_id,'customer_service_edit'))
          OR (SELECT granted FROM public._org_permission_state(_org_id,a.user_id,'whatsapp_admin')))
        AND (SELECT count(*) FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id AND c.assigned_to=a.employee_id
          AND c.status IN ('open','active','pending','transferred')) < settings.max_conversations
      ORDER BY (SELECT count(*) FROM public.whatsapp_conversations c WHERE c.organization_id=_org_id AND c.assigned_to=a.employee_id
          AND c.status IN ('open','active','pending','transferred')),a.last_assigned_at NULLS FIRST,a.user_id LIMIT 1;
    IF agent.user_id IS NULL THEN EXIT; END IF;
    UPDATE public.whatsapp_conversations SET assigned_to=agent.employee_id,status='active',auto_assigned=true,assignment_reason='queue_auto'
      WHERE id=convo.id AND assigned_to IS NULL;
    UPDATE public.wa_queue_agents SET last_assigned_at=now() WHERE organization_id=_org_id AND user_id=agent.user_id;
    INSERT INTO public.conversation_assignments_history(conversation_id,organization_id,action,to_user_id,reason,metadata)
      VALUES(convo.id,_org_id,'assigned',agent.user_id,'queue_auto',jsonb_build_object('employee_id',agent.employee_id));
    total:=total+1;
  END LOOP;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.wa_dispatch_queue(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wa_dispatch_queue(uuid) TO service_role;

-- Validate every assignment path, including legacy automation and direct API updates.
CREATE FUNCTION public.wa_validate_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE own_employee uuid; capacity integer;
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'لا يمكن نقل المحادثة إلى مؤسسة أخرى' USING ERRCODE='42501';
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id=NEW.assigned_to AND organization_id=NEW.organization_id AND is_active
  ) THEN RAISE EXCEPTION 'الموظف غير نشط أو خارج المؤسسة' USING ERRCODE='42501'; END IF;
  IF auth.uid() IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    IF NOT public.has_org_permission(NEW.organization_id,'whatsapp_view') OR NOT
      (public.has_org_permission(NEW.organization_id,'customer_service_edit') OR public.has_org_permission(NEW.organization_id,'whatsapp_admin')) THEN
      RAISE EXCEPTION 'غير مصرح بتغيير الإسناد' USING ERRCODE='42501';
    END IF;
    SELECT linked_employee_id INTO own_employee FROM public.profiles WHERE id=auth.uid();
    IF NOT public.has_org_permission(NEW.organization_id,'whatsapp_admin') AND
      ((OLD.assigned_to IS NOT NULL AND OLD.assigned_to IS DISTINCT FROM own_employee)
        OR (NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM own_employee)) THEN
      RAISE EXCEPTION 'التحويل إلى موظف آخر يحتاج صلاحية إدارة واتساب' USING ERRCODE='42501';
    END IF;
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.organization_id::text,0));
    SELECT max_conversations INTO capacity FROM public.wa_routing_settings WHERE organization_id=NEW.organization_id;
    IF (SELECT count(*) FROM public.whatsapp_conversations WHERE organization_id=NEW.organization_id
      AND assigned_to=NEW.assigned_to AND id<>NEW.id AND status IN ('open','active','pending','transferred')) >= coalesce(capacity,5) THEN
      RAISE EXCEPTION 'وصل الموظف للحد الأقصى من المحادثات المفتوحة';
    END IF;
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wa_validate_assignment BEFORE UPDATE OF assigned_to,organization_id ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.wa_validate_assignment();
REVOKE ALL ON FUNCTION public.wa_validate_assignment() FROM PUBLIC,anon;

ALTER TABLE public.whatsapp_chatbot_settings
  ADD COLUMN bot_mode text NOT NULL DEFAULT 'ai' CHECK (bot_mode IN ('ai','guided')),
  ADD COLUMN knowledge_base text NOT NULL DEFAULT '' CHECK (length(knowledge_base)<=12000);
CREATE TABLE public.wa_bot_intake (
  conversation_id uuid PRIMARY KEY REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 5),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_id uuid,
  completed boolean NOT NULL DEFAULT false
);
ALTER TABLE public.wa_bot_intake ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.wa_bot_intake TO authenticated;
GRANT ALL ON public.wa_bot_intake TO service_role;
CREATE POLICY wa_intake_read ON public.wa_bot_intake FOR SELECT TO authenticated
  USING(public.has_org_permission(organization_id,'whatsapp_view'));
CREATE FUNCTION public.wa_intake_step(_org_id uuid,_conversation_id uuid,_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE intake public.wa_bot_intake; inbound text; reply text;
  keys text[]:=ARRAY['destination','dates','travelers','budget','style'];
  questions text[]:=ARRAY['ما الوجهة التي ترغب في السفر إليها؟','ما تاريخ السفر والعودة؟','كم عدد المسافرين وأعمار الأطفال إن وجدوا؟','ما الميزانية التقريبية وما العملة؟','ما نوع الرحلة أو مستوى الفندق الذي تفضله؟'];
BEGIN
  IF current_user<>'service_role' THEN RAISE EXCEPTION 'Internal only' USING ERRCODE='42501'; END IF;
  SELECT content INTO inbound FROM public.whatsapp_messages WHERE id=_message_id AND organization_id=_org_id
    AND conversation_id=_conversation_id AND direction='inbound';
  IF inbound IS NULL THEN RAISE EXCEPTION 'Invalid inbound message'; END IF;
  PERFORM 1 FROM public.whatsapp_conversations WHERE id=_conversation_id AND organization_id=_org_id
    AND assigned_to IS NULL AND status IN ('active','open') FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('skipped',true); END IF;
  INSERT INTO public.wa_bot_intake(conversation_id,organization_id) VALUES(_conversation_id,_org_id) ON CONFLICT DO NOTHING;
  SELECT * INTO intake FROM public.wa_bot_intake WHERE conversation_id=_conversation_id AND organization_id=_org_id FOR UPDATE;
  IF intake.completed OR intake.last_message_id=_message_id THEN RETURN jsonb_build_object('skipped',true); END IF;
  IF intake.step=0 THEN
    intake.answers:=jsonb_build_object('initial_request',inbound); reply:=questions[1]; intake.step:=1;
  ELSE
    intake.answers:=intake.answers || jsonb_build_object(keys[intake.step],inbound);
    IF intake.step=5 THEN
      intake.completed:=true; reply:='شكرًا، سجلت تفاصيل طلبك وسيستلم أحد موظفينا المحادثة لمراجعة العرض معك. الأسعار والتوافر تحتاج تأكيد الموظف.';
      UPDATE public.whatsapp_conversations SET status='pending',assignment_reason='chatbot_intake_complete'
        WHERE id=_conversation_id AND organization_id=_org_id AND assigned_to IS NULL;
    ELSE intake.step:=intake.step+1; reply:=questions[intake.step]; END IF;
  END IF;
  UPDATE public.wa_bot_intake SET step=intake.step,answers=intake.answers,completed=intake.completed,last_message_id=_message_id
    WHERE conversation_id=_conversation_id AND organization_id=_org_id;
  RETURN jsonb_build_object('reply',reply,'completed',intake.completed);
END $$;
REVOKE ALL ON FUNCTION public.wa_intake_step(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wa_intake_step(uuid,uuid,uuid) TO service_role;
