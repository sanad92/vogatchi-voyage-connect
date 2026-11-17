-- Run after the automation library and notification migrations. All fixtures roll back.
BEGIN;
SET LOCAL lock_timeout = '3s';

INSERT INTO public.organizations(id,name,slug) VALUES
 ('2a961420-0000-4000-8000-000000000001','Notification QA','notification-delivery-qa'),
 ('2a961420-0000-4000-8000-000000000002','Notification isolation QA','notification-isolation-qa');
INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
SELECT ('2a961420-0000-4000-8000-00000000000'||i)::uuid, 'notification-qa-'||i||'@example.invalid','{}',now()
FROM generate_series(3,6) i;
INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES
 ('2a961420-0000-4000-8000-000000000001','2a961420-0000-4000-8000-000000000003','owner',true),
 ('2a961420-0000-4000-8000-000000000001','2a961420-0000-4000-8000-000000000004','agent',true),
 ('2a961420-0000-4000-8000-000000000001','2a961420-0000-4000-8000-000000000005','viewer',true),
 ('2a961420-0000-4000-8000-000000000002','2a961420-0000-4000-8000-000000000006','owner',true);

DO $qa$
DECLARE
 org uuid := '2a961420-0000-4000-8000-000000000001';
 agent uuid := '2a961420-0000-4000-8000-000000000004';
 manager uuid := '2a961420-0000-4000-8000-000000000003';
 customer uuid := gen_random_uuid();
 booking_id uuid := '2a961420-0000-4000-8000-000000000010';
 request_id uuid := '2a961420-0000-4000-8000-000000000011';
 task_id uuid;
 followup_id uuid;
 quote_ref uuid := gen_random_uuid();
 event public.domain_events;
 b public.bookings;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',agent::text,true);
 INSERT INTO public.customers(id,organization_id,name,email)
 VALUES (customer,org,'Notification QA customer','notification-qa-customer@example.invalid');
 INSERT INTO public.bookings(id,organization_id,customer_id,booking_number,booking_type,currency,status,workflow_stage,start_date)
 VALUES (booking_id,org,customer,'NOTIFY-QA','hotel','EGP','confirmed','confirmed',current_date+2) RETURNING * INTO b;

 event.id := gen_random_uuid();
 event.organization_id := org;
 event.event_type := 'booking.created';
 event.aggregate_type := 'booking';
 event.aggregate_id := booking_id;
 event.payload := '{"description":"QA private payload"}';
 PERFORM public.handler_notify_in_app(event);
 PERFORM public.handler_notification_dispatch(event);
 PERFORM public.handler_notify_in_app(event);
 IF (SELECT count(*) FROM public.notifications n WHERE n.user_id=agent AND n.metadata->>'delivery_key'='event:'||event.id
   AND n.organization_id=org AND NOT n.is_read AND NOT (n.metadata ? 'description')) <> 1
 THEN RAISE EXCEPTION 'Booking event was not delivered exactly once to the responsible employee'; END IF;

 INSERT INTO public.notification_rules(organization_id,event_type,channels,is_active)
 VALUES (org,'booking.completed',ARRAY['email','whatsapp'],true);
 event.id := gen_random_uuid();
 event.event_type := 'booking.completed';
 event.payload := jsonb_build_object('customer_email','notification-qa-customer@example.invalid');
 PERFORM public.handler_notification_dispatch(event);
 PERFORM public.handler_notification_dispatch(event);
 IF EXISTS (SELECT FROM public.notifications n WHERE n.metadata->>'delivery_key'='event:'||event.id)
   OR (SELECT count(*) FROM public.email_queue e WHERE e.organization_id=org AND e.template_data->>'source_event_id'=event.id::text) <> 1
   OR (SELECT count(*) FROM public.messaging_suggestions m WHERE m.organization_id=org
     AND m.booking_id=b.id AND m.template_key='booking.completed' AND m.status='suggested') <> 1
 THEN RAISE EXCEPTION 'Channel settings did not isolate the inbox, single email queue item and WhatsApp suggestion'; END IF;

 event.id := gen_random_uuid();
 event.event_type := 'customer.payment.recorded';
 event.aggregate_type := 'customer_payment';
 event.aggregate_id := gen_random_uuid();
 event.payload := jsonb_build_object('booking_id',booking_id,'amount',250);
 PERFORM public.handler_notify_in_app(event);
 IF (SELECT count(*) FROM public.notifications n WHERE n.user_id=manager AND n.metadata->>'delivery_key'='event:'||event.id
   AND n.action_url='/bookings/'||booking_id||'?tab=financials' AND NOT (n.metadata ? 'amount')) <> 1
 THEN RAISE EXCEPTION 'Financial event leaked its payload or missed the authorized manager'; END IF;

 PERFORM operations_private.create_starter_task(b,'pre_travel',b.id,'QA trip task','',now()+interval '1 day','high');
 PERFORM operations_private.create_starter_task(b,'pre_travel',b.id,'QA trip task','',now()+interval '1 day','high');
 SELECT t.id INTO STRICT task_id FROM public.booking_tasks t
 WHERE t.booking_id=b.id AND t.title='QA trip task' AND t.assignee_id=agent;
 IF (SELECT count(*) FROM public.notifications n WHERE n.user_id=agent AND n.metadata->>'delivery_key'='task:'||task_id
   AND n.action_url='/bookings/'||b.id||'?tab=tasks&task='||task_id) <> 1
 THEN RAISE EXCEPTION 'Automation task notification is missing, duplicated, or has the wrong URL'; END IF;

 INSERT INTO pilgrimage_inventory_private.booking_edit_requests(id,booking_id,requested_by,reason)
 VALUES (request_id,b.id,agent,'QA notification for an edit request');
 UPDATE pilgrimage_inventory_private.booking_edit_requests SET status='approved',decided_by=manager,
   decided_at=now(),expires_at=now()+interval '1 hour' WHERE id=request_id;
 IF NOT EXISTS (SELECT FROM public.notifications WHERE user_id=manager AND metadata->>'delivery_key'='edit:'||request_id||':pending')
   OR NOT EXISTS (SELECT FROM public.notifications WHERE user_id=agent AND metadata->>'delivery_key'='edit:'||request_id||':approved')
 THEN RAISE EXCEPTION 'Edit-request routing failed'; END IF;

 PERFORM set_config('request.jwt.claim.sub',manager::text,true);
 INSERT INTO public.quotes(id,organization_id,customer_id,quote_number,created_by,status,subtotal,total_amount)
 VALUES (quote_ref,org,customer,'NOTIFY-QUOTE',manager,'draft',100,100);
 PERFORM public.approve_quote_review(quote_ref,'{"availability":true,"cost":true,"currency":true,"total":true}');
 UPDATE public.quotes SET status='sent' WHERE id=quote_ref;
 UPDATE public.quote_followups SET due_at=now()-interval '1 minute',owner_user_id=NULL
 WHERE organization_id=org AND quote_id=quote_ref AND step=1 RETURNING id INTO followup_id;
 PERFORM public.dispatch_quote_followups();
 PERFORM public.dispatch_quote_followups();
 IF (SELECT count(*) FROM public.notifications WHERE user_id=manager
   AND metadata->>'delivery_key'='quote_followup:'||followup_id AND action_url='/quotes/'||quote_ref) <> 1
   OR NOT EXISTS (SELECT FROM public.quote_followups WHERE id=followup_id AND status='notified')
 THEN RAISE EXCEPTION 'Ownerless quote reminder was lost or duplicated'; END IF;
END
$qa$;

SET LOCAL ROLE authenticated;
DO $qa$
DECLARE
 org uuid := '2a961420-0000-4000-8000-000000000001';
 agent uuid := '2a961420-0000-4000-8000-000000000004';
 notice uuid;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','2a961420-0000-4000-8000-000000000005',true);
 IF EXISTS (SELECT FROM public.notifications WHERE organization_id=org AND user_id=agent)
 THEN RAISE EXCEPTION 'Coworker can read the agent inbox'; END IF;
 UPDATE public.notifications SET is_read=true WHERE organization_id=org AND user_id=agent;
 IF FOUND THEN RAISE EXCEPTION 'Coworker can mark the agent inbox read'; END IF;

 PERFORM set_config('request.jwt.claim.sub','2a961420-0000-4000-8000-000000000006',true);
 IF EXISTS (SELECT FROM public.notifications WHERE organization_id=org)
 THEN RAISE EXCEPTION 'Another company can see the notifications'; END IF;

 PERFORM set_config('request.jwt.claim.sub',agent::text,true);
 IF EXISTS (SELECT FROM public._org_permission_state(org,'2a961420-0000-4000-8000-000000000003','financial_view') p WHERE p.granted)
   OR has_function_privilege('authenticated','operations_private.org_permission_state(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'The public permission lookup exposes other users'; END IF;
 SELECT id INTO STRICT notice FROM public.notifications
 WHERE organization_id=org AND user_id=agent AND metadata->>'delivery_key' LIKE 'task:%';
 UPDATE public.notifications SET is_read=true WHERE organization_id=org AND user_id=agent AND id=notice;
 IF NOT EXISTS (SELECT FROM public.notifications WHERE id=notice AND is_read)
 THEN RAISE EXCEPTION 'Recipient could not mark the notification as read'; END IF;
 BEGIN
   UPDATE public.notifications SET title='QA forged edit' WHERE id=notice;
   RAISE EXCEPTION 'Recipients can overwrite message details';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END
$qa$;
RESET ROLE;

SELECT 'Notifications: booking, finance, automation task, approvals, quote reminders, privacy and read status passed' AS result;
ROLLBACK;
