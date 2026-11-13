-- Safar ERP Hajj/Umrah B2B: agency contract & pre-accounting schedule.
-- STAGING/DISPOSABLE ONLY; PR #42 sales + PR #43 internal allocations required.
-- An approved_internal agreement is NOT a signed external contract, invoice,
-- receivable in the general ledger, customer payment, visa or supplier order.
BEGIN;

CREATE TABLE public.pilgrimage_b2b_agency_accounts (
  agency_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  debtor_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  linked_by uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,agency_id),
  UNIQUE (organization_id,debtor_customer_id),
  FOREIGN KEY (organization_id,agency_id)
    REFERENCES public.pilgrimage_agencies(organization_id,id) ON DELETE RESTRICT
);

CREATE TABLE public.pilgrimage_b2b_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sale_id uuid NOT NULL UNIQUE,
  agency_id uuid NOT NULL,
  debtor_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  total_contract_amount numeric(16,2) NOT NULL CHECK (total_contract_amount>0),
  currency text NOT NULL CHECK (currency IN ('EGP','SAR','USD','EUR')),
  terms text NOT NULL CHECK (char_length(btrim(terms)) BETWEEN 5 AND 4000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved_internal','voided')),
  request_fingerprint text NOT NULL,
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id),
  FOREIGN KEY (organization_id,sale_id)
    REFERENCES public.pilgrimage_sales(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,agency_id)
    REFERENCES public.pilgrimage_agencies(organization_id,id) ON DELETE RESTRICT,
  CHECK ((status='approved_internal') = (approved_at IS NOT NULL AND approved_by IS NOT NULL))
);

CREATE TABLE public.pilgrimage_b2b_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  agreement_id uuid NOT NULL,
  sequence_no smallint NOT NULL CHECK (sequence_no BETWEEN 1 AND 12),
  due_date date NOT NULL,
  amount numeric(16,2) NOT NULL CHECK (amount>0),
  currency text NOT NULL CHECK (currency IN ('EGP','SAR','USD','EUR')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id,sequence_no),
  FOREIGN KEY (organization_id,agreement_id)
    REFERENCES public.pilgrimage_b2b_agreements(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_b2b_agreements_org_idx
  ON public.pilgrimage_b2b_agreements(organization_id,created_at DESC);
CREATE INDEX pilgrimage_b2b_installments_org_idx
  ON public.pilgrimage_b2b_installments(organization_id,agreement_id,due_date);

REVOKE ALL ON public.pilgrimage_b2b_agency_accounts,
  public.pilgrimage_b2b_agreements, public.pilgrimage_b2b_installments
  FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pilgrimage_b2b_agency_accounts,
  public.pilgrimage_b2b_agreements,public.pilgrimage_b2b_installments TO authenticated;
GRANT ALL ON public.pilgrimage_b2b_agency_accounts,
  public.pilgrimage_b2b_agreements,public.pilgrimage_b2b_installments TO service_role;
ALTER TABLE public.pilgrimage_b2b_agency_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_b2b_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_b2b_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read B2B debtor mappings" ON public.pilgrimage_b2b_agency_accounts
  FOR SELECT TO authenticated USING (
  public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager')
  AND public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers read B2B agreements" ON public.pilgrimage_b2b_agreements
  FOR SELECT TO authenticated USING (
  public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager')
  AND public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "managers read B2B installments" ON public.pilgrimage_b2b_installments
  FOR SELECT TO authenticated USING (
  public.get_user_org_role(auth.uid(),organization_id)::text IN ('owner','admin','manager')
  AND public.user_belongs_to_org(auth.uid(),organization_id));

CREATE OR REPLACE FUNCTION public.prepare_pilgrimage_b2b_agreement(
 _sale_id uuid, _debtor_customer_id uuid, _terms text, _installments jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 actor uuid:=auth.uid();
 sale public.pilgrimage_sales%ROWTYPE;
 existing public.pilgrimage_b2b_agreements%ROWTYPE;
 mapping public.pilgrimage_b2b_agency_accounts%ROWTYPE;
 agreement_id uuid;
 amount_due numeric(16,2);
 schedule_total numeric(16,2):=0;
 fingerprint text;
 schedule_count int;
 ix int:=0;
 due_date date;
 amount numeric(16,2);
 installment jsonb;
BEGIN
 IF actor IS NULL OR _sale_id IS NULL OR _debtor_customer_id IS NULL
 THEN RAISE EXCEPTION 'authenticated_manager_required' USING ERRCODE='42501'; END IF;

 -- One write lock is shared with quote cancellations and quote revisions.
 SELECT * INTO sale FROM public.pilgrimage_sales
  WHERE id=_sale_id AND public.user_belongs_to_org(actor,organization_id)
  FOR UPDATE;
 IF NOT FOUND OR public.get_user_org_role(actor,sale.organization_id)::text
    NOT IN ('owner','admin','manager') THEN
  RAISE EXCEPTION 'b2b_quote_not_found_or_not_authorized' USING ERRCODE='42501';
 END IF;
 IF sale.sale_model<>'b2b_group' OR sale.status<>'quoted'
    OR sale.buyer_agency_id IS NULL THEN
  RAISE EXCEPTION 'issued_b2b_quote_required' USING ERRCODE='22023'; END IF;

 IF _terms IS NULL OR char_length(btrim(_terms)) NOT BETWEEN 5 AND 4000 THEN
  RAISE EXCEPTION 'contract_terms_required' USING ERRCODE='22023'; END IF;
 IF _installments IS NULL OR jsonb_typeof(_installments)<>'array' THEN
  RAISE EXCEPTION 'installment_schedule_must_be_array' USING ERRCODE='22023'; END IF;
 schedule_count:=jsonb_array_length(_installments);
 IF schedule_count<1 OR schedule_count>12 THEN
  RAISE EXCEPTION 'one_to_twelve_installments_required' USING ERRCODE='22023'; END IF;

 fingerprint:=md5(_sale_id::text || '|' || _debtor_customer_id::text ||
   '|' || btrim(_terms) || '|' || _installments::text);
 SELECT * INTO existing FROM public.pilgrimage_b2b_agreements
  WHERE sale_id=sale.id AND organization_id=sale.organization_id FOR UPDATE;
 IF FOUND THEN
  IF existing.request_fingerprint=fingerprint THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'contract_already_exists_use_quote_revision'
    USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.customers c
  WHERE c.id=_debtor_customer_id AND c.organization_id=sale.organization_id
    AND c.archived_at IS NULL) THEN
  RAISE EXCEPTION 'buyer_debtor_not_active_in_organization' USING ERRCODE='23503'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.pilgrimage_agencies a
  WHERE a.id=sale.buyer_agency_id AND a.organization_id=sale.organization_id) THEN
  RAISE EXCEPTION 'buyer_agency_not_in_organization' USING ERRCODE='23503'; END IF;

 SELECT coalesce(sum(i.line_sell),0)::numeric(16,2) INTO amount_due
  FROM public.pilgrimage_sale_items i
  WHERE i.sale_id=sale.id AND i.organization_id=sale.organization_id;
 IF amount_due<=0 THEN RAISE EXCEPTION 'empty_b2b_quote' USING ERRCODE='22023'; END IF;
 FOR installment IN SELECT value FROM jsonb_array_elements(_installments) LOOP
  IF jsonb_typeof(installment)<>'object' OR
     jsonb_typeof(installment->'amount')<>'number' OR
     jsonb_typeof(installment->'due_date')<>'string' OR
     (installment->>'amount') !~ '^[0-9]+([.][0-9]{1,2})?$' OR
     (installment->>'due_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'bad_installment_amount_or_due_date'
      USING ERRCODE='22023'; END IF;
  amount:=(installment->>'amount')::numeric(16,2);
  due_date:=(installment->>'due_date')::date;
  IF amount<=0 OR due_date<date '2020-01-01' OR due_date>current_date+interval '5 years' THEN
    RAISE EXCEPTION 'installment_amount_or_date_out_of_bounds'
      USING ERRCODE='22023'; END IF;
  schedule_total:=schedule_total+amount;
 END LOOP;
 IF schedule_total<>amount_due THEN
  RAISE EXCEPTION 'b2b_installments_do_not_match_quote_total'
    USING ERRCODE='22023'; END IF;

 -- A single debtor CRM account is bound to each agency under this tenant.
 -- Both account and agency are selected explicitly, never inferred from
 -- an individual's passport, shared family phone or a traveler's name.
 SELECT * INTO mapping FROM public.pilgrimage_b2b_agency_accounts
  WHERE agency_id=sale.buyer_agency_id AND organization_id=sale.organization_id FOR UPDATE;
 IF FOUND THEN
   IF mapping.debtor_customer_id<>_debtor_customer_id THEN
    RAISE EXCEPTION 'agency_has_a_different_linked_debtor'
      USING ERRCODE='22023'; END IF;
 ELSE
   INSERT INTO public.pilgrimage_b2b_agency_accounts(
     agency_id,organization_id,debtor_customer_id,linked_by
   ) VALUES(sale.buyer_agency_id,sale.organization_id,_debtor_customer_id,actor);
 END IF;

 INSERT INTO public.pilgrimage_b2b_agreements(
  organization_id,sale_id,agency_id,debtor_customer_id,total_contract_amount,
  currency,terms,status,request_fingerprint,created_by
 ) VALUES (
  sale.organization_id,sale.id,sale.buyer_agency_id,_debtor_customer_id,
  amount_due,sale.currency,btrim(_terms),'draft',fingerprint,actor
 ) RETURNING id INTO agreement_id;

 FOR installment IN SELECT value FROM jsonb_array_elements(_installments) LOOP
  ix:=ix+1;
  INSERT INTO public.pilgrimage_b2b_installments(
    organization_id,agreement_id,sequence_no,due_date,amount,currency
  ) VALUES (
    sale.organization_id,agreement_id,ix,(installment->>'due_date')::date,
    (installment->>'amount')::numeric(16,2),sale.currency
  );
 END LOOP;
 RETURN agreement_id;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.prepare_pilgrimage_b2b_agreement(uuid,uuid,text,jsonb)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_pilgrimage_b2b_agreement(uuid,uuid,text,jsonb)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_pilgrimage_b2b_agreement(
 _agreement_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 actor uuid:=auth.uid();
 b public.pilgrimage_b2b_agreements%ROWTYPE;
 s public.pilgrimage_sales%ROWTYPE;
 p public.pilgrimage_programs%ROWTYPE;
 a public.pilgrimage_seat_allocations%ROWTYPE;
 schedule_total numeric(16,2);
 schedule_count int;
BEGIN
 IF actor IS NULL OR _agreement_id IS NULL THEN
  RAISE EXCEPTION 'authenticated_manager_required' USING ERRCODE='42501'; END IF;

 -- Pre-read only to find the quote, with tenant RLS/role gating; serialize
 -- approval against seat release using quote → program → allocation locks.
 SELECT * INTO b FROM public.pilgrimage_b2b_agreements
  WHERE id=_agreement_id AND public.user_belongs_to_org(actor,organization_id);
 IF NOT FOUND OR public.get_user_org_role(actor,b.organization_id)::text
  NOT IN ('owner','admin','manager') THEN
  RAISE EXCEPTION 'agreement_not_found_or_not_authorized'
    USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM public.pilgrimage_sales
  WHERE id=b.sale_id AND organization_id=b.organization_id FOR UPDATE;
 IF NOT FOUND OR s.sale_model<>'b2b_group' OR s.status<>'quoted' OR
   s.buyer_agency_id<>b.agency_id OR s.currency<>b.currency THEN
  RAISE EXCEPTION 'agreement_sale_mismatch' USING ERRCODE='22023'; END IF;
 IF s.program_id IS NULL THEN
  RAISE EXCEPTION 'unlinked_b2b_requires_separate_supplier_contract'
    USING ERRCODE='22023'; END IF;
 SELECT * INTO p FROM public.pilgrimage_programs
  WHERE id=s.program_id AND organization_id=b.organization_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'open' THEN
  RAISE EXCEPTION 'internal_program_not_open' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.pilgrimage_seat_allocations
  WHERE sale_id=s.id AND organization_id=b.organization_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'allocated' OR a.seat_count<>s.party_size THEN
  RAISE EXCEPTION 'b2b_internal_seats_not_allocated'
    USING ERRCODE='22023'; END IF;
 SELECT * INTO b FROM public.pilgrimage_b2b_agreements
  WHERE id=_agreement_id AND organization_id=s.organization_id FOR UPDATE;
 IF b.status='approved_internal' THEN RETURN b.id; END IF;
 IF b.status<>'draft' THEN RAISE EXCEPTION 'cannot_approve_voided_b2b'
  USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pilgrimage_b2b_agency_accounts x
  WHERE x.agency_id=b.agency_id AND x.organization_id=b.organization_id
   AND x.debtor_customer_id=b.debtor_customer_id) THEN
   RAISE EXCEPTION 'buyer_debtor_mapping_changed' USING ERRCODE='23503'; END IF;

 SELECT count(*),coalesce(sum(i.amount),0) INTO schedule_count,schedule_total
  FROM public.pilgrimage_b2b_installments i
  WHERE i.agreement_id=b.id AND i.organization_id=b.organization_id;
 IF schedule_count<1 OR schedule_total<>b.total_contract_amount THEN
  RAISE EXCEPTION 'b2b_schedule_invalid' USING ERRCODE='22023'; END IF;
 IF (SELECT coalesce(sum(i.line_sell),0) FROM public.pilgrimage_sale_items i
  WHERE i.sale_id=s.id)<>b.total_contract_amount THEN
  RAISE EXCEPTION 'quote_amount_changed_since_contract'
    USING ERRCODE='22023'; END IF;

 UPDATE public.pilgrimage_b2b_agreements
  SET status='approved_internal',approved_by=actor,approved_at=clock_timestamp()
  WHERE id=b.id;
 RETURN b.id;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.approve_pilgrimage_b2b_agreement(uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_pilgrimage_b2b_agreement(uuid)
 TO authenticated;

-- An internally approved agreement must not silently lose its reserved
-- program capacity or be deleted/cancelled through generic quote controls.
CREATE OR REPLACE FUNCTION public._pilgrimage_b2b_keep_approved_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF OLD.status='allocated' AND NEW.status<>'allocated' AND EXISTS(
  SELECT 1 FROM public.pilgrimage_b2b_agreements b
   WHERE b.sale_id=OLD.sale_id AND b.organization_id=OLD.organization_id
     AND b.status='approved_internal'
 ) THEN RAISE EXCEPTION 'approved_b2b_requires_managed_release_and_finance_review'
   USING ERRCODE='22023'; END IF;
 RETURN NEW;
END;
$fn$;
CREATE TRIGGER zz_pilgrimage_b2b_keep_approved_inventory
 BEFORE UPDATE OF status ON public.pilgrimage_seat_allocations
 FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_b2b_keep_approved_inventory();
REVOKE EXECUTE ON FUNCTION public._pilgrimage_b2b_keep_approved_inventory()
 FROM PUBLIC,anon,authenticated;
COMMIT;
