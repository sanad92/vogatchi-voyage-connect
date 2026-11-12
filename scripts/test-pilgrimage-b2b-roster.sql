-- Run only against an ephemeral Postgres 16 database; creates synthetic rows.
\set ON_ERROR_STOP on
\i scripts/test-pilgrimage-b2b-agreements.sql
\i scripts/deploy-pilgrimage-b2b-roster.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrimage_b2b_roster_entries','INSERT')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_roster_entries','UPDATE')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_roster_entries','DELETE')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_roster_events','INSERT')
 OR has_function_privilege('anon','public.add_pilgrimage_b2b_roster_name(uuid,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'B2B names or audit events are browser writable'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

DO $$
DECLARE
 v_agreement_id uuid;
 entry_id uuid;
 again_id uuid;
 client_id uuid;
 i int;
 blocked boolean:=false;
BEGIN
 SELECT id INTO v_agreement_id FROM public.pilgrimage_b2b_agreements
  WHERE sale_id='00000000-0000-4000-8000-000000000303';

 -- 10 names can be added after internal agreement approval (no passports,
 -- government documents, pilgrim bookings, or individual account balances).
 FOR i IN 1..10 LOOP
  client_id:=('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  entry_id:=public.add_pilgrimage_b2b_roster_name(
    v_agreement_id,client_id,'Agency Traveler '||i,'quad');
 END LOOP;
 entry_id:=(SELECT id FROM public.pilgrimage_b2b_roster_entries
  WHERE agreement_id=v_agreement_id AND display_name='Agency Traveler 1');
 again_id:=public.add_pilgrimage_b2b_roster_name(
  v_agreement_id,'00000000-0000-4000-8000-000000000001',
  'Agency Traveler 1','quad');
 IF entry_id<>again_id THEN RAISE EXCEPTION 'Idempotent roster retry inserted duplicate'; END IF;
 IF (SELECT count(*) FROM public.pilgrimage_b2b_roster_entries
     WHERE agreement_id=v_agreement_id AND status='active')<>10 THEN
   RAISE EXCEPTION 'Wrong B2B active manifest size'; END IF;
 IF (SELECT count(*) FROM public.pilgrimage_b2b_roster_events
     WHERE action='added')<>10 THEN
   RAISE EXCEPTION 'B2B roster insert audit not append-only'; END IF;

 BEGIN
  PERFORM public.add_pilgrimage_b2b_roster_name(
   v_agreement_id,'00000000-0000-4000-8000-000000000001',
   'Different Traveler Name','quad');
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Client reference reused with different name'; END IF;

 blocked:=false;
 BEGIN
  PERFORM public.add_pilgrimage_b2b_roster_name(
   v_agreement_id,'00000000-0000-4000-8000-000000000011',
   'Overbooked 11th Passenger','quad');
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'B2B manifest exceeded contracted 10 places'; END IF;

 PERFORM public.remove_pilgrimage_b2b_roster_name(entry_id);
 PERFORM public.remove_pilgrimage_b2b_roster_name(entry_id);
 PERFORM public.add_pilgrimage_b2b_roster_name(
  v_agreement_id,'00000000-0000-4000-8000-000000000011',
  'Agency Replacement Passenger','double');
 IF (SELECT count(*) FROM public.pilgrimage_b2b_roster_entries
     WHERE agreement_id=v_agreement_id AND status='active')<>10
 OR (SELECT count(*) FROM public.pilgrimage_b2b_roster_entries
     WHERE agreement_id=v_agreement_id AND status='removed')<>1
 OR (SELECT count(*) FROM public.pilgrimage_b2b_roster_events)<>12 THEN
  RAISE EXCEPTION 'B2B removal / replacement audit failed'; END IF;

 -- Name registry is NOT the operational pilgrim list; no revenue posting.
 IF (SELECT count(*) FROM public.pilgrims)<>1 THEN
  RAISE EXCEPTION 'B2B roster created or deleted actual program pilgrims'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_b2b_roster_entries)
 OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_roster_events) THEN
  RAISE EXCEPTION 'Viewer read sensitive agency passenger names'; END IF;
 BEGIN
  PERFORM public.add_pilgrimage_b2b_roster_name(
   (SELECT id FROM public.pilgrimage_b2b_agreements LIMIT 1),
   '00000000-0000-4000-8000-000000000031',
   'Viewer Should Not Add','quad');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Viewer changed agency manifest'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE blocked boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_b2b_roster_entries)
 OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_roster_events) THEN
  RAISE EXCEPTION 'Other tenant read B2B passenger data'; END IF;
 BEGIN
  PERFORM public.remove_pilgrimage_b2b_roster_name(
   '00000000-0000-4000-8000-000000000032');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Other tenant manipulated passenger registry'; END IF;
END $$;

SET test.user_id='';
SET ROLE anon;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM 1 FROM public.pilgrimage_b2b_roster_entries;
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Anon read agency passenger names'; END IF;
END $$;
RESET ROLE;
SELECT 'B2B 10-seat manifest, idempotency, replacement audit and RLS passed' AS result;
