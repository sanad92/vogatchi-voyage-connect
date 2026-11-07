-- Safar Flow V5 SOP approval hardening integration suite.
-- EPHEMERAL PostgreSQL database ONLY. Does not test production RLS/JWT.
\set ON_ERROR_STOP on
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT NULLIF(pg_catalog.current_setting('test.user_id',true),'')::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TYPE public.sop_approval_type AS ENUM (
 'discount','free_service','booking_confirmation','supplier_payment','refund_compensation'
);
CREATE TYPE public.sop_approval_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.organization_members (
 organization_id uuid NOT NULL, user_id uuid NOT NULL,
 role text NOT NULL, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.sop_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 approval_type public.sop_approval_type NOT NULL,
 status public.sop_approval_status NOT NULL DEFAULT 'pending',
 lead_id uuid,
 booking_id uuid,
 amount numeric,
 reason text,
 requested_by uuid,
 decided_by uuid,
 decided_at timestamptz,
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sop_approvals TO authenticated;

CREATE FUNCTION public.sop_is_manager(p_org uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.organization_members m
   WHERE m.organization_id=p_org AND m.user_id=p_user
     AND m.is_active AND m.role IN ('owner','admin','manager')
 )
$$;

CREATE TABLE public.test_emitted_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_type text NOT NULL,
 aggregate_type text NOT NULL,
 aggregate_id uuid NOT NULL,
 organization_id uuid NOT NULL,
 payload jsonb NOT NULL
);
CREATE FUNCTION public.emit_event(
 p_type text,p_aggregate text,p_id uuid,p_org uuid,p_payload jsonb,p_dedupe text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 INSERT INTO public.test_emitted_events(event_type,aggregate_type,aggregate_id,organization_id,payload)
 VALUES(p_type,p_aggregate,p_id,p_org,p_payload) RETURNING id INTO v_id;
 RETURN v_id;
END;
$$;

\i scripts/deploy-safar-flow-sop-approval-guard.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.sop_approvals','INSERT')
   OR has_table_privilege('authenticated','public.sop_approvals','UPDATE')
   OR NOT has_table_privilege('authenticated','public.sop_approvals','SELECT')
   OR has_function_privilege('anon','public.sop_decide_approval(uuid,boolean,text)','EXECUTE')
   OR NOT has_function_privilege('authenticated','public.sop_decide_approval(uuid,boolean,text)','EXECUTE')
 THEN RAISE EXCEPTION 'SOP approval function or direct table privileges unsafe'; END IF;
END $$;

INSERT INTO public.organization_members VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','owner',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','agent',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013','manager',true),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000021','owner',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000014','admin',false);
INSERT INTO public.sop_approvals(id,organization_id,approval_type,requested_by) VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','discount','00000000-0000-4000-8000-000000000012'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','booking_confirmation','00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','free_service','00000000-0000-4000-8000-000000000012'),
 ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000002','supplier_payment','00000000-0000-4000-8000-000000000021'),
 ('00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000001','refund_compensation','00000000-0000-4000-8000-000000000012'),
 ('00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000001','discount','00000000-0000-4000-8000-000000000012');

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000012';

-- Ordinary agent cannot decide an approval even if it belongs to the same org.
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000101',true);
  IF r->>'allowed'<>'false' OR NOT r->'violations' ? 'management_only'
  THEN RAISE EXCEPTION 'An ordinary agent approved a request'; END IF;
END $$;

-- Table writes must be rejected even for a logged-in member.
DO $$
DECLARE blocked boolean:=false;
BEGIN
  BEGIN
    UPDATE public.sop_approvals SET status='approved'
    WHERE id='00000000-0000-4000-8000-000000000101';
  EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Direct approval status update allowed'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Owner cannot approve their own request.
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000102',true);
  IF r->>'allowed'<>'false' OR NOT r->'violations' ? 'self_approval_forbidden'
  THEN RAISE EXCEPTION 'Self approval was allowed'; END IF;
END $$;

-- Wrong-company approval access denied.
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000104',true);
  IF r->>'allowed'<>'false' OR NOT r->'violations' ? 'management_only'
  THEN RAISE EXCEPTION 'Cross-company approval allowed'; END IF;
END $$;

-- Reject requires a meaningful explanation; no decision event on failure.
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000103',false,'  ');
  IF r->>'allowed'<>'false' OR NOT r->'violations' ? 'rejection_note_required'
  THEN RAISE EXCEPTION 'Blank rejection note accepted'; END IF;
END $$;

-- Normal successful decision; repeated requests must be refused.
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000101',true,'تمت المراجعة');
  IF r->>'allowed'<>'true' OR r->>'status'<>'approved'
  THEN RAISE EXCEPTION 'Legitimate approval failed: %',r; END IF;
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000101',false,'أغير رأيي');
  IF r->>'allowed'<>'false' OR NOT r->'violations' ? 'approval_already_decided'
  THEN RAISE EXCEPTION 'Already decided approval was overwritten: %',r; END IF;
END $$;

DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000103',false,'تكلفة غير معتمدة');
  IF r->>'allowed'<>'true' OR r->>'status'<>'rejected'
  THEN RAISE EXCEPTION 'Legitimate rejection failed: %',r; END IF;
END $$;

-- Inactive administrator cannot approve.
SET test.user_id='00000000-0000-4000-8000-000000000014';
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000105',true);
  IF r->>'allowed'<>'false' THEN RAISE EXCEPTION 'Inactive admin approved'; END IF;
END $$;

-- Another manager from same company can decide another manager's request.
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE r jsonb;
BEGIN
  r:=public.sop_decide_approval('00000000-0000-4000-8000-000000000102',true);
  IF r->>'allowed'<>'true' THEN RAISE EXCEPTION 'Other manager approval failed'; END IF;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.test_emitted_events)<>3
     OR (SELECT count(*) FROM public.sop_approvals WHERE status='approved')<>2
     OR (SELECT count(*) FROM public.sop_approvals WHERE status='rejected')<>1
     OR EXISTS (SELECT 1 FROM public.test_emitted_events
      WHERE organization_id='00000000-0000-4000-8000-000000000002')
  THEN RAISE EXCEPTION 'Unexpected approval status or emitted event count'; END IF;
  IF EXISTS (SELECT 1 FROM public.test_emitted_events e
    WHERE e.event_type <> 'sop.approval.decided'
       OR (e.payload ? 'decision_note')
       OR (e.payload ? 'amount')
  ) THEN RAISE EXCEPTION 'Approval event leaked notes or financial amounts'; END IF;
END $$;

SELECT 'Safar Flow V5 SOP approval security checks passed' AS result;
