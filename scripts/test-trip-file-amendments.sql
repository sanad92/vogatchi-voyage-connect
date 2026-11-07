-- Isolated PostgreSQL 16 integration suite for Trip File amendment proposals.
-- NEVER run on production. This test creates simplified fixtures in a fresh DB.
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

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (organization_id,user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_membership_read ON public.organization_members FOR SELECT TO authenticated
  USING(user_id=auth.uid());

CREATE FUNCTION public.has_org_permission(p_org uuid,p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND m.is_active IS TRUE
      AND (p_permission IN ('bookings_view','bookings_edit')
        OR (p_permission='bookings_confirm' AND m.role IN ('owner','admin','manager')))
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_org_permission(uuid,text) TO authenticated;

CREATE TABLE public.bookings (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 workflow_stage text NOT NULL DEFAULT 'confirmed'
);
CREATE TABLE public.booking_timeline_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 booking_id uuid NOT NULL REFERENCES public.bookings(id),
 kind text NOT NULL,
 actor_id uuid,
 summary text,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

\i scripts/deploy-trip-file-amendments.sql
-- Fixture-only lookup to test a user who knows another company's UUID.
CREATE FUNCTION public.test_lookup_change_id(p_request_key uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=''
AS $lookup$ SELECT id FROM public.booking_change_requests WHERE request_key=p_request_key $lookup$;
GRANT EXECUTE ON FUNCTION public.test_lookup_change_id(uuid) TO authenticated;


INSERT INTO public.organization_members VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','agent',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','manager',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013','owner',true),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000021','manager',true),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000014','admin',false);

INSERT INTO public.bookings VALUES
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','pending','confirmed'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','pending','confirmed'),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000001','cancelled','cancelled');

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.booking_change_requests','INSERT')
 OR has_table_privilege('authenticated','public.booking_change_requests','UPDATE')
 OR has_table_privilege('authenticated','public.booking_change_requests','DELETE')
 OR NOT has_table_privilege('authenticated','public.booking_change_requests','SELECT')
 OR has_function_privilege('anon','public.create_booking_change_request(uuid,uuid,text,text,text,text,numeric,numeric,text)','EXECUTE')
 OR has_function_privilege('anon','public.decide_booking_change_request(uuid,boolean,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Amendment grants are not secure'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Submit a hotel change proposal with signed deltas in a single currency.
DO $$
DECLARE result jsonb; retry jsonb;
BEGIN
 result:=public.create_booking_change_request(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'room','يرجى تعديل الغرفة من دبل إلى تريبل مع انتظار تأكيد المورد',
  'hotel','HOTEL-REF-123',200.00,120.00,'usd'
 );
 IF result->>'status'<>'pending' OR result->>'replayed'<>'false' THEN
  RAISE EXCEPTION 'New amendment submission failed %',result; END IF;

 retry:=public.create_booking_change_request(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'room','يرجى تعديل الغرفة من دبل إلى تريبل مع انتظار تأكيد المورد',
  'hotel','HOTEL-REF-123',200.00,120.00,'usd'
 );
 IF retry->>'replayed'<>'true' OR retry->>'id'<>result->>'id'
 THEN RAISE EXCEPTION 'Idempotent submission was not preserved'; END IF;
END $$;

-- Network retry key with different payload must never overwrite or return old proposal.
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.create_booking_change_request(
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201',
   'room','تعديل مختلف تمامًا لا يجب قبوله بنفس مفتاح الطلب',
   'hotel','HOTEL-REF-123',200.00,120.00,'USD');
 EXCEPTION WHEN unique_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Conflicting idempotency payload accepted'; END IF;
END $$;

-- Cross-tenant and cancelled bookings cannot be amended.
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.create_booking_change_request(
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000202',
   'dates','تعديل موعد السفر المقترح لحجز لا يتبع الشركة الحالية');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Wrong-tenant creation succeeded'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.create_booking_change_request(
   '00000000-0000-4000-8000-000000000103',
   '00000000-0000-4000-8000-000000000203',
   'dates','طلب تعديل على رحلة ملغاة لا يجب قبوله');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cancelled booking was amended'; END IF;
END $$;

-- Direct client mutation must be denied regardless of RLS.
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.booking_change_requests SET status='approved';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Direct status forgery succeeded'; END IF;
END $$;

-- RLS: member A cannot view org B requests.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.booking_change_requests)<>1 THEN
  RAISE EXCEPTION 'Agent cannot see own amendment'; END IF;
END $$;

-- An agent has no review authority.
DO $$
DECLARE id uuid; denied boolean:=false;
BEGIN
 id:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.decide_booking_change_request(id,true);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Agent approved amendment'; END IF;
END $$;

-- B manager knows A's request UUID, but still cannot review or even list it.
SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE id uuid; denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.booking_change_requests)<>0 THEN
   RAISE EXCEPTION 'Cross-organization RLS leak'; END IF;
 id:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 IF id IS NULL THEN RAISE EXCEPTION 'Fixture lookup missing request ID'; END IF;
 BEGIN PERFORM public.decide_booking_change_request(id,true);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Manager from org B reviewed org A request'; END IF;
END $$;

-- Owner's own request cannot be self-reviewed; a distinct manager can review.
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE result jsonb; denied boolean:=false;
BEGIN
 result:=public.create_booking_change_request(
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000204',
   'cancellation','يريد العميل إلغاء الفندق مع مراعاة رسوم المورد');
 IF result->>'status'<>'pending' THEN RAISE EXCEPTION 'Owner submission failed'; END IF;
 BEGIN
  PERFORM public.decide_booking_change_request((result->>'id')::uuid,true);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Self-approval was allowed'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE id uuid; result jsonb; retry jsonb; denied boolean:=false;
BEGIN
 SELECT a.id INTO id FROM public.booking_change_requests a
 WHERE a.request_key='00000000-0000-4000-8000-000000000201';
 BEGIN
  PERFORM public.decide_booking_change_request(id,false,'  ');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Blank rejection reason accepted'; END IF;

 result:=public.decide_booking_change_request(id,true,'المراجعة الإدارية فقط');
 IF result->>'status'<>'approved' OR result->>'already_decided'<>'false' THEN
  RAISE EXCEPTION 'Manager approval failed %',result; END IF;
 retry:=public.decide_booking_change_request(id,false,'غيرت القرار');
 IF retry->>'already_decided'<>'true' OR retry->>'status'<>'approved' THEN
  RAISE EXCEPTION 'A decided request was overwritten %',retry; END IF;

 SELECT a.id INTO id FROM public.booking_change_requests a
 WHERE a.request_key='00000000-0000-4000-8000-000000000204';
 result:=public.decide_booking_change_request(id,false,'رسوم الإلغاء مرتفعة');
 IF result->>'status'<>'rejected' THEN RAISE EXCEPTION 'Rejection failed %',result; END IF;
END $$;

RESET ROLE;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.booking_change_requests)<>2
 OR (SELECT count(*) FROM public.booking_change_requests WHERE status='approved')<>1
 OR (SELECT count(*) FROM public.booking_change_requests WHERE status='rejected')<>1
 OR (SELECT count(*) FROM public.booking_timeline_events WHERE kind='amendment_requested')<>2
 OR (SELECT count(*) FROM public.booking_timeline_events WHERE kind='amendment_reviewed')<>2
 THEN RAISE EXCEPTION 'Unexpected amendment history or duplicate events'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.booking_change_requests
  WHERE estimate_currency='USD' AND proposed_selling_delta=200.00
    AND proposed_cost_delta=120.00
 ) THEN RAISE EXCEPTION 'Quote delta reference values were not preserved'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.booking_timeline_events
  WHERE payload ? 'cost_delta' OR payload ? 'description' OR payload ? 'selling_delta'
 ) THEN RAISE EXCEPTION 'Sensitive pricing data leaked to timeline events'; END IF;
END $$;

SELECT 'Trip File amendment request and review tests passed' AS result;
