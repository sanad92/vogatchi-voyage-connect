-- Sprint 4: supervised supplier/finance/operations handoff security test.
-- EPHEMERAL PostgreSQL ONLY. It runs Sprint 1 fixtures first.
\set ON_ERROR_STOP on
\i scripts/test-trip-file-amendments.sql
\i scripts/deploy-trip-file-supervised-handoff.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.booking_change_handoffs','INSERT')
 OR has_table_privilege('authenticated','public.booking_change_handoffs','UPDATE')
 OR has_table_privilege('authenticated','public.booking_change_handoffs','DELETE')
 OR has_table_privilege('authenticated','public.booking_change_handoff_events','INSERT')
 OR NOT has_table_privilege('authenticated','public.booking_change_handoffs','SELECT')
 OR has_function_privilege('anon','public.record_booking_change_handoff(uuid,text,text,text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.record_booking_change_handoff(uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Handoff privilege boundary broken'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Agent cannot read cost-sensitive handoff details or confirm a supplier.
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN
   PERFORM public.record_booking_change_handoff(req,'supplier_confirm','SUP-12345');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Employee without finance_view recorded supplier proof'; END IF;
 IF (SELECT count(*) FROM public.booking_change_handoffs) <> 0 THEN
   RAISE EXCEPTION 'Agent read handoff finance-only table'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000013';

-- No bypassing first step; supplier reference must be meaningful.
DO $$
DECLARE req uuid; denied boolean:=false; result jsonb; retry jsonb;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.record_booking_change_handoff(req,'report_execution','SOURCE-BOOKING-ABC','الحجز اتراجع');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Supplier/finance steps bypassed'; END IF;

 denied:=false;
 BEGIN PERFORM public.record_booking_change_handoff(req,'supplier_confirm','x');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Invalid supplier evidence ref accepted'; END IF;

 result:=public.record_booking_change_handoff(
    req,'supplier_confirm','HOTEL-SUP-123','تمت مراجعة تأكيد المورد يدويًا');
 IF result->>'status'<>'supplier_confirmed' OR result->>'replayed'<>'false' THEN
   RAISE EXCEPTION 'Supplier confirmation failed: %',result; END IF;
 retry:=public.record_booking_change_handoff(req,'supplier_confirm','HOTEL-SUP-123');
 IF retry->>'replayed'<>'true' OR retry->>'status'<>'supplier_confirmed' THEN
   RAISE EXCEPTION 'Supplier replay was not idempotent: %',retry; END IF;
 denied:=false;
 BEGIN PERFORM public.record_booking_change_handoff(req,'supplier_confirm','DIFFERENT-REF');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Supplier evidence was overwritten'; END IF;
END $$;

-- The same person cannot attest supplier confirmation AND finance review.
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.record_booking_change_handoff(req,'finance_verify','FIN-DOC-001');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Same operator certified supplier and finance'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.booking_change_handoffs)<>0
   OR (SELECT count(*) FROM public.booking_change_handoff_events)<>0
 THEN RAISE EXCEPTION 'Other company sees private handoff proof'; END IF;
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.record_booking_change_handoff(req,'finance_verify','FIN-DOC-001');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-company handoff certification allowed'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE req uuid; result jsonb;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 result:=public.record_booking_change_handoff(
   req,'finance_verify','FIN-DOC-001','مراجعة مستند التسوية مع الحسابات');
 IF result->>'status'<>'finance_reviewed' THEN
   RAISE EXCEPTION 'Independent finance review failed: %',result; END IF;
END $$;

-- Finance reviewer cannot also certify execution.
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN
   PERFORM public.record_booking_change_handoff(
     req,'report_execution','HOTEL-SOURCE-666','تم إجراء التعديل في نظام المورد');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Finance reviewer self-certified execution'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE req uuid; result jsonb; replay jsonb; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 result:=public.record_booking_change_handoff(
   req,'report_execution','HOTEL-SOURCE-666','الموظف أقر بإكمال الإجراء ومراجعة المرجع');
 IF result->>'status'<>'execution_reported' OR result->>'replayed'<>'false' THEN
   RAISE EXCEPTION 'Execution attestation failed: %',result; END IF;
 replay:=public.record_booking_change_handoff(
   req,'report_execution','HOTEL-SOURCE-666','إعادة إرسال الطلب');
 IF replay->>'replayed'<>'true' THEN RAISE EXCEPTION 'Execution step emitted again'; END IF;
 BEGIN
   PERFORM public.record_booking_change_handoff(req,'block',null,'سبب مشكلة لاحق');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Final attestation could be silently blocked'; END IF;
END $$;

-- Rejected change cannot start supplier/finance/operations tracking.
SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000204');
 BEGIN PERFORM public.record_booking_change_handoff(
   req,'supplier_confirm','REJECTED-SUP-1');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Rejected amendment passed supplier check'; END IF;
END $$;

-- Create and approve new proposal, then block it BEFORE any supplier step.
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.create_booking_change_request(
 '00000000-0000-4000-8000-000000000101',
 '00000000-0000-4000-8000-000000000205',
 'service','المورد رفض تنفيذ التعديل الجديد بسبب عدم التوفر'
);
SET test.user_id='00000000-0000-4000-8000-000000000012';
SELECT public.decide_booking_change_request(
 public.test_lookup_change_id('00000000-0000-4000-8000-000000000205'),true,'تمت مراجعة الطلب'
);
DO $$
DECLARE req uuid; result jsonb;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000205');
 result:=public.record_booking_change_handoff(req,'block',null,'المورد رفض توفير هذه الخدمة');
 IF result->>'status'<>'blocked' THEN RAISE EXCEPTION 'Blocking before supplier confirmation failed'; END IF;
END $$;
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000205');
 BEGIN PERFORM public.record_booking_change_handoff(req,'supplier_confirm','SUP-OTHER-123');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Blocked amendment restarted unexpectedly'; END IF;
END $$;

-- Cancellation between supplier and finance must prevent continuing.
RESET ROLE;
INSERT INTO public.bookings VALUES
 ('00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000001','pending','confirmed');

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.create_booking_change_request(
 '00000000-0000-4000-8000-000000000104',
 '00000000-0000-4000-8000-000000000206',
 'dates','تعديل على رحلة تجريبية سيتم إلغاؤها بعد تأكيد المورد'
);
SET test.user_id='00000000-0000-4000-8000-000000000012';
SELECT public.decide_booking_change_request(
 public.test_lookup_change_id('00000000-0000-4000-8000-000000000206'),true,'اعتماد مبدئي'
);
SET test.user_id='00000000-0000-4000-8000-000000000013';
SELECT public.record_booking_change_handoff(
 public.test_lookup_change_id('00000000-0000-4000-8000-000000000206'),
 'supplier_confirm','SUP-CAN-0001'
);
RESET ROLE;
UPDATE public.bookings SET status='cancelled',workflow_stage='cancelled'
 WHERE id='00000000-0000-4000-8000-000000000104';
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE req uuid; denied boolean:=false; result jsonb;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000206');
 BEGIN PERFORM public.record_booking_change_handoff(req,'finance_verify','FIN-CAN-001');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cancelled booking advanced through finance'; END IF;
 result:=public.record_booking_change_handoff(
   req,'block',null,'تم إيقاف المتابعة بعد إلغاء الحجز');
 IF result->>'status'<>'blocked' THEN RAISE EXCEPTION 'Cancelled booking could not be blocked'; END IF;
END $$;

-- The state and its proof + timeline must commit as ONE transaction.
-- Simulated downstream timeline write failure must roll back all three.
RESET ROLE;
CREATE FUNCTION public.test_handoff_timeline_failure()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.kind='amendment_handoff' AND NEW.booking_id=
    '00000000-0000-4000-8000-000000000101'::uuid
    AND NEW.payload->>'step'='supplier_confirm'
    AND NEW.payload->>'status'='supplier_confirmed'
    AND NEW.payload->>'change_request_id' = (
       SELECT id::text FROM public.booking_change_requests
       WHERE request_key='00000000-0000-4000-8000-000000000207'
    )
 THEN RAISE EXCEPTION 'simulated timeline storage outage'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER test_handoff_timeline_failure
 BEFORE INSERT ON public.booking_timeline_events
 FOR EACH ROW EXECUTE FUNCTION public.test_handoff_timeline_failure();

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.create_booking_change_request(
 '00000000-0000-4000-8000-000000000101',
 '00000000-0000-4000-8000-000000000207',
 'service','تجربة فشل حفظ السجل الزمني أثناء تأكيد المورد'
);
SET test.user_id='00000000-0000-4000-8000-000000000012';
SELECT public.decide_booking_change_request(
 public.test_lookup_change_id('00000000-0000-4000-8000-000000000207'),true,'اختبار'
);
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE req uuid; failed boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000207');
 BEGIN PERFORM public.record_booking_change_handoff(req,'supplier_confirm','SUP-RETRY-01');
 EXCEPTION WHEN raise_exception THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Simulated downstream outage was not propagated'; END IF;
 IF EXISTS(SELECT 1 FROM public.booking_change_handoffs WHERE change_request_id=req)
 OR EXISTS(SELECT 1 FROM public.booking_change_handoff_events WHERE change_request_id=req)
 THEN RAISE EXCEPTION 'Orphan handoff survived failed downstream timeline insert'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER test_handoff_timeline_failure ON public.booking_timeline_events;
DROP FUNCTION public.test_handoff_timeline_failure();
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000013';
SELECT public.record_booking_change_handoff(
 public.test_lookup_change_id('00000000-0000-4000-8000-000000000207'),
 'supplier_confirm','SUP-RETRY-01'
);

RESET ROLE;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.booking_change_handoff_events)<>7
    OR (SELECT count(*) FROM public.booking_timeline_events
        WHERE kind='amendment_handoff')<>7
    OR (SELECT count(*) FROM public.booking_change_handoffs)<>4
 THEN
   RAISE EXCEPTION 'Handoff history rows / deduplication counts diverged';
 END IF;
 IF EXISTS(
   SELECT 1 FROM public.booking_timeline_events
   WHERE kind='amendment_handoff'
      AND (payload ? 'evidence_reference' OR payload ? 'finance_reference'
           OR payload ? 'note' OR payload ? 'cost')
 ) THEN RAISE EXCEPTION 'Sensitive evidence leaked into broad timeline'; END IF;
 IF (SELECT status FROM public.bookings WHERE id=
     '00000000-0000-4000-8000-000000000101')<>'pending'
 THEN RAISE EXCEPTION 'Handoff secretly changed source booking status'; END IF;
END $$;


-- A privileged accidental cross-tenant INSERT must also fail at the FK level.
DO $
DECLARE req uuid; rejected boolean:=false;
BEGIN
  SELECT id INTO req FROM public.booking_change_requests
  WHERE request_key='00000000-0000-4000-8000-000000000201';
  BEGIN
    INSERT INTO public.booking_change_handoffs(
      organization_id,booking_id,change_request_id
    ) VALUES (
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000102',req
    );
  EXCEPTION WHEN foreign_key_violation THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Cross-company service handoff row accepted'; END IF;
END $;

SELECT 'Trip File supervised handoff security, order and rollback tests passed' AS result;
