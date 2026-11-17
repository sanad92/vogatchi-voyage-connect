ALTER TABLE public.booking_tasks ADD COLUMN waiting_on text
  CHECK (waiting_on IN ('customer','supplier','payment'));

CREATE INDEX IF NOT EXISTS ops_booking_tasks_org_due ON public.booking_tasks(organization_id,due_at)
  WHERE status NOT IN ('completed','cancelled','canceled');
CREATE INDEX IF NOT EXISTS ops_booking_tasks_org_completed ON public.booking_tasks(organization_id,completed_at,updated_at)
  WHERE status='completed';

CREATE SCHEMA IF NOT EXISTS operations_private;
REVOKE ALL ON SCHEMA operations_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA operations_private TO authenticated;

CREATE FUNCTION operations_private.booking_scope(_org uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE visibility text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT FROM public.organization_members
    WHERE organization_id=_org AND user_id=auth.uid() AND is_active) THEN
    RAISE EXCEPTION 'operations_company_access_denied' USING ERRCODE='42501';
  END IF;
  SELECT s.data_scope INTO visibility FROM public._org_permission_state(_org,auth.uid(),'bookings_view') s
    WHERE s.granted AND s.data_scope IN ('own','organization');
  IF visibility IS NULL THEN RAISE EXCEPTION 'operations_company_access_denied' USING ERRCODE='42501'; END IF;
  RETURN visibility;
END;
$$;

CREATE FUNCTION operations_private.owns_booking(_booking uuid,_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT EXISTS(SELECT FROM pilgrimage_inventory_private.booking_staff s
    WHERE s.booking_id=_booking AND s.operations_user_id=_actor)
$$;

CREATE FUNCTION operations_private.task_visible(t public.booking_tasks,_scope text,_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT _scope='organization' OR coalesce(t.assignee_id=_actor OR t.created_by=_actor,false)
    OR (t.booking_id IS NOT NULL AND operations_private.owns_booking(t.booking_id,_actor))
$$;

CREATE FUNCTION operations_private.edit_manager(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT pilgrimage_inventory_private.check_staff_access(_org,'bookings_edit',true)
$$;

CREATE FUNCTION operations_private.dashboard(_org uuid,_day date)
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
      AND t.status NOT IN ('completed','cancelled','canceled') AND t.due_at<greatest(end_at,now())
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

CREATE FUNCTION public.get_ops_command_center_for_org(_org uuid,_day date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT operations_private.dashboard(_org,_day) $$;

CREATE OR REPLACE FUNCTION public.get_ops_command_center(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE org uuid;
BEGIN
  SELECT (array_agg(organization_id))[1] INTO org FROM public.organization_members
    WHERE user_id=auth.uid() AND is_active HAVING count(*)=1;
  IF org IS NULL THEN RAISE EXCEPTION 'operations_select_company' USING ERRCODE='42501'; END IF;
  RETURN operations_private.dashboard(org,p_date);
END;
$$;

CREATE FUNCTION operations_private.queue(_org uuid,_filter text,_page_size integer,_skip integer)
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
  IF coalesce(_filter,'') NOT IN ('today','overdue','assigned_to_me','waiting_customer','waiting_supplier',
    'waiting_payment','completed_today','edit_requests') THEN RAISE EXCEPTION 'operations_invalid_filter' USING ERRCODE='22023'; END IF;
  RETURN QUERY
  WITH visible AS (
    SELECT t.id,t.title::text,t.status::text,t.waiting_on,t.due_at,t.completed_at,t.priority::text,t.booking_id,
      b.booking_number,b.customer_name,b.customer_id,'task'::text AS kind,
      (may_edit AND t.status NOT IN ('completed','cancelled','canceled') AND
        coalesce(company_edit OR t.created_by=actor OR t.assignee_id=actor,false)) AS can_act
    FROM public.booking_tasks t
    LEFT JOIN public.bookings b ON b.id=t.booking_id AND b.organization_id=t.organization_id
    WHERE t.organization_id=_org AND operations_private.task_visible(t,scope,actor)
      AND (t.booking_id IS NULL OR (b.id IS NOT NULL AND NOT b.is_demo AND coalesce(b.status,'') NOT IN ('cancelled','canceled')
        AND b.workflow_stage::text<>'cancelled'))
      AND CASE _filter
        WHEN 'completed_today' THEN t.status='completed' AND coalesce(t.completed_at,t.updated_at)>=start_at
          AND coalesce(t.completed_at,t.updated_at)<end_at
        WHEN 'edit_requests' THEN false
        ELSE t.status NOT IN ('completed','cancelled','canceled') AND CASE _filter
          WHEN 'today' THEN t.due_at>=start_at AND t.due_at<end_at
          WHEN 'overdue' THEN t.due_at<now()
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
CREATE FUNCTION public.list_operations_queue(_org uuid,_filter text,_page_size integer DEFAULT 30,_skip integer DEFAULT 0)
RETURNS TABLE(id uuid,title text,status text,waiting_on text,due_at timestamptz,completed_at timestamptz,priority text,
  booking_id uuid,booking_number text,customer_name text,customer_id uuid,kind text,can_act boolean,total_count bigint)
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT * FROM operations_private.queue(_org,_filter,_page_size,_skip) $$;

CREATE FUNCTION operations_private.update_task(_org uuid,_task uuid,_action text,_waiting text)
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
    OR NOT (task.assignee_id IS NOT DISTINCT FROM actor OR task.created_by IS NOT DISTINCT FROM actor
      OR EXISTS (SELECT FROM public._org_permission_state(_org,actor,'bookings_edit') s
        WHERE s.granted AND s.data_scope='organization'))
    OR (task.booking_id IS NOT NULL AND NOT EXISTS(SELECT FROM public.bookings b
      WHERE b.id=task.booking_id AND b.organization_id=_org AND NOT b.is_demo
        AND coalesce(b.status,'') NOT IN ('cancelled','canceled') AND b.workflow_stage::text<>'cancelled'))
  THEN RAISE EXCEPTION 'operations_task_access_denied' USING ERRCODE='42501'; END IF;
  IF _action='complete' AND task.status='completed' THEN RETURN task.id; END IF;
  IF task.status IN ('completed','cancelled','canceled') THEN
    RAISE EXCEPTION 'operations_task_closed' USING ERRCODE='22023';
  END IF;
  IF _action='complete' THEN
    UPDATE public.booking_tasks SET status='completed',completed_at=clock_timestamp(),waiting_on=NULL,updated_at=clock_timestamp()
      WHERE id=task.id;
  ELSIF _action='waiting' AND (_waiting IS NULL OR _waiting IN ('customer','supplier','payment')) THEN
    UPDATE public.booking_tasks SET waiting_on=_waiting,updated_at=clock_timestamp() WHERE id=task.id;
  ELSE
    RAISE EXCEPTION 'operations_invalid_task_action' USING ERRCODE='22023';
  END IF;
  IF task.booking_id IS NOT NULL THEN
    INSERT INTO public.booking_timeline_events(organization_id,booking_id,kind,actor_id,summary,payload)
    VALUES(_org,task.booking_id,CASE WHEN _action='complete' THEN 'operations_task_completed' ELSE 'operations_task_waiting' END,
      actor,CASE WHEN _action='complete' THEN 'تم إنجاز مهمة' ELSE 'تم تحديث حالة انتظار مهمة' END,
      jsonb_build_object('task_id',task.id,'waiting_on',_waiting));
  END IF;
  RETURN task.id;
END;
$$;
CREATE FUNCTION public.update_operations_task(_org uuid,_task uuid,_action text,_waiting text)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$ SELECT operations_private.update_task(_org,_task,_action,_waiting) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA operations_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_ops_command_center_for_org(uuid,date),public.list_operations_queue(uuid,text,integer,integer),
  public.update_operations_task(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION operations_private.dashboard(uuid,date),operations_private.queue(uuid,text,integer,integer),
  operations_private.update_task(uuid,uuid,text,text),public.get_ops_command_center_for_org(uuid,date),
  public.list_operations_queue(uuid,text,integer,integer),public.update_operations_task(uuid,uuid,text,text) TO authenticated;
