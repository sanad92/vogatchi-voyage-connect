-- Safar Flow V4 incident routing + tenant-scoped audit integration tests.
-- Run only on ephemeral PostgreSQL AFTER test-safar-flow-job-queue.sql AND
-- test-safar-flow-monitor.sql, never on a hosted customer database.
\set ON_ERROR_STOP on

-- Complete test fixtures for the real app's notification/member schema.
ALTER TABLE public.organization_members
  ADD COLUMN role text NOT NULL DEFAULT 'agent';
UPDATE public.organization_members
SET role='owner'
WHERE user_id IN (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012'
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

\i scripts/deploy-safar-flow-failure-alerts.sql

DO $$
BEGIN
  IF has_schema_privilege('authenticated','safar_flow','USAGE')
     OR has_function_privilege('authenticated',
       'safar_flow.dispatch_failure_alerts(integer,integer)','EXECUTE')
     OR has_function_privilege('anon',
       'public.get_safar_flow_alert_health(uuid,integer)','EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.get_safar_flow_alert_health(uuid,integer)','EXECUTE')
  THEN
    RAISE EXCEPTION 'V4 role grants are not secure';
  END IF;
END $$;

-- Isolated org 3 has no active owner/admin to receive incidents.
INSERT INTO public.bookings (id, organization_id, status, start_date) VALUES
  ('00000000-0000-4000-8000-000000000109',
   '00000000-0000-4000-8000-000000000003',
   'pending',CURRENT_DATE+2);
INSERT INTO public.domain_events (id,organization_id,aggregate_type,aggregate_id,event_type)
VALUES (
  '00000000-0000-4000-8000-000000000211',
  '00000000-0000-4000-8000-000000000003',
  'booking','00000000-0000-4000-8000-000000000109','booking.created'
);
INSERT INTO safar_flow.jobs
  (organization_id,source_event_id,booking_id,template_key,status,available_at)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000211',
  '00000000-0000-4000-8000-000000000109','supplier_confirmation','dead',now()-interval '1 hour'
);

UPDATE safar_flow.jobs
SET status='dead', attempts=3, last_error='SENSITIVE_SUPPLIER_SECRET'
WHERE organization_id='00000000-0000-4000-8000-000000000001'
  AND booking_id='00000000-0000-4000-8000-000000000101'
  AND template_key='supplier_confirmation';

UPDATE safar_flow.jobs
SET status='scheduled', available_at=now()-interval '45 minutes'
WHERE organization_id='00000000-0000-4000-8000-000000000002'
  AND booking_id='00000000-0000-4000-8000-000000000102'
  AND template_key='supplier_confirmation';

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.dispatch_failure_alerts(50,30);
  IF r->>'created'<>'2' OR r->>'unrouted'<>'1' OR r->>'failed'<>'0' THEN
    RAISE EXCEPTION 'Unexpected incident dispatch counts: %',r;
  END IF;
  IF (SELECT count(*) FROM safar_flow.job_alerts) <> 2
      OR (SELECT count(*) FROM public.notifications) <> 2 THEN
    RAISE EXCEPTION 'Missing deduplicated alert notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
     WHERE organization_id='00000000-0000-4000-8000-000000000001'
       AND user_id='00000000-0000-4000-8000-000000000011')
    OR NOT EXISTS (SELECT 1 FROM public.notifications
     WHERE organization_id='00000000-0000-4000-8000-000000000002'
       AND user_id='00000000-0000-4000-8000-000000000012')
  THEN RAISE EXCEPTION 'Cross-tenant notification recipient mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.notifications
      WHERE message ILIKE '%SENSITIVE_SUPPLIER_SECRET%'
         OR metadata::text ILIKE '%SENSITIVE_SUPPLIER_SECRET%')
  THEN RAISE EXCEPTION 'Sensitive error text escaped into notification'; END IF;

  r := safar_flow.dispatch_failure_alerts(50,30);
  IF r->>'created'<>'0' OR r->>'unrouted'<>'1'
    OR (SELECT count(*) FROM public.notifications)<>2
  THEN RAISE EXCEPTION 'Repeated dispatch emitted duplicate alerts: %',r; END IF;
END $$;

-- Already-dead job can have one separate overdue alert if it is later retried
-- and becomes overdue, but cannot emit the same kind twice.
UPDATE safar_flow.jobs
SET status='retrying', available_at=now()-interval '40 minutes'
WHERE booking_id='00000000-0000-4000-8000-000000000101'
  AND template_key='supplier_confirmation';

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.dispatch_failure_alerts(50,30);
  IF r->>'created'<>'1' OR r->>'unrouted'<>'1'
    OR (SELECT count(*) FROM safar_flow.job_alerts)<>3
  THEN RAISE EXCEPTION 'Alert-kind idempotency failed: %',r; END IF;
END $$;

-- Simulate downstream notification failure for B: marker must rollback.
UPDATE safar_flow.jobs
SET status='dead', attempts=3
WHERE booking_id='00000000-0000-4000-8000-000000000108'
  AND template_key='pretravel_checklist';

CREATE FUNCTION public.test_notification_insert_failure()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.metadata->>'job_id' = (
    SELECT j.id::text FROM safar_flow.jobs j
    WHERE j.booking_id='00000000-0000-4000-8000-000000000108'
      AND j.template_key='pretravel_checklist'
  ) THEN
    RAISE EXCEPTION 'simulated notification outage';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_notification_insert_failure
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.test_notification_insert_failure();

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.dispatch_failure_alerts(50,30);
  IF r->>'failed'<>'1' OR r->>'created'<>'0' THEN
    RAISE EXCEPTION 'Failed notification did not report rollback: %',r;
  END IF;
  IF EXISTS (
    SELECT 1 FROM safar_flow.job_alerts a
    JOIN safar_flow.jobs j ON j.id=a.job_id
    WHERE j.booking_id='00000000-0000-4000-8000-000000000108'
  ) THEN
    RAISE EXCEPTION 'Orphan alert marker persisted after notification failure';
  END IF;
END $$;

DROP TRIGGER test_notification_insert_failure ON public.notifications;
DROP FUNCTION public.test_notification_insert_failure();

DO $$
DECLARE r jsonb;
BEGIN
  r := safar_flow.dispatch_failure_alerts(50,30);
  IF r->>'created'<>'1' OR r->>'failed'<>'0' THEN
    RAISE EXCEPTION 'Notification recovery failed: %',r;
  END IF;
  IF (SELECT count(*) FROM public.notifications) <> 4
     OR (SELECT count(*) FROM safar_flow.job_alerts) <> 4 THEN
    RAISE EXCEPTION 'Notification and alert marker counts diverged';
  END IF;
END $$;

-- Read-only authenticated tenant access, active member and permission gates.
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

DO $$
DECLARE r jsonb;
BEGIN
  r := public.get_safar_flow_alert_health(
    '00000000-0000-4000-8000-000000000001',10);
  IF r->'counts'->>'total'<>'2'
     OR r->'counts'->>'dead'<>'1'
     OR r->'counts'->>'overdue'<>'1'
  THEN RAISE EXCEPTION 'Org A alert counts incorrect: %',r; END IF;
  IF r::text ILIKE '%SENSITIVE_SUPPLIER_SECRET%'
     OR r::text ILIKE '%last_error%'
     OR r::text ILIKE '%recipient_id%'
     OR r::text ILIKE '%notification_id%'
  THEN RAISE EXCEPTION 'Sensitive audit data leaked'; END IF;
END $$;

DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_alert_health(
      '00000000-0000-4000-8000-000000000002');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Cross-tenant alert read allowed'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE r jsonb;
BEGIN
  r := public.get_safar_flow_alert_health(
    '00000000-0000-4000-8000-000000000002',1);
  IF r->'counts'->>'total'<>'2'
     OR jsonb_array_length(r->'alerts')>1 THEN
    RAISE EXCEPTION 'Org B alert view/limit incorrect: %',r;
  END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_alert_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Automation permission missing but read allowed'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000014';
DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_alert_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Inactive membership read allowed'; END IF;
END $$;

RESET test.user_id;
DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    PERFORM public.get_safar_flow_alert_health(
      '00000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Unauthenticated alert read allowed'; END IF;
END $$;

RESET ROLE;
SELECT 'Safar Flow V4 failure alert integration checks passed' AS result;
