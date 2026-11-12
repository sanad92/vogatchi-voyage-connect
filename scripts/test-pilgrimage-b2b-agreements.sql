-- Disposable synthetic PostgreSQL 16 only; no production/accounting tables changed.
\set ON_ERROR_STOP on
\i scripts/test-pilgrimage-sales-models.sql

-- The simplified sales fixture omits the CRM archive field. This restores
-- only schema metadata known from the project's generated production types.
ALTER TABLE public.customers ADD COLUMN archived_at timestamptz;
\i scripts/deploy-pilgrimage-seat-allocations.sql
\i scripts/deploy-pilgrimage-b2b-agreements.sql

DO $$
BEGIN
 IF has_table_privilege('authenticated','public.pilgrimage_b2b_agreements','INSERT')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_agreements','UPDATE')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_installments','INSERT')
 OR has_table_privilege('authenticated','public.pilgrimage_b2b_agency_accounts','UPDATE')
 OR has_function_privilege('anon','public.prepare_pilgrimage_b2b_agreement(uuid,uuid,text,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.approve_pilgrimage_b2b_agreement(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'B2B contract or debtor mapping exposed to untrusted client'; END IF;
END $$;

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000011';

-- The issuer's 10-seat B2B quote sells at 500 EGP per seat = 5,000 EGP.
-- It must belong to a real CRM debtor that the manager explicitly selects.
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000101',
    'شركة مشترية، دفعتان تعاقديتان داخليًا',
    '[{"due_date":"2027-02-01","amount":2000},{"due_date":"2027-02-15","amount":2500}]'::jsonb
  );
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Partial payment plan accepted for 5000 contract'; END IF;
 IF EXISTS (SELECT 1 FROM public.pilgrimage_b2b_agency_accounts) THEN
  RAISE EXCEPTION 'Invalid B2B plan partially linked CRM debtor'; END IF;
END $$;

DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000102',
    'شركة مشترية، دفع مقدم ودفعة لاحقة',
    '[{"due_date":"2027-02-01","amount":2000},{"due_date":"2027-02-15","amount":3000}]'::jsonb
  );
 EXCEPTION WHEN foreign_key_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Debtor of another tenant assigned to agency A'; END IF;
END $$;

DO $$
DECLARE id1 uuid; id2 uuid; blocked boolean:=false;
BEGIN
 id1:=public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000101',
    'شركة مشترية، دفع مقدم ودفعة لاحقة',
    '[{"due_date":"2027-02-01","amount":2000},{"due_date":"2027-02-15","amount":3000}]'::jsonb
 );
 id2:=public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000101',
    'شركة مشترية، دفع مقدم ودفعة لاحقة',
    '[{"due_date":"2027-02-01","amount":2000},{"due_date":"2027-02-15","amount":3000}]'::jsonb
 );
 IF id1<>id2 THEN RAISE EXCEPTION 'B2B retry issued duplicate contract'; END IF;
 IF (SELECT status FROM public.pilgrimage_b2b_agreements WHERE id=id1)<>'draft'
 OR (SELECT total_contract_amount FROM public.pilgrimage_b2b_agreements WHERE id=id1)<>5000
 OR (SELECT currency FROM public.pilgrimage_b2b_agreements WHERE id=id1)<>'EGP'
 OR (SELECT count(*) FROM public.pilgrimage_b2b_installments WHERE agreement_id=id1)<>2
 OR (SELECT sum(amount) FROM public.pilgrimage_b2b_installments WHERE agreement_id=id1)<>5000
 OR (SELECT count(*) FROM public.pilgrimage_b2b_agency_accounts)<>1 THEN
   RAISE EXCEPTION 'B2B contract or installment snapshot inconsistent'; END IF;

 BEGIN
  PERFORM public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000101',
    'شركة مشترية، تغيير الشروط دون مراجعة',
    '[{"due_date":"2027-02-01","amount":5000}]'::jsonb
  );
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Existing contract was silently replaced'; END IF;
END $$;

DO $$
DECLARE blocked boolean:=false; contract_id uuid;
BEGIN
 SELECT id INTO contract_id FROM public.pilgrimage_b2b_agreements LIMIT 1;
 BEGIN
  PERFORM public.approve_pilgrimage_b2b_agreement(contract_id);
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Contract approved before internal seat allocation'; END IF;
END $$;

-- Allocate group seats ONLY inside company capacity, without external claims.
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000303','hold',120);
SELECT public.transition_pilgrimage_seat_allocation(
  '00000000-0000-4000-8000-000000000303','allocate',120);

DO $$
DECLARE contract_id uuid; approved uuid; repeated uuid;
BEGIN
 SELECT id INTO contract_id FROM public.pilgrimage_b2b_agreements LIMIT 1;
 approved:=public.approve_pilgrimage_b2b_agreement(contract_id);
 repeated:=public.approve_pilgrimage_b2b_agreement(contract_id);
 IF approved<>contract_id OR repeated<>contract_id
    OR (SELECT status FROM public.pilgrimage_b2b_agreements WHERE id=contract_id)<>'approved_internal'
    OR (SELECT approved_by FROM public.pilgrimage_b2b_agreements WHERE id=contract_id)
      <>'00000000-0000-4000-8000-000000000011'::uuid THEN
  RAISE EXCEPTION 'Approved internal contract not idempotent or audited'; END IF;
END $$;

DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.transition_pilgrimage_seat_allocation(
    '00000000-0000-4000-8000-000000000303','release',120);
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Approved agency inventory was released without finance review'; END IF;
 denied:=false;
 BEGIN
  UPDATE public.pilgrimage_b2b_agreements SET total_contract_amount=1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Client changed approved B2B contract amount'; END IF;
END $$;

-- Creating an agency agreement must not make a paid invoice or cash entry.
-- These tables deliberately have no write path into bookings/invoices/payments.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.pilgrimage_b2b_agreements)<>1 OR
    (SELECT count(*) FROM public.pilgrimage_b2b_agency_accounts)<>1 THEN
    RAISE EXCEPTION 'Agency contract duplication detected'; END IF;
END $$;

-- Managers cannot hijack another agency or reuse its financial debtor mapping.
INSERT INTO public.pilgrimage_agencies(id,organization_id,name)
VALUES('00000000-0000-4000-8000-000000000402',
 '00000000-0000-4000-8000-000000000001','Different B2B buyer');
INSERT INTO public.pilgrimage_sales(
 id,organization_id,program_type,sale_model,fulfillment_role,
 name,buyer_agency_id,party_size,currency
) VALUES(
 '00000000-0000-4000-8000-000000000304',
 '00000000-0000-4000-8000-000000000001',
 'umrah','b2b_group','organizer','Another agency group',
 '00000000-0000-4000-8000-000000000402',1,'EGP');
INSERT INTO public.pilgrimage_sale_items(
 organization_id,sale_id,item_kind,description,quantity,unit_sell
) VALUES('00000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000304','other','Agency assistance',1,300);
UPDATE public.pilgrimage_sales SET status='quoted'
 WHERE id='00000000-0000-4000-8000-000000000304';
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000101',
    'Different agency cannot take linked debtor',
    '[{"due_date":"2027-02-01","amount":300}]'::jsonb);
 EXCEPTION WHEN unique_violation THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Existing B2B debtor account hijacked'; END IF;
END $$;

-- Same-company viewer sees quotation prices only, not B2B credit/terms.
SET test.user_id='00000000-0000-4000-8000-000000000012';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agreements)
    OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_installments)
    OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agency_accounts)
 THEN RAISE EXCEPTION 'B2B financial terms leaked to viewer'; END IF;
 BEGIN
  PERFORM public.prepare_pilgrimage_b2b_agreement(
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000101','Disallowed viewer retry',
    '[{"due_date":"2027-02-01","amount":5000}]'::jsonb);
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Viewer created B2B financial document'; END IF;
END $$;

SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
DECLARE denied boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agreements)
 OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_installments)
 OR EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agency_accounts)
 THEN RAISE EXCEPTION 'B2B agreement leaked to other organization'; END IF;
 BEGIN
  PERFORM public.approve_pilgrimage_b2b_agreement(
   (SELECT id FROM public.pilgrimage_b2b_agreements LIMIT 1));
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 -- This receives null due to same-tenant RLS; the privileged function rejects it.
 IF NOT denied THEN RAISE EXCEPTION 'Cross-tenant approved an agreement'; END IF;
END $$;

SET test.user_id='';
SET ROLE anon;
DO $$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM 1 FROM public.pilgrimage_b2b_agreements;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Anon read financial B2B terms'; END IF;
END $$;
RESET ROLE;
SELECT 'B2B agency debtor mapping, installment schedule and guarded internal approval passed' AS result;
