-- Run in a disposable PostgreSQL 16 service container, never on hosted databases.
\set ON_ERROR_STOP on
\i scripts/test-pilgrimage-sales-models.sql
\i scripts/deploy-pilgrimage-seat-allocations.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrimage_seat_allocations','INSERT')
    OR has_table_privilege('authenticated','public.pilgrimage_seat_allocations','UPDATE')
    OR has_table_privilege('authenticated','public.pilgrimage_seat_allocation_events','INSERT')
    OR has_function_privilege('anon','public.transition_pilgrimage_seat_allocation(uuid,text,int)','EXECUTE')
 THEN RAISE EXCEPTION 'Seat inventory can be mutated directly via client API'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Group and B2B share the SAME actual program capacity. A hold is provisional.
DO $$
DECLARE a uuid; b uuid;
BEGIN
 a:=public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000301','hold',60);
 b:=public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000301','hold',60);
 IF a<>b OR
    (SELECT count(*) FROM public.pilgrimage_seat_allocation_events WHERE allocation_id=a)<>1 OR
    (SELECT seat_count FROM public.pilgrimage_seat_allocations WHERE id=a)<>2
 THEN RAISE EXCEPTION 'Hold idempotency or group count failed'; END IF;
END $$;
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000303','hold',60);

-- FIT has no pre-existing group inventory. No fake supplier confirmation.
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
    '00000000-0000-4000-8000-000000000302','hold',60);
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'FIT unexpectedly reserved group inventory'; END IF;
END $$;

-- A group quote with an existing active original-program pilgrim is not
-- counted twice (must be reconciled through a separate manual workflow).
INSERT INTO public.pilgrimage_sale_items
 (organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell)
VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000304',
 'program_seat','مقعد موجود بالفعل','quad',1,900
);
UPDATE public.pilgrimage_sales SET status='quoted'
WHERE id='00000000-0000-4000-8000-000000000304';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
    '00000000-0000-4000-8000-000000000304','hold',60);
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Already registered pilgrim was double counted'; END IF;
END $$;

-- Third quote issued while normal registered capacity is sufficient.
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,name,
 program_id,buyer_customer_id,party_size,currency
) VALUES (
 '00000000-0000-4000-8000-000000000306',
 '00000000-0000-4000-8000-000000000001','umrah','group_seat',
 'organizer','مسودة برنامج جديد 2 مقاعد',
 '00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000101',2,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,room_type,quantity,unit_sell
) VALUES(
 '00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000306',
 'program_seat','مقعدين آخرين','double',2,900);
UPDATE public.pilgrimage_sales SET status='quoted'
WHERE id='00000000-0000-4000-8000-000000000306';

RESET ROLE;
UPDATE public.pilgrimage_programs SET capacity=13
 WHERE id='00000000-0000-4000-8000-000000000201';
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Program now has: 1 registered pilgrim + 2 Group held + 10 B2B held
-- = 13/13. A third group hold MUST fail, even if a quote was issued.
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
    '00000000-0000-4000-8000-000000000306','hold',60);
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Overbooked program by creating a third hold'; END IF;
END $$;

-- Do not allow browser to overwrite/circumvent allocations or audit events.
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrimage_seat_allocations SET status='released'
    WHERE sale_id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Browser bypassed seat allocation RPC'; END IF;
END $$;

-- Direct pilgrim registration must respect active pending/allocated seats.
RESET ROLE;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.pilgrims(id,organization_id,program_id,status)
  VALUES('00000000-0000-4000-8000-000000000221',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201','registered');
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Pilgrim insert ignored held inventory'; END IF;
 blocked:=false;
 BEGIN
  UPDATE public.pilgrimage_programs SET capacity=12
  WHERE id='00000000-0000-4000-8000-000000000201';
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Program capacity shrank below active holds'; END IF;
END $$;
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- Confirm means INTERNAL ALLOCATION, never an external hotel/flight/permit booking.
DO $$
DECLARE a uuid; b uuid;
BEGIN
 a:=public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000301','allocate',60);
 b:=public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000301','allocate',60);
 IF a<>b OR
    (SELECT count(*) FROM public.pilgrimage_seat_allocation_events WHERE allocation_id=a)<>2 OR
    (SELECT status FROM public.pilgrimage_seat_allocations WHERE id=a)<>'allocated'
 THEN RAISE EXCEPTION 'Confirmed internal allocation not idempotent'; END IF;
END $$;

-- Cannot cancel quoted sale while it owns active inventory; release first.
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  UPDATE public.pilgrimage_sales SET status='cancelled'
  WHERE id='00000000-0000-4000-8000-000000000301';
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Cancelled sale while seats remained allocated'; END IF;
END $$;

-- Releasing allocated seats frees 2 places and permits the third group.
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000301','release',60);
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000306','hold',60);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.pilgrimage_seat_allocations
     WHERE status='held' AND program_id='00000000-0000-4000-8000-000000000201')<>2
 THEN RAISE EXCEPTION 'Released seats were not available'; END IF;
END $$;

-- Expired holds must cease counting toward available inventory (lazy expiry),
-- but the original event history must remain immutable.
RESET ROLE;
UPDATE public.pilgrimage_seat_allocations
  SET hold_expires_at=now()-interval '2 hours'
  WHERE sale_id='00000000-0000-4000-8000-000000000303';
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
DO $$
DECLARE a uuid; v_before int; v_after int;
BEGIN
 SELECT count(*) INTO v_before FROM public.pilgrimage_seat_allocation_events e
 JOIN public.pilgrimage_seat_allocations s ON s.id=e.allocation_id
 WHERE s.sale_id='00000000-0000-4000-8000-000000000303';
 a:=public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000303','hold',60);
 SELECT count(*) INTO v_after FROM public.pilgrimage_seat_allocation_events e
 JOIN public.pilgrimage_seat_allocations s ON s.id=e.allocation_id
 WHERE s.sale_id='00000000-0000-4000-8000-000000000303';
 IF v_after<>v_before+1 OR NOT EXISTS(
   SELECT 1 FROM public.pilgrimage_seat_allocations
   WHERE id=a AND status='held' AND hold_expires_at>now()
 ) THEN RAISE EXCEPTION 'Expired hold failed to renew and audit'; END IF;
END $$;

-- Other company manager may not call the privileged RPC or see A inventory.
SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_seat_allocations)
    OR EXISTS(SELECT 1 FROM public.pilgrimage_seat_allocation_events)
 THEN RAISE EXCEPTION 'Cross-company allocation/audit data leaked'; END IF;
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000301','release',60);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Cross-tenant manager released seats'; END IF;
END $$;

-- Same-tenant viewer can read but cannot take an allocation.
SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.pilgrimage_seat_allocations)<>3 THEN
   RAISE EXCEPTION 'Viewer cannot see internal allocations'; END IF;
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000303','release',60);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Viewer changed internal allocated inventory'; END IF;
END $$;

-- Missing subject and anonymous JWT fail closed; anonymous API cannot call.
SET test.user_id='';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000303','release',60);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Missing subject allocated seats'; END IF;
END $$;
SET ROLE anon;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
   '00000000-0000-4000-8000-000000000303','release',60);
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Anonymous role called allocation RPC'; END IF;
END $$;
RESET ROLE;

-- Releasing then cancelling should succeed; audit remains intact.
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000303','release',60);
SELECT public.transition_pilgrimage_seat_allocation(
 '00000000-0000-4000-8000-000000000306','release',60);
UPDATE public.pilgrimage_sales SET status='cancelled'
 WHERE id='00000000-0000-4000-8000-000000000301';
SELECT 'All pilgrimage internal seat hold/allocation/release contracts passed' AS result;
