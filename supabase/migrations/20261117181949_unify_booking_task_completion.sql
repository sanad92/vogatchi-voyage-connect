-- Restore the workspace's existing 'done' lifecycle and read both stored completion statuses.
DROP INDEX public.ops_booking_tasks_org_due;
CREATE INDEX ops_booking_tasks_org_due ON public.booking_tasks(organization_id,due_at)
  WHERE status NOT IN ('done','completed','cancelled','canceled');

DROP INDEX public.ops_booking_tasks_org_completed;
CREATE INDEX ops_booking_tasks_org_completed ON public.booking_tasks(organization_id,(coalesce(completed_at,updated_at)))
  WHERE status IN ('done','completed');

CREATE FUNCTION operations_private.can_manage_task(t public.booking_tasks,_actor uuid,_company_edit boolean)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT _company_edit OR coalesce(t.created_by=_actor OR t.assignee_id=_actor,false)
    OR (t.assignee_id IS NULL AND t.created_by IS NULL AND t.booking_id IS NOT NULL
      AND operations_private.owns_booking(t.booking_id,_actor))
$$;
REVOKE ALL ON FUNCTION operations_private.can_manage_task(public.booking_tasks,uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION operations_private.dashboard(_org uuid,_day date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  scope text := operations_private.booking_scope(_org);
  actor uuid := auth.uid();
  zone text := 'Africa/Cairo';
  day date := coalesce(_day,(now() AT TIME ZONE 'Africa/Cairo')::date);
  start_at timestamptz;
  end_at timestamptz;
  finance boolean;
  whatsapp boolean;
BEGIN
  start_at:=day::timestamp AT TIME ZONE zone;
  end_at:=(day+1)::timestamp AT TIME ZONE zone;
  finance:=EXISTS (SELECT FROM public._org_permission_state(_org,actor,'financial_view') s
    WHERE s.granted AND s.data_scope='organization');
  whatsapp:=EXISTS (SELECT FROM public._org_permission_state(_org,actor,'whatsapp_admin') s
    WHERE s.granted AND s.data_scope='organization');

  RETURN (
  WITH trips AS (
    SELECT b.start_date,b.end_date FROM public.bookings b
    WHERE b.organization_id=_org AND NOT b.is_demo
      AND coalesce(b.status,'') NOT IN ('cancelled','canceled') AND b.workflow_stage::text<>'cancelled'
      AND (scope='organization' OR operations_private.owns_booking(b.id,actor))
      AND (b.start_date BETWEEN day AND day+7 OR b.end_date=day)
  ), tasks AS (
    SELECT t.due_at FROM public.booking_tasks t
    LEFT JOIN public.bookings b ON b.id=t.booking_id AND b.organization_id=t.organization_id
    WHERE t.organization_id=_org AND operations_private.task_visible(t,scope,actor)
      AND (t.booking_id IS NULL OR (b.id IS NOT NULL AND NOT b.is_demo AND coalesce(b.status,'') NOT IN ('cancelled','canceled')
        AND b.workflow_stage::text<>'cancelled'))
      AND t.status NOT IN ('done','completed','cancelled','canceled') AND t.due_at<greatest(end_at,now())
  )
  SELECT jsonb_build_object(
    'date',day,
    'timezone',zone,
    'arrivals_today',(SELECT count(*) FROM trips WHERE start_date=day),
    'departures_today',(SELECT count(*) FROM trips WHERE end_date=day),
    'checkins_next_7',(SELECT count(*) FROM trips WHERE start_date>day AND start_date<=day+7),
    'today_tasks',(SELECT count(*) FROM tasks WHERE due_at>=start_at AND due_at<end_at),
    'overdue_tasks',(SELECT count(*) FROM tasks WHERE due_at<now()),
    'edit_requests',(SELECT count(*) FROM pilgrimage_inventory_private.booking_edit_requests r
      JOIN public.bookings b ON b.id=r.booking_id
      WHERE b.organization_id=_org AND NOT b.is_demo AND b.status NOT IN ('cancelled','canceled')
        AND b.workflow_stage::text<>'cancelled' AND r.status='pending'
        AND (operations_private.edit_manager(_org) OR r.requested_by=actor)),
    'failed_events',CASE WHEN scope='organization' AND operations_private.edit_manager(_org) THEN
      (SELECT count(DISTINCT e.id) FROM public.event_deliveries d JOIN public.domain_events e ON e.id=d.event_id
        WHERE e.organization_id=_org AND d.status IN ('failed','dead')) END,
    'whatsapp_failures_24h',CASE WHEN whatsapp THEN
      (SELECT count(*) FROM public.whatsapp_messages WHERE organization_id=_org
        AND status='failed' AND created_at>=now()-interval '24 hours') END,
    'finance',CASE WHEN finance THEN jsonb_build_object(
      'receivables',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.currency) FROM (
        SELECT coalesce(i.currency,'EGP') AS currency,sum(i.remaining_amount) AS amount
        FROM public.invoices i WHERE i.organization_id=_org AND NOT coalesce(i.is_demo,false)
          AND coalesce(i.status,'draft') NOT IN ('draft','cancelled','canceled','void','paid')
          AND i.remaining_amount>0 GROUP BY 1
      ) x),'[]'::jsonb),
      'receipts',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.currency) FROM (
        SELECT coalesce(p.currency,'EGP') AS currency,sum(p.amount) AS amount
        FROM public.customer_payments p WHERE p.organization_id=_org AND p.status='completed'
          AND p.payment_date::date=day GROUP BY 1
      ) x),'[]'::jsonb),
      'pending_supplier_pos',(SELECT count(*) FROM public.supplier_payment_orders
        WHERE organization_id=_org AND status IN ('draft','pending','approved')),
      'refund_approvals',(SELECT count(*) FROM public.refund_requests WHERE organization_id=_org AND status='requested')
    ) END
  ));
END;
$$;

CREATE OR REPLACE FUNCTION operations_private.queue(_org uuid,_filter text,_page_size integer,_skip integer)
RETURNS TABLE(id uuid,title text,status text,waiting_on text,due_at timestamptz,completed_at timestamptz,priority text,
  booking_id uuid,booking_number text,customer_name text,customer_id uuid,kind text,can_act boolean,total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  scope text := operations_private.booking_scope(_org);
  actor uuid := auth.uid();
  day date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  start_at timestamptz := day::timestamp AT TIME ZONE 'Africa/Cairo';
  end_at timestamptz := (day+1)::timestamp AT TIME ZONE 'Africa/Cairo';
  may_edit boolean := coalesce(public.can_org_write(_org),false);
  company_edit boolean := EXISTS(SELECT FROM public._org_permission_state(_org,actor,'bookings_edit') s WHERE s.granted AND s.data_scope='organization');
BEGIN
  IF coalesce(_filter,'') NOT IN ('today','overdue','unscheduled','assigned_to_me','waiting_customer','waiting_supplier',
    'waiting_payment','completed_today','edit_requests') THEN RAISE EXCEPTION 'operations_invalid_filter' USING ERRCODE='22023'; END IF;
  RETURN QUERY
  WITH visible AS (
    SELECT t.id,t.title::text,t.status::text,t.waiting_on,t.due_at,
      CASE WHEN t.status IN ('done','completed') THEN coalesce(t.completed_at,t.updated_at) END AS completed_at,
      t.priority::text,t.booking_id,
      b.booking_number,b.customer_name,b.customer_id,'task'::text AS kind,
      (may_edit AND t.status NOT IN ('done','completed','cancelled','canceled') AND
        operations_private.can_manage_task(t,actor,company_edit)) AS can_act
    FROM public.booking_tasks t
    LEFT JOIN public.bookings b ON b.id=t.booking_id AND b.organization_id=t.organization_id
    WHERE t.organization_id=_org AND operations_private.task_visible(t,scope,actor)
      AND (t.booking_id IS NULL OR (b.id IS NOT NULL AND NOT b.is_demo AND coalesce(b.status,'') NOT IN ('cancelled','canceled')
        AND b.workflow_stage::text<>'cancelled'))
      AND CASE _filter
        WHEN 'completed_today' THEN t.status IN ('done','completed') AND coalesce(t.completed_at,t.updated_at)>=start_at
          AND coalesce(t.completed_at,t.updated_at)<end_at
        WHEN 'edit_requests' THEN false
        ELSE t.status NOT IN ('done','completed','cancelled','canceled') AND CASE _filter
          WHEN 'today' THEN t.due_at>=start_at AND t.due_at<end_at
          WHEN 'overdue' THEN t.due_at<now()
          WHEN 'unscheduled' THEN t.due_at IS NULL
          WHEN 'assigned_to_me' THEN t.assignee_id=actor
          ELSE t.waiting_on=replace(_filter,'waiting_','') END
      END
    UNION ALL
    SELECT r.id,'طلب فتح تعديل الحجز'::text,r.status,NULL::text,r.requested_at,NULL::timestamptz,'high'::text,
      b.id,b.booking_number,b.customer_name,b.customer_id,'edit_request'::text,false
    FROM pilgrimage_inventory_private.booking_edit_requests r JOIN public.bookings b ON b.id=r.booking_id
    WHERE _filter='edit_requests' AND b.organization_id=_org AND NOT b.is_demo
      AND b.status NOT IN ('cancelled','canceled') AND b.workflow_stage::text<>'cancelled' AND r.status='pending'
      AND (operations_private.edit_manager(_org) OR r.requested_by=actor)
  )
  SELECT v.*,count(*) OVER() FROM visible v
  ORDER BY
    CASE WHEN _filter='completed_today' THEN v.completed_at END DESC NULLS LAST,
    v.due_at ASC NULLS LAST,v.id
  LIMIT least(greatest(coalesce(_page_size,30),1),100) OFFSET greatest(coalesce(_skip,0),0);
END;
$$;

CREATE OR REPLACE FUNCTION operations_private.update_task(_org uuid,_task uuid,_action text,_waiting text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  scope text := operations_private.booking_scope(_org);
  task public.booking_tasks%ROWTYPE;
BEGIN
  SELECT * INTO task FROM public.booking_tasks WHERE id=_task AND organization_id=_org FOR UPDATE;
  IF NOT FOUND OR NOT operations_private.task_visible(task,scope,actor)
    OR NOT coalesce(public.can_org_write(_org),false)
    OR NOT operations_private.can_manage_task(task,actor,EXISTS (
      SELECT FROM public._org_permission_state(_org,actor,'bookings_edit') s
      WHERE s.granted AND s.data_scope='organization'))
    OR (task.booking_id IS NOT NULL AND NOT EXISTS(SELECT FROM public.bookings b
      WHERE b.id=task.booking_id AND b.organization_id=_org AND NOT b.is_demo
        AND coalesce(b.status,'') NOT IN ('cancelled','canceled') AND b.workflow_stage::text<>'cancelled'))
  THEN RAISE EXCEPTION 'operations_task_access_denied' USING ERRCODE='42501'; END IF;
  IF _action='complete' AND task.status IN ('done','completed') THEN RETURN task.id; END IF;
  IF task.status IN ('done','completed','cancelled','canceled') THEN
    RAISE EXCEPTION 'operations_task_closed' USING ERRCODE='22023';
  END IF;
  IF _action='complete' THEN
    UPDATE public.booking_tasks SET status='done',completed_at=clock_timestamp(),waiting_on=NULL,updated_at=clock_timestamp()
      WHERE id=task.id;
  ELSIF _action='waiting' AND (_waiting IS NULL OR _waiting IN ('customer','supplier','payment')) THEN
    IF task.waiting_on IS NOT DISTINCT FROM _waiting THEN RETURN task.id; END IF;
    UPDATE public.booking_tasks SET waiting_on=_waiting,updated_at=clock_timestamp() WHERE id=task.id;
  ELSE
    RAISE EXCEPTION 'operations_invalid_task_action' USING ERRCODE='22023';
  END IF;
  -- The booking tasks trigger writes the canonical task_completed timeline event.
  IF _action='waiting' AND task.booking_id IS NOT NULL THEN
    INSERT INTO public.booking_timeline_events(organization_id,booking_id,kind,actor_id,summary,payload)
    VALUES(_org,task.booking_id,'operations_task_waiting',actor,'تم تحديث حالة انتظار مهمة',
      jsonb_build_object('task_id',task.id,'waiting_on',_waiting));
  END IF;
  RETURN task.id;
END;
$$;
