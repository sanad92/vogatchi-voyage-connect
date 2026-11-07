-- Safar Flow V1 SQL integration QA. RUN ONLY ON EPHEMERAL TEST POSTGRES.
-- Mocks only the minimum existing schema needed for the deployment script.
-- This is NOT a production migration and must never be run on live databases.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.organizations (id uuid PRIMARY KEY);
CREATE TABLE public.customers (id uuid PRIMARY KEY, organization_id uuid NOT NULL, phone text);
CREATE TABLE public.organization_settings (organization_id uuid PRIMARY KEY, quote_followup_days integer[]);
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY(organization_id,user_id)
);
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  customer_id uuid,
  customer_name text,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  created_by uuid
);
CREATE TABLE public.quote_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  quote_id uuid NOT NULL,
  customer_id uuid,
  phone text,
  owner_user_id uuid,
  step smallint NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  UNIQUE (quote_id,step)
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid NOT NULL,
  title text,
  message text,
  type text,
  priority text,
  action_url text,
  metadata jsonb
);

CREATE FUNCTION public._digits(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(coalesce(t,''),'\D','','g'),'')
$$;

\i scripts/deploy-safar-flow-followup-dispatch.sql

INSERT INTO public.organizations VALUES
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.organization_members VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000012');
INSERT INTO public.organization_settings VALUES
 ('00000000-0000-4000-8000-000000000001', ARRAY[1,3,7]),
 ('00000000-0000-4000-8000-000000000002', ARRAY[1,3,7]);
INSERT INTO public.customers VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','+201000000011'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','+201000000012');

-- A: ordinary draft -> sent lifecycle
INSERT INTO public.quotes VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','Test A','QT-A','draft',CURRENT_DATE + 30,
  '00000000-0000-4000-8000-000000000011');
UPDATE public.quotes SET status='sent' WHERE quote_number='QT-A';

-- B: initially sent quote (covers imported/auto-generated quote path)
INSERT INTO public.quotes VALUES
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000102','Test B','QT-B','sent',CURRENT_DATE + 30,
  '00000000-0000-4000-8000-000000000012');

-- C: sent but expired. Should never be notified.
INSERT INTO public.quotes VALUES
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','Expired','QT-C','sent',CURRENT_DATE - 1,
  '00000000-0000-4000-8000-000000000011');

-- D: owner is not a member. Must remain pending, not silently notified.
INSERT INTO public.quotes VALUES
 ('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','Orphan owner','QT-D','sent',CURRENT_DATE + 30,
  '00000000-0000-4000-8000-000000000099');

-- E: sent then accepted should be cancelled without notification.
INSERT INTO public.quotes VALUES
 ('00000000-0000-4000-8000-000000000205','00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101','Accepted','QT-E','sent',CURRENT_DATE + 30,
  '00000000-0000-4000-8000-000000000011');
UPDATE public.quotes SET status='accepted' WHERE quote_number='QT-E';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.quote_followups WHERE quote_id IN (
    '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000202'
  )) <> 6 THEN RAISE EXCEPTION 'Expected three scheduled followups for both A and B'; END IF;
  IF (SELECT count(*) FROM public.quote_followups
      WHERE quote_id='00000000-0000-4000-8000-000000000205' AND status='cancelled') <> 3
    THEN RAISE EXCEPTION 'Expected cancelled followups for accepted quote'; END IF;
END $$;

-- No new followups from no-op status update.
UPDATE public.quotes SET status='sent' WHERE quote_number='QT-A';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.quote_followups
      WHERE quote_id='00000000-0000-4000-8000-000000000201') <> 3
  THEN RAISE EXCEPTION 'Duplicate followups were scheduled'; END IF;
END $$;

-- Only first reminders are due; other steps are in future.
UPDATE public.quote_followups SET due_at=now()-interval '1 minute'
WHERE step=1 AND status='pending';

DO $$
DECLARE affected int;
BEGIN
  SELECT public.dispatch_quote_followups() INTO affected;
  IF affected <> 2 THEN RAISE EXCEPTION 'Expected 2 notifications, got %', affected; END IF;
  SELECT public.dispatch_quote_followups() INTO affected;
  IF affected <> 0 THEN RAISE EXCEPTION 'Duplicate dispatch created % notifications', affected; END IF;
  IF (SELECT count(*) FROM public.notifications) <> 2 THEN
    RAISE EXCEPTION 'Notification count mismatched'; END IF;
  IF (SELECT count(*) FROM public.notifications
      WHERE organization_id='00000000-0000-4000-8000-000000000001'
        AND user_id='00000000-0000-4000-8000-000000000011') <> 1
    OR (SELECT count(*) FROM public.notifications
      WHERE organization_id='00000000-0000-4000-8000-000000000002'
        AND user_id='00000000-0000-4000-8000-000000000012') <> 1
  THEN RAISE EXCEPTION 'Cross-organization notification mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM public.quote_followups WHERE quote_id IN (
       '00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000204'
     ) AND status='notified') THEN
    RAISE EXCEPTION 'Expired/unassigned followup was incorrectly notified'; END IF;
END $$;

-- Check completed quotes stop future reminders too.
UPDATE public.quotes SET status='cancelled' WHERE quote_number='QT-A';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.quote_followups
     WHERE quote_id='00000000-0000-4000-8000-000000000201' AND status='cancelled') <> 3
 THEN RAISE EXCEPTION 'Cancellation did not stop remaining reminders'; END IF;
END $$;

SELECT 'Safar Flow quote followup SQL integration checks passed' AS result;
