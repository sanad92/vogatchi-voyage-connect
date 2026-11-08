-- Trip File Sprint 5: real ledger/source ID association, no financial writes.
-- EPHEMERAL POSTGRES ONLY. Parent fixtures exercise Sprint 1 + Sprint 4.
\set ON_ERROR_STOP on
\i scripts/test-trip-file-supervised-handoff.sql

CREATE TABLE public.invoices(
 id uuid PRIMARY KEY,organization_id uuid,booking_id uuid,
 status text,currency text,final_amount numeric,invoice_number text
);
CREATE TABLE public.supplier_invoices(
 id uuid PRIMARY KEY,organization_id uuid,booking_id uuid,
 status text,currency text,amount numeric,invoice_number text
);
CREATE TABLE public.customer_payments(
 id uuid PRIMARY KEY,organization_id uuid,booking_id uuid,
 status text,currency text,amount numeric,reference_number text
);
CREATE TABLE public.supplier_payments(
 id uuid PRIMARY KEY,organization_id uuid,booking_id uuid,
 status text,currency text,amount numeric,
 reference_number text,payment_reference text
);
CREATE TABLE public.generated_documents(
 id uuid PRIMARY KEY,organization_id uuid,booking_id uuid,
 currency text,total_amount numeric,document_number text
);

INSERT INTO public.invoices VALUES
 ('00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'issued','USD',700,'INV-A-700'),
 ('00000000-0000-4000-8000-000000000502',
  '00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102',
  'issued','USD',100,'INV-B-100'),
 ('00000000-0000-4000-8000-000000000503',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000104',
  'issued','USD',300,'INV-OTHER-300'),
 ('00000000-0000-4000-8000-000000000504',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'cancelled','USD',200,'INV-VOID');

INSERT INTO public.supplier_invoices VALUES
 ('00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'approved','USD',480,'SUP-INV-001');
INSERT INTO public.customer_payments VALUES
 ('00000000-0000-4000-8000-000000000521',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'completed','USD',300,'CUST-PAY-001');
INSERT INTO public.supplier_payments VALUES
 ('00000000-0000-4000-8000-000000000531',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'paid','USD',150,'SUP-PAY-001','BANK-001');
INSERT INTO public.generated_documents VALUES
 ('00000000-0000-4000-8000-000000000541',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',
  'USD',700,'VOUCHER-001');

\i scripts/deploy-trip-file-source-evidence-links.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.booking_change_source_evidence','INSERT')
 OR has_table_privilege('authenticated','public.booking_change_source_evidence','UPDATE')
 OR has_table_privilege('authenticated','public.booking_change_source_evidence','DELETE')
 OR NOT has_table_privilege('authenticated','public.booking_change_source_evidence','SELECT')
 OR has_function_privilege('anon','public.link_booking_change_source_evidence(uuid,text,uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.link_booking_change_source_evidence(uuid,text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Source evidence privilege boundary is unsafe'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000501');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Employee without finance edit linked a document'; END IF;
 IF (SELECT count(*) FROM public.booking_change_source_evidence)<>0 THEN
   RAISE EXCEPTION 'Employee without finance view saw proof'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE req uuid; first jsonb; replay jsonb; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 first:=public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000501');
 IF first->>'replayed'<>'false' THEN RAISE EXCEPTION 'First link failed: %',first; END IF;
 replay:=public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000501');
 IF replay->>'replayed'<>'true' OR replay->>'id'<>first->>'id' THEN
   RAISE EXCEPTION 'Evidence retry not idempotent: %',replay;
 END IF;

 -- All 5 existing source record types can be associated, but never mutate.
 PERFORM public.link_booking_change_source_evidence(
   req,'supplier_invoice','00000000-0000-4000-8000-000000000511');
 PERFORM public.link_booking_change_source_evidence(
   req,'customer_payment','00000000-0000-4000-8000-000000000521');
 PERFORM public.link_booking_change_source_evidence(
   req,'supplier_payment','00000000-0000-4000-8000-000000000531');
 PERFORM public.link_booking_change_source_evidence(
   req,'generated_document','00000000-0000-4000-8000-000000000541');

 -- User knows a document UUID in another tenant: still rejected.
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000502');
 EXCEPTION WHEN no_data_found THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-company invoice linked'; END IF;

 denied:=false;
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000503');
 EXCEPTION WHEN no_data_found THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Different booking invoice linked'; END IF;

 denied:=false;
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   req,'customer_invoice','00000000-0000-4000-8000-000000000504');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cancelled invoice linked as valid'; END IF;

 denied:=false;
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   req,'unrecognized_table','00000000-0000-4000-8000-000000000501');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Arbitrary table lookup permitted'; END IF;

 denied:=false;
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   public.test_lookup_change_id('00000000-0000-4000-8000-000000000204'),
   'customer_invoice','00000000-0000-4000-8000-000000000501');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Rejected amendment acquired evidence'; END IF;

 -- Sprint 8 regression: an approved request whose handoff was blocked
 -- must never accept more finance evidence, even from a manager.
 denied:=false;
 BEGIN
  PERFORM public.link_booking_change_source_evidence(
   public.test_lookup_change_id('00000000-0000-4000-8000-000000000205'),
   'customer_invoice','00000000-0000-4000-8000-000000000501');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Blocked amendment accepted a new finance link'; END IF;
END $;

SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.booking_change_source_evidence)<>0 THEN
   RAISE EXCEPTION 'Org B member saw another tenant evidence'; END IF;
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 BEGIN PERFORM public.link_booking_change_source_evidence(
   req,'supplier_invoice','00000000-0000-4000-8000-000000000511');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Other company manager linked evidence'; END IF;
END $$;
RESET ROLE;

-- Corrupt a linked source later: the archived status must not become an
-- authoritative settlement signal; it remains a historical snapshot.
UPDATE public.supplier_payments SET status='reversed'
WHERE id='00000000-0000-4000-8000-000000000531';

DO $$
DECLARE req uuid; denied boolean:=false;
BEGIN
 req:=public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
 IF (SELECT count(*) FROM public.booking_change_source_evidence
    WHERE change_request_id=req)<>5
 OR (SELECT count(*) FROM public.booking_timeline_events
    WHERE kind='amendment_evidence_linked')<>5
 THEN RAISE EXCEPTION 'Evidence/timeline count mismatch or duplicate replay'; END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.booking_change_source_evidence
   WHERE source_type='supplier_payment' AND status_at_link='paid'
 ) THEN RAISE EXCEPTION 'Historical status snapshot changed after reversal'; END IF;
 IF EXISTS(SELECT 1 FROM public.booking_timeline_events
    WHERE kind='amendment_evidence_linked'
      AND (payload ? 'amount' OR payload ? 'currency'
           OR payload ? 'reference' OR payload ? 'source_id')
 ) THEN RAISE EXCEPTION 'Private finance data leaked into general timeline'; END IF;
 IF (SELECT amount FROM public.supplier_invoices
     WHERE id='00000000-0000-4000-8000-000000000511') <> 480
 OR (SELECT amount FROM public.customer_payments
     WHERE id='00000000-0000-4000-8000-000000000521') <> 300
 OR (SELECT amount FROM public.supplier_payments
     WHERE id='00000000-0000-4000-8000-000000000531') <> 150
 THEN RAISE EXCEPTION 'Evidence linking modified original money records'; END IF;
END $$;

-- Privileged FK guard also rejects an accidental cross-company change.
DO $fk$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  UPDATE public.booking_change_source_evidence
  SET organization_id='00000000-0000-4000-8000-000000000002'
  WHERE source_type='customer_invoice';
 EXCEPTION WHEN foreign_key_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Evidence row tenant consistency FK failed'; END IF;
END $fk$;

SELECT 'Trip File source-document evidence linking tests passed' AS result;
