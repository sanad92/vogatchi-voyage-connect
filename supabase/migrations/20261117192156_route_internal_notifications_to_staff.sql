-- A notification is personal and remains scoped to an active company.
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Active employees read their own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND (
  organization_id IS NULL OR organization_id = ANY(public.get_user_org_ids((SELECT auth.uid())))
));

REVOKE UPDATE ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE INDEX personal_notifications_inbox_idx
ON public.notifications(organization_id, user_id, created_at DESC, id DESC)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX personal_notification_delivery_key
ON public.notifications(organization_id, user_id, (metadata->>'delivery_key'))
WHERE user_id IS NOT NULL AND metadata ? 'delivery_key';

-- Preserve the public permission lookup's caller boundary. Trusted dispatchers
-- need to evaluate candidate recipients, even when triggered by another user.
DO $split_permission$
DECLARE
  definition text := pg_get_functiondef('public._org_permission_state(uuid,uuid,text)'::regprocedure);
  member_lookup integer := strpos(definition, '  SELECT om.role::TEXT INTO v_role');
  caller_guard integer := strpos(definition, '  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid()');
  guard_end integer;
BEGIN
  IF member_lookup = 0 THEN RAISE EXCEPTION 'Unexpected organization permission implementation'; END IF;
  IF caller_guard > 0 THEN
    guard_end := caller_guard + strpos(substring(definition FROM caller_guard), '  END IF;') + length('  END IF;') - 1;
    IF guard_end >= member_lookup THEN RAISE EXCEPTION 'Unexpected permission caller guard'; END IF;
    definition := left(definition, caller_guard - 1) || substring(definition FROM guard_end);
  END IF;
  EXECUTE replace(definition, 'FUNCTION public._org_permission_state(', 'FUNCTION operations_private.org_permission_state(');
END;
$split_permission$;
REVOKE ALL ON FUNCTION operations_private.org_permission_state(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._org_permission_state(_org_id uuid, _user_id uuid, _permission text)
RETURNS TABLE(granted boolean, data_scope text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid()
    AND NOT public.is_platform_admin(auth.uid())
    AND NOT EXISTS (
      SELECT FROM public.organization_members m
      WHERE m.organization_id = _org_id AND m.user_id = auth.uid()
        AND m.is_active AND m.role IN ('owner','admin')
    ) THEN
    RETURN QUERY SELECT false, 'none'::text;
    RETURN;
  END IF;
  RETURN QUERY SELECT p.granted,p.data_scope
  FROM operations_private.org_permission_state(_org_id,_user_id,_permission) p;
END;
$$;

CREATE FUNCTION operations_private.notification_recipient(
  _org uuid, _booking uuid, _preferred uuid, _permission text, _department text DEFAULT NULL, _exclude uuid DEFAULT NULL
) RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT m.user_id
  FROM public.organization_members m
  LEFT JOIN pilgrimage_inventory_private.booking_staff s
    ON s.organization_id = m.organization_id AND s.booking_id = _booking
  CROSS JOIN LATERAL operations_private.org_permission_state(_org, m.user_id, _permission) p
  WHERE m.organization_id = _org AND m.is_active AND m.user_id IS DISTINCT FROM _exclude
    AND p.granted AND (
      p.data_scope = 'organization' OR (
        p.data_scope = 'own' AND (
          (_permission = 'bookings_view' AND s.operations_user_id = m.user_id)
          OR (_permission = 'quotes_view' AND m.user_id = _preferred)
        )
      )
    )
    AND (
      _booking IS NULL OR EXISTS (
        SELECT FROM operations_private.org_permission_state(_org,m.user_id,'bookings_view') access
        WHERE access.granted AND (access.data_scope = 'organization' OR (
          access.data_scope = 'own' AND s.operations_user_id = m.user_id
        ))
      )
    )
    AND (_permission <> 'bookings_edit' OR m.role IN ('owner','admin','manager'))
  ORDER BY (m.user_id IS NOT DISTINCT FROM _preferred) DESC,
    CASE WHEN _department IS NOT NULL AND EXISTS (
      SELECT FROM public.sop_department_members d
      WHERE d.organization_id = _org AND d.user_id = m.user_id AND d.department::text = _department
    ) THEN 0 WHEN _department IS NULL AND s.operations_user_id = m.user_id THEN 0 ELSE 1 END,
    CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, m.user_id
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION operations_private.notification_recipient(uuid,uuid,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION operations_private.deliver_notification(
  _org uuid, _user uuid, _delivery text, _title text, _message text, _url text,
  _type text DEFAULT 'info', _priority text DEFAULT 'normal'
) RETURNS void LANGUAGE sql SET search_path = ''
AS $$
  INSERT INTO public.notifications(organization_id,user_id,title,message,type,priority,is_read,action_url,metadata)
  SELECT _org,_user,_title,_message,_type,_priority,false,_url,jsonb_build_object('delivery_key',_delivery)
  WHERE EXISTS (
    SELECT FROM public.organization_members m WHERE m.organization_id = _org AND m.user_id = _user AND m.is_active
  )
  ON CONFLICT (organization_id,user_id,(metadata->>'delivery_key'))
    WHERE user_id IS NOT NULL AND metadata ? 'delivery_key' DO NOTHING
$$;
REVOKE ALL ON FUNCTION operations_private.deliver_notification(uuid,uuid,text,text,text,text,text,text)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handler_notify_in_app(p_event public.domain_events)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  org uuid := p_event.organization_id;
  booking uuid;
  booking_key text;
  recipient uuid;
  preferred uuid;
  channels text[];
  title text;
  route text;
BEGIN
  IF org IS NULL THEN RETURN; END IF;
  SELECT r.channels INTO channels FROM public.notification_rules r
  WHERE r.event_type = p_event.event_type AND r.is_active
    AND (r.organization_id = org OR r.organization_id IS NULL)
  ORDER BY r.organization_id NULLS LAST,r.id LIMIT 1;
  IF NOT ('in_app' = ANY(coalesce(channels,ARRAY['in_app']))) THEN RETURN; END IF;

  title := CASE p_event.event_type
    WHEN 'booking.created' THEN 'تم إنشاء حجز'
    WHEN 'booking.stage_changed' THEN 'تغيّرت مرحلة الحجز'
    WHEN 'booking.completed' THEN 'اكتمل الحجز'
    WHEN 'voucher.generated' THEN 'الفوتشر جاهز'
    WHEN 'invoice.created' THEN 'تم إصدار فاتورة'
    WHEN 'invoice.paid' THEN 'تم سداد فاتورة'
    WHEN 'customer.payment.recorded' THEN 'تم تسجيل تحصيل من عميل'
    WHEN 'supplier.po.created' THEN 'تم إنشاء أمر دفع مورد'
    WHEN 'supplier.po.approved' THEN 'تم اعتماد أمر دفع مورد'
    WHEN 'supplier.payment.recorded' THEN 'تم تسجيل دفعة لمورد'
    WHEN 'refund.requested' THEN 'تم تسجيل طلب استرداد'
    WHEN 'refund.approved' THEN 'تم اعتماد طلب استرداد'
    WHEN 'refund.paid' THEN 'تم رد مبلغ للعميل'
    WHEN 'quote.created' THEN 'تم إنشاء عرض سعر'
    WHEN 'quote.accepted' THEN 'تم قبول عرض السعر'
    WHEN 'quote.rejected' THEN 'تم رفض عرض السعر'
  END;
  IF title IS NULL THEN RETURN; END IF;

  booking_key := CASE WHEN p_event.aggregate_type = 'booking' THEN p_event.aggregate_id::text
    ELSE coalesce(p_event.payload->>'booking_id',p_event.enriched_payload->>'booking_id') END;
  IF booking_key IS NOT NULL THEN
    IF booking_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN; END IF;
    SELECT b.id INTO booking FROM public.bookings b
    WHERE b.id = booking_key::uuid AND b.organization_id = org AND NOT coalesce(b.is_demo,false);
    IF NOT FOUND THEN RETURN; END IF;
  END IF;

  IF p_event.aggregate_type = 'quote' THEN
    SELECT q.created_by INTO preferred FROM public.quotes q
    WHERE q.id = p_event.aggregate_id AND q.organization_id = org AND NOT q.is_demo;
    IF NOT FOUND THEN RETURN; END IF;
    recipient := operations_private.notification_recipient(org,NULL,preferred,'quotes_view');
    route := '/quotes/' || p_event.aggregate_id;
  ELSIF p_event.event_type ~ '^(invoice\.|customer\.payment\.|supplier\.|refund\.)' THEN
    IF coalesce(p_event.payload->>'is_demo','false') = 'true' THEN RETURN; END IF;
    recipient := operations_private.notification_recipient(org,booking,NULL,'financial_view','finance');
    route := CASE WHEN booking IS NOT NULL THEN '/bookings/' || booking || '?tab=financials'
      WHEN p_event.event_type LIKE 'refund.%' THEN '/refund-balances' ELSE '/executive-finance' END;
  ELSE
    IF booking IS NULL THEN RETURN; END IF;
    recipient := operations_private.notification_recipient(org,booking,NULL,'bookings_view');
    route := '/bookings/' || booking || CASE WHEN p_event.event_type = 'voucher.generated' THEN '?tab=documents' ELSE '?tab=timeline' END;
  END IF;

  PERFORM operations_private.deliver_notification(org,recipient,'event:' || p_event.id,title,
    'افتح الإشعار لعرض التفاصيل.',route);
END;
$$;
REVOKE ALL ON FUNCTION public.handler_notify_in_app(public.domain_events) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION operations_private.notify_booking_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.assignee_id IS NULL OR NEW.status IN ('cancelled','canceled','done','completed')
    OR (TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id) THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT FROM public.bookings b WHERE b.id = NEW.booking_id
    AND b.organization_id = NEW.organization_id AND NOT coalesce(b.is_demo,false)) OR
    operations_private.notification_recipient(NEW.organization_id,NEW.booking_id,NEW.assignee_id,'bookings_view')
      IS DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;

  PERFORM operations_private.deliver_notification(
    NEW.organization_id,NEW.assignee_id,'task:' || NEW.id,
    'مهمة جديدة على حجز',NEW.title,'/bookings/' || NEW.booking_id || '?tab=tasks&task=' || NEW.id,
    'info',CASE WHEN NEW.priority IN ('low','normal','high','urgent') THEN NEW.priority ELSE 'normal' END
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.notify_booking_task_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_booking_task_assignment AFTER INSERT OR UPDATE OF assignee_id ON public.booking_tasks
FOR EACH ROW EXECUTE FUNCTION operations_private.notify_booking_task_assignment();

CREATE FUNCTION operations_private.notify_booking_edit_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  org uuid;
  recipient uuid;
  title text;
BEGIN
  SELECT b.organization_id INTO org FROM public.bookings b
  WHERE b.id = NEW.booking_id AND NOT coalesce(b.is_demo,false);
  IF org IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    recipient := operations_private.notification_recipient(org,NEW.booking_id,NULL,'bookings_edit',NULL,NEW.requested_by);
    IF recipient IS NULL THEN
      recipient := operations_private.notification_recipient(org,NEW.booking_id,NULL,'bookings_edit');
    END IF;
    title := 'طلب فتح تعديل حجز';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    recipient := operations_private.notification_recipient(org,NEW.booking_id,NEW.requested_by,'bookings_view');
    IF recipient IS DISTINCT FROM NEW.requested_by THEN RETURN NEW; END IF;
    title := CASE WHEN NEW.status='approved' THEN 'تم قبول طلب تعديل الحجز' ELSE 'تم رفض طلب تعديل الحجز' END;
  ELSE RETURN NEW; END IF;

  PERFORM operations_private.deliver_notification(org,recipient,'edit:' || NEW.id || ':' || NEW.status,title,
    'افتح ملف الحجز لمراجعة الطلب.', '/bookings/' || NEW.booking_id || '?tab=amendments');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.notify_booking_edit_request() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_booking_edit_request AFTER INSERT OR UPDATE OF status
ON pilgrimage_inventory_private.booking_edit_requests
FOR EACH ROW EXECUTE FUNCTION operations_private.notify_booking_edit_request();

CREATE OR REPLACE FUNCTION public.handler_notification_dispatch(p_event public.domain_events)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_channels text[];
  v_payload jsonb := coalesce(p_event.enriched_payload, p_event.payload, '{}'::jsonb);
  v_email text := v_payload->>'customer_email';
  v_booking uuid;
BEGIN
  SELECT channels INTO v_channels
  FROM public.notification_rules
  WHERE event_type = p_event.event_type
    AND is_active = true
    AND (organization_id = p_event.organization_id OR organization_id IS NULL)
  ORDER BY organization_id NULLS LAST
  LIMIT 1;

  IF v_channels IS NULL THEN v_channels := ARRAY['in_app']; END IF;

  IF 'in_app' = ANY(v_channels) THEN
    PERFORM public.handler_notify_in_app(p_event);
  END IF;

  IF 'email' = ANY(v_channels) AND v_email IS NOT NULL AND v_email <> '' THEN
    INSERT INTO public.email_queue(email_type, recipient_email, recipient_name, subject, template_data, organization_id)
    SELECT p_event.event_type, v_email, coalesce(v_payload->>'customer_name',''),
           coalesce(v_payload->>'subject', p_event.event_type),
           v_payload || jsonb_build_object('source_event_id', p_event.id),
           p_event.organization_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.email_queue eq
      WHERE eq.organization_id = p_event.organization_id AND eq.template_data->>'source_event_id' = p_event.id::text
    );
  END IF;

  IF 'whatsapp' = ANY(v_channels) THEN
    SELECT b.id INTO v_booking FROM public.bookings b
    WHERE b.organization_id = p_event.organization_id AND NOT coalesce(b.is_demo,false)
      AND b.id::text = CASE WHEN p_event.aggregate_type = 'booking' THEN p_event.aggregate_id::text
        ELSE v_payload->>'booking_id' END;
    IF v_booking IS NOT NULL THEN
      INSERT INTO public.messaging_suggestions(organization_id,booking_id,channel,template_key,template_variables,status)
      VALUES (p_event.organization_id,v_booking,'whatsapp',p_event.event_type,
        jsonb_build_object('source_event_id',p_event.id),'suggested')
      ON CONFLICT (booking_id,channel,template_key) DO NOTHING;
    END IF;
  END IF;
END; $function$;
REVOKE ALL ON FUNCTION public.handler_notification_dispatch(public.domain_events) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION operations_private.create_starter_task(
  _booking public.bookings, _rule text, _entity uuid, _title text, _description text, _due timestamptz, _priority text
)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  task uuid;
BEGIN
  INSERT INTO operations_private.starter_automation_tasks(organization_id, rule_key, entity_id)
  VALUES (_booking.organization_id, _rule, _entity)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.booking_tasks(organization_id, booking_id, title, description, due_at, priority, source, assignee_id)
  VALUES (_booking.organization_id, _booking.id, _title, _description, _due, _priority, 'automation',
    CASE WHEN _rule IN ('payment_due','supplier_payment_due') THEN
      operations_private.notification_recipient(_booking.organization_id,_booking.id,NULL,'financial_view','finance')
    ELSE operations_private.notification_recipient(_booking.organization_id,_booking.id,NULL,'bookings_view') END
  )
  RETURNING id INTO task;

  UPDATE operations_private.starter_automation_tasks SET task_id = task
  WHERE organization_id = _booking.organization_id AND rule_key = _rule AND entity_id = _entity;

  INSERT INTO public.automation_logs(
    organization_id, trigger_type, action_type, booking_id, booking_type, status, metadata, completed_at
  ) VALUES (
    _booking.organization_id, _rule, 'create_operations_task', _booking.id, _booking.booking_type,
    'completed', jsonb_build_object('task_id', task), now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_quote_followups()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  due record;
  dispatched integer := 0;
BEGIN
  FOR due IN
    SELECT f.id, f.quote_id, f.organization_id, target.recipient
    FROM public.quote_followups f
    JOIN public.quotes q ON q.id = f.quote_id AND q.organization_id = f.organization_id AND NOT q.is_demo
    CROSS JOIN LATERAL (
      SELECT operations_private.notification_recipient(f.organization_id,NULL,coalesce(f.owner_user_id,q.created_by),'quotes_view') AS recipient
    ) target
    WHERE f.status = 'pending' AND f.due_at <= now() AND q.status IN ('sent','viewed')
      AND target.recipient IS NOT NULL
    ORDER BY f.due_at, f.id LIMIT 500 FOR UPDATE OF f SKIP LOCKED
  LOOP
    PERFORM operations_private.deliver_notification(due.organization_id,due.recipient,'quote_followup:' || due.id,
      'موعد متابعة عرض سعر','افتح العرض وراجع المتابعة المطلوبة.', '/quotes/' || due.quote_id);
    UPDATE public.quote_followups SET status='notified',notified_at=now()
    WHERE id=due.id;
    dispatched := dispatched + 1;
  END LOOP;
  RETURN dispatched;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_quote_followups() FROM PUBLIC, anon, authenticated;

-- Recover recent company-only event notices through normal routing without duplicating the recipient's inbox.
SELECT public.handler_notify_in_app(e)
FROM public.domain_events e
WHERE e.occurred_at >= now() - interval '7 days'
  AND EXISTS (
    SELECT FROM public.notifications n
    WHERE n.organization_id = e.organization_id AND n.user_id IS NULL AND n.created_at >= now() - interval '7 days'
      AND n.metadata->>'source_event_id' = e.id::text
  );
