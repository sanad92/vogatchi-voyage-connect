-- Run after the starter automation migration. All fixtures roll back.
BEGIN;

INSERT INTO public.organizations(id,name,slug) VALUES
 ('f8d07312-0000-4000-8000-000000000001','Starter automation QA','starter-automation-qa'),
 ('f8d07312-0000-4000-8000-000000000002','Starter automation isolation QA','starter-automation-isolation-qa');

INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES
 ('f8d07312-0000-4000-8000-000000000003','starter-owner@example.invalid','{}',now()),
 ('f8d07312-0000-4000-8000-000000000004','starter-viewer@example.invalid','{}',now());

INSERT INTO public.organization_members(organization_id,user_id,role,is_active) VALUES
 ('f8d07312-0000-4000-8000-000000000001','f8d07312-0000-4000-8000-000000000003','owner',true),
 ('f8d07312-0000-4000-8000-000000000001','f8d07312-0000-4000-8000-000000000004','viewer',true);

SET LOCAL ROLE authenticated;
DO $test$
DECLARE
 org uuid := 'f8d07312-0000-4000-8000-000000000001';
 other_org uuid := 'f8d07312-0000-4000-8000-000000000002';
BEGIN
 PERFORM set_config('request.jwt.claim.sub','f8d07312-0000-4000-8000-000000000004',true);
 BEGIN
   PERFORM public.set_starter_automation(org,'payment_due',true);
   RAISE EXCEPTION 'Viewer enabled a rule';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 PERFORM set_config('request.jwt.claim.sub','f8d07312-0000-4000-8000-000000000003',true);
 BEGIN
   PERFORM public.set_starter_automation(other_org,'payment_due',true);
   RAISE EXCEPTION 'Owner modified rules for another organization';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 PERFORM public.set_starter_automation(org,'confirmed_booking',true);
 PERFORM public.set_starter_automation(org,'confirmed_booking',true);
 PERFORM public.set_starter_automation(org,'payment_due',true);
 PERFORM public.set_starter_automation(org,'pre_travel',true);

 IF (SELECT count(*) FROM public.starter_automation_settings) <> 3 THEN
   RAISE EXCEPTION 'Incorrect starter rule configuration';
 END IF;
END
$test$;
RESET ROLE;

DO $test$
DECLARE
 org uuid := 'f8d07312-0000-4000-8000-000000000001';
 other_org uuid := 'f8d07312-0000-4000-8000-000000000002';
 customer uuid := gen_random_uuid();
 other_customer uuid := gen_random_uuid();
 booking uuid := gen_random_uuid();
 disabled_booking uuid := gen_random_uuid();
 demo_booking uuid := gen_random_uuid();
 future_booking uuid := gen_random_uuid();
 invoice uuid := gen_random_uuid();
 future_invoice uuid := gen_random_uuid();
 manual_task uuid := gen_random_uuid();
 cairo_day date := (now() AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
 INSERT INTO public.customers(id,organization_id,name,email)
 VALUES (customer,org,'Starter automation QA customer','starter-qa-customer-a@example.invalid'),
        (other_customer,other_org,'Starter isolation QA customer','starter-qa-customer-b@example.invalid');

 INSERT INTO public.bookings(id,organization_id,customer_id,booking_number,booking_type,currency,status,workflow_stage,start_date,is_demo,selling_price)
 VALUES (booking,org,customer,'STARTER-BOOKING','hotel','EGP','pending','lead',cairo_day+2,false,100),
        (disabled_booking,other_org,other_customer,'STARTER-OFF','hotel','EGP','confirmed','confirmed',cairo_day+2,false,100),
        (demo_booking,org,customer,'STARTER-DEMO','hotel','EGP','confirmed','confirmed',cairo_day+2,true,100),
        (future_booking,org,customer,'STARTER-FUTURE','hotel','EGP','pending','lead',cairo_day+5,false,100);
 UPDATE public.bookings SET status='confirmed',workflow_stage='confirmed' WHERE id=booking;
 UPDATE public.bookings SET status='confirmed',workflow_stage='confirmed' WHERE id=booking;

 INSERT INTO public.invoices(id,organization_id,booking_id,customer_id,invoice_number,subtotal,vat_rate,status,currency,due_date)
 VALUES (invoice,org,booking,customer,'STARTER-QA-DUE',100,0,'unpaid','EGP',cairo_day),
        (future_invoice,org,future_booking,customer,'STARTER-QA-FUTURE',100,0,'unpaid','EGP',cairo_day+1);
 INSERT INTO public.booking_tasks(id,organization_id,booking_id,title)
 VALUES (manual_task,org,booking,'Manual control task');

 PERFORM operations_private.dispatch_starter_booking_tasks();
 PERFORM operations_private.dispatch_starter_booking_tasks();

 IF (SELECT count(*) FROM public.booking_tasks WHERE booking_id=booking AND source='automation') <> 3
   OR (SELECT count(*) FROM public.automation_logs WHERE booking_id=booking AND action_type='create_operations_task') <> 3
   OR EXISTS (SELECT FROM public.booking_tasks WHERE booking_id IN (disabled_booking,demo_booking) AND source='automation')
   OR EXISTS (SELECT FROM operations_private.starter_automation_tasks WHERE entity_id=future_invoice)
 THEN RAISE EXCEPTION 'Wrong task count, schedule, demo exclusion or tenant isolation'; END IF;

 UPDATE public.bookings SET start_date=cairo_day+5 WHERE id=booking;
 PERFORM operations_private.dispatch_starter_booking_tasks();
 IF NOT EXISTS (
   SELECT FROM public.booking_tasks t JOIN operations_private.starter_automation_tasks a ON a.task_id=t.id
   WHERE a.organization_id=org AND a.rule_key='pre_travel'
     AND t.due_at = ((cairo_day+4)+time '12:00') AT TIME ZONE 'Africa/Cairo'
 ) THEN RAISE EXCEPTION 'Pre-travel task did not follow the new departure date'; END IF;

 UPDATE public.invoices SET status='paid',total_paid_amount=100 WHERE id=invoice;
 PERFORM operations_private.dispatch_starter_booking_tasks();
 IF NOT EXISTS (
   SELECT FROM public.booking_tasks t JOIN operations_private.starter_automation_tasks a ON a.task_id=t.id
   WHERE a.entity_id=invoice AND a.rule_key='payment_due' AND t.status='cancelled'
 ) THEN RAISE EXCEPTION 'Payment task remained open after settlement'; END IF;

 PERFORM public.settle_booking_cancellation_workflow(booking,'Starter automation QA cancellation','{}','{}',
   public.get_booking_cancellation_workflow(booking));
 PERFORM operations_private.dispatch_starter_booking_tasks();
 IF EXISTS (SELECT FROM public.booking_tasks WHERE booking_id=booking AND source='automation' AND status<>'cancelled')
    OR NOT EXISTS (SELECT FROM public.booking_tasks WHERE id=manual_task AND status='open')
 THEN RAISE EXCEPTION 'Cancellation did not preserve the manual task'; END IF;

 PERFORM public.set_starter_automation(org,'confirmed_booking',false);
 UPDATE public.bookings SET status='confirmed',workflow_stage='confirmed' WHERE id=future_booking;
 IF EXISTS (SELECT FROM public.booking_tasks WHERE booking_id=future_booking AND source='automation') THEN
   RAISE EXCEPTION 'Disabled rule created a new task';
 END IF;
END
$test$;

SELECT 'Starter automation settings, tasks and retry behavior passed' AS result;
ROLLBACK;
