-- Company opt-in for task-only automations. Missing rows are disabled.
CREATE TABLE public.starter_automation_settings (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key IN ('confirmed_booking', 'payment_due', 'pre_travel')),
  enabled_at timestamptz NOT NULL,
  PRIMARY KEY (organization_id, rule_key)
);

ALTER TABLE public.starter_automation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.starter_automation_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.starter_automation_settings TO authenticated;

CREATE POLICY "Company automation viewers read starter settings"
ON public.starter_automation_settings FOR SELECT TO authenticated
USING (EXISTS (
  SELECT FROM public._org_permission_state(organization_id, (SELECT auth.uid()), 'automation_view') p
  WHERE p.granted
));

CREATE FUNCTION operations_private.set_starter_automation(_org uuid, _rule text, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM public._org_permission_state(_org, auth.uid(), 'automation_edit') p
    WHERE p.granted AND p.data_scope = 'organization'
  ) OR NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'starter_automation_access_denied' USING ERRCODE = '42501';
  END IF;
  IF _rule IS NULL OR _rule NOT IN ('confirmed_booking', 'payment_due', 'pre_travel') OR _enabled IS NULL THEN
    RAISE EXCEPTION 'starter_automation_invalid_setting' USING ERRCODE = '22023';
  END IF;

  IF _enabled THEN
    INSERT INTO public.starter_automation_settings(organization_id, rule_key, enabled_at)
    VALUES (_org, _rule, now()) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.starter_automation_settings
    WHERE organization_id = _org AND rule_key = _rule;
  END IF;
END;
$$;

CREATE FUNCTION public.set_starter_automation(_org uuid, _rule text, _enabled boolean)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT operations_private.set_starter_automation(_org, _rule, _enabled); $$;

REVOKE ALL ON FUNCTION operations_private.set_starter_automation(uuid,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_starter_automation(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION operations_private.set_starter_automation(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_starter_automation(uuid,text,boolean) TO authenticated;

-- The claim and task are written together. Removing a task in the workspace
-- keeps the claim so that a retry does not silently recreate it.
CREATE TABLE operations_private.starter_automation_tasks (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  entity_id uuid NOT NULL,
  task_id uuid REFERENCES public.booking_tasks(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, rule_key, entity_id)
);
REVOKE ALL ON operations_private.starter_automation_tasks FROM PUBLIC, anon, authenticated;
CREATE INDEX starter_automation_tasks_task_idx ON operations_private.starter_automation_tasks(task_id);

CREATE FUNCTION operations_private.create_starter_task(
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

  INSERT INTO public.booking_tasks(organization_id, booking_id, title, description, due_at, priority, source)
  VALUES (_booking.organization_id, _booking.id, _title, _description, _due, _priority, 'automation')
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
REVOKE ALL ON FUNCTION operations_private.create_starter_task(public.bookings,text,uuid,text,text,timestamptz,text)
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION operations_private.on_starter_booking_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.is_demo IS TRUE OR NEW.start_date < (now() AT TIME ZONE 'Africa/Cairo')::date
    OR coalesce(NEW.status, '') IN ('cancelled', 'canceled', 'completed')
    OR NEW.workflow_stage::text IN ('cancelled', 'completed', 'post_travel')
    OR NOT (coalesce(NEW.status, '') = 'confirmed' OR coalesce(NEW.workflow_stage::text, '') = 'confirmed')
  THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' AND (
    coalesce(OLD.status, '') = 'confirmed' OR coalesce(OLD.workflow_stage::text, '') = 'confirmed'
  ) THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT FROM public.starter_automation_settings s
    WHERE s.organization_id = NEW.organization_id AND s.rule_key = 'confirmed_booking'
  ) AND public.org_has_active_subscription(NEW.organization_id) THEN
    PERFORM operations_private.create_starter_task(
      NEW, 'confirmed_booking', NEW.id, 'مراجعة الحجز المؤكد',
      'راجع بيانات العميل وتأكيد المورد والخدمات المتفق عليها.', now() + interval '2 hours', 'normal'
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.on_starter_booking_confirmation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER starter_booking_confirmation
AFTER INSERT OR UPDATE OF status, workflow_stage ON public.bookings
FOR EACH ROW EXECUTE FUNCTION operations_private.on_starter_booking_confirmation();

CREATE INDEX starter_automation_invoice_due_idx ON public.invoices(organization_id, due_date)
WHERE booking_id IS NOT NULL AND remaining_amount > 0 AND NOT coalesce(is_demo, false)
  AND coalesce(status, 'draft') NOT IN ('draft', 'paid', 'cancelled', 'canceled', 'void');

CREATE FUNCTION operations_private.dispatch_starter_booking_tasks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  cairo_day date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  booking public.bookings;
  payment record;
BEGIN
  FOR booking IN
    SELECT b.*
    FROM public.starter_automation_settings s
    JOIN public.bookings b ON b.organization_id = s.organization_id
    WHERE s.rule_key = 'pre_travel'
      AND b.start_date BETWEEN cairo_day AND cairo_day + 3
      AND NOT coalesce(b.is_demo, false)
      AND coalesce(b.status, '') NOT IN ('cancelled', 'canceled', 'completed')
      AND b.workflow_stage::text NOT IN ('cancelled','completed','post_travel')
      AND (b.status = 'confirmed' OR b.workflow_stage::text IN ('confirmed','paid','operations'))
      AND public.org_has_active_subscription(s.organization_id)
      AND NOT EXISTS (
        SELECT FROM operations_private.starter_automation_tasks t
        WHERE t.organization_id = s.organization_id AND t.rule_key = s.rule_key AND t.entity_id = b.id
      )
    ORDER BY b.start_date, b.id LIMIT 500
  LOOP
    PERFORM operations_private.create_starter_task(
      booking, 'pre_travel', booking.id, 'مراجعة تجهيزات ما قبل السفر',
      'راجع الوثائق والفوتشرات ومواعيد الرحلة والانتقالات حسب نوع الحجز.',
      ((booking.start_date - 1)::date + time '12:00') AT TIME ZONE 'Africa/Cairo', 'high'
    );
  END LOOP;

  FOR payment IN
    SELECT b AS booking, i.id AS invoice_id, i.due_date
    FROM public.starter_automation_settings s
    JOIN public.invoices i ON i.organization_id = s.organization_id
    JOIN public.bookings b ON b.id = i.booking_id AND b.organization_id = i.organization_id
    WHERE s.rule_key = 'payment_due'
      AND i.due_date BETWEEN (s.enabled_at AT TIME ZONE 'Africa/Cairo')::date AND cairo_day
      AND i.remaining_amount > 0 AND NOT coalesce(i.is_demo, false)
      AND coalesce(i.status, 'draft') NOT IN ('draft', 'paid', 'cancelled', 'canceled', 'void')
      AND NOT coalesce(b.is_demo, false) AND coalesce(b.status, '') NOT IN ('cancelled', 'canceled')
      AND b.workflow_stage::text <> 'cancelled'
      AND public.org_has_active_subscription(s.organization_id)
      AND NOT EXISTS (
        SELECT FROM operations_private.starter_automation_tasks t
        WHERE t.organization_id = s.organization_id AND t.rule_key = s.rule_key AND t.entity_id = i.id
      )
    ORDER BY i.due_date, i.id LIMIT 500
  LOOP
    PERFORM operations_private.create_starter_task(
      payment.booking, 'payment_due', payment.invoice_id, 'متابعة تحصيل فاتورة مستحقة',
      'راجع حالة التحصيل في تبويب مالية الحجز وتابع المبلغ المتبقي.',
      (payment.due_date + time '17:00') AT TIME ZONE 'Africa/Cairo', 'high'
    );
  END LOOP;

  -- Only automation-owned open tasks are closed when their source is no longer actionable.
  UPDATE public.booking_tasks t SET status = 'cancelled', waiting_on = NULL
  FROM operations_private.starter_automation_tasks run, public.bookings b
  WHERE t.id = run.task_id AND t.organization_id = run.organization_id
    AND b.id = t.booking_id AND b.organization_id = t.organization_id
    AND t.status NOT IN ('done', 'completed', 'cancelled', 'canceled')
    AND (
      b.status IN ('cancelled', 'canceled') OR b.workflow_stage::text = 'cancelled'
      OR (run.rule_key = 'payment_due' AND NOT EXISTS (
        SELECT FROM public.invoices i WHERE i.id = run.entity_id AND i.organization_id = run.organization_id
          AND i.booking_id = b.id AND i.remaining_amount > 0
          AND coalesce(i.status, 'draft') NOT IN ('draft', 'paid', 'cancelled', 'canceled', 'void')
      ))
    );

  -- Preserve the task and its history when travel or the due date is rescheduled.
  UPDATE public.booking_tasks t SET due_at = next_due.due_at
  FROM (
    SELECT run.task_id, run.organization_id,
      CASE run.rule_key
        WHEN 'pre_travel' THEN ((b.start_date - 1)::date + time '12:00') AT TIME ZONE 'Africa/Cairo'
        ELSE (i.due_date + time '17:00') AT TIME ZONE 'Africa/Cairo'
      END AS due_at
    FROM operations_private.starter_automation_tasks run
    JOIN public.booking_tasks bt ON bt.id = run.task_id AND bt.organization_id = run.organization_id
    JOIN public.bookings b ON b.id = bt.booking_id AND b.organization_id = bt.organization_id
    LEFT JOIN public.invoices i ON run.rule_key = 'payment_due' AND i.id = run.entity_id AND i.organization_id = run.organization_id
    WHERE run.rule_key IN ('pre_travel', 'payment_due')
      AND bt.status NOT IN ('done', 'completed', 'cancelled', 'canceled')
  ) next_due
  WHERE t.id = next_due.task_id AND t.organization_id = next_due.organization_id
    AND t.status NOT IN ('done', 'completed', 'cancelled', 'canceled')
    AND t.due_at IS DISTINCT FROM next_due.due_at;
END;
$$;
REVOKE ALL ON FUNCTION operations_private.dispatch_starter_booking_tasks() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('dispatch-starter-booking-tasks', '*/5 * * * *',
  'SELECT operations_private.dispatch_starter_booking_tasks();');
