-- Apply after deploy-pilgrimage-b2b-receivables.sql in an isolated environment.
BEGIN;

CREATE FUNCTION public._has_pilgrimage_finance_permission(_org uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public._can_read_pilgrimage_b2b_receivables(_org)
    AND coalesce(public.can_org_write(_org), false)
    AND EXISTS (SELECT 1 FROM public._org_permission_state(_org, auth.uid(), _permission)
                WHERE granted AND data_scope = 'organization');
$$;

ALTER TABLE public.supplier_payment_orders
  ALTER COLUMN booking_id DROP NOT NULL,
  ADD COLUMN pilgrimage_b2b_agreement_id uuid,
  ADD CONSTRAINT supplier_order_pilgrimage_agreement_fk
    FOREIGN KEY (organization_id, pilgrimage_b2b_agreement_id)
    REFERENCES public.pilgrimage_b2b_agreements(organization_id, id),
  ADD CONSTRAINT supplier_order_booking_or_pilgrimage CHECK (
    (booking_id IS NOT NULL AND pilgrimage_b2b_agreement_id IS NULL) OR
    (booking_id IS NULL AND pilgrimage_b2b_agreement_id IS NOT NULL AND supplier_id IS NOT NULL)
  );
CREATE INDEX supplier_order_pilgrimage_agreement_idx
  ON public.supplier_payment_orders(pilgrimage_b2b_agreement_id)
  WHERE pilgrimage_b2b_agreement_id IS NOT NULL;
CREATE UNIQUE INDEX supplier_order_pilgrimage_document_idx
  ON public.supplier_payment_orders(organization_id, supplier_id, lower(reference_number))
  WHERE pilgrimage_b2b_agreement_id IS NOT NULL;

CREATE POLICY pilgrimage_supplier_order_select ON public.supplier_payment_orders AS RESTRICTIVE
  FOR SELECT TO authenticated USING (pilgrimage_b2b_agreement_id IS NULL OR
    public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_supplier_order_insert ON public.supplier_payment_orders AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (pilgrimage_b2b_agreement_id IS NULL);
CREATE POLICY pilgrimage_supplier_order_update ON public.supplier_payment_orders AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (pilgrimage_b2b_agreement_id IS NULL)
  WITH CHECK (pilgrimage_b2b_agreement_id IS NULL);
CREATE POLICY pilgrimage_supplier_order_delete ON public.supplier_payment_orders AS RESTRICTIVE
  FOR DELETE TO authenticated USING (pilgrimage_b2b_agreement_id IS NULL);

CREATE FUNCTION public._is_pilgrimage_supplier_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.supplier_payment_orders
    WHERE id = _order_id AND pilgrimage_b2b_agreement_id IS NOT NULL);
$$;
CREATE FUNCTION public._is_pilgrimage_supplier_invoice(_invoice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public._is_pilgrimage_supplier_order(
    (SELECT payment_order_id FROM public.supplier_invoices WHERE id = _invoice_id));
$$;
CREATE FUNCTION public._is_pilgrimage_supplier_payment(_payment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.supplier_payment_allocations a
    WHERE a.supplier_payment_id = _payment_id
      AND public._is_pilgrimage_supplier_order(a.payment_order_id));
$$;
REVOKE ALL ON FUNCTION public._is_pilgrimage_supplier_order(uuid),
  public._is_pilgrimage_supplier_invoice(uuid), public._is_pilgrimage_supplier_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._is_pilgrimage_supplier_order(uuid),
  public._is_pilgrimage_supplier_invoice(uuid), public._is_pilgrimage_supplier_payment(uuid) TO authenticated;

CREATE POLICY pilgrimage_supplier_invoice_select ON public.supplier_invoices AS RESTRICTIVE
  FOR SELECT TO authenticated USING (NOT public._is_pilgrimage_supplier_order(payment_order_id)
    OR public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_supplier_allocation_select ON public.supplier_payment_allocations AS RESTRICTIVE
  FOR SELECT TO authenticated USING ((NOT public._is_pilgrimage_supplier_order(payment_order_id)
    AND NOT public._is_pilgrimage_supplier_invoice(supplier_invoice_id)
    AND NOT public._is_pilgrimage_supplier_payment(supplier_payment_id))
    OR public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_supplier_payment_select ON public.supplier_payments AS RESTRICTIVE
  FOR SELECT TO authenticated USING (NOT public._is_pilgrimage_supplier_payment(id)
    OR public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_supplier_invoice_insert ON public.supplier_invoices AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_supplier_order(payment_order_id));
CREATE POLICY pilgrimage_supplier_invoice_update ON public.supplier_invoices AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(payment_order_id))
  WITH CHECK (NOT public._is_pilgrimage_supplier_order(payment_order_id));
CREATE POLICY pilgrimage_supplier_invoice_delete ON public.supplier_invoices AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(payment_order_id));
CREATE POLICY pilgrimage_supplier_allocation_insert ON public.supplier_payment_allocations AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_supplier_order(payment_order_id)
    AND NOT public._is_pilgrimage_supplier_invoice(supplier_invoice_id)
    AND NOT public._is_pilgrimage_supplier_payment(supplier_payment_id));
CREATE POLICY pilgrimage_supplier_allocation_update ON public.supplier_payment_allocations AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(payment_order_id)
    AND NOT public._is_pilgrimage_supplier_invoice(supplier_invoice_id)
    AND NOT public._is_pilgrimage_supplier_payment(supplier_payment_id))
  WITH CHECK (NOT public._is_pilgrimage_supplier_order(payment_order_id)
    AND NOT public._is_pilgrimage_supplier_invoice(supplier_invoice_id)
    AND NOT public._is_pilgrimage_supplier_payment(supplier_payment_id));
CREATE POLICY pilgrimage_supplier_allocation_delete ON public.supplier_payment_allocations AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(payment_order_id)
    AND NOT public._is_pilgrimage_supplier_invoice(supplier_invoice_id)
    AND NOT public._is_pilgrimage_supplier_payment(supplier_payment_id));
CREATE POLICY pilgrimage_supplier_payment_update ON public.supplier_payments AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_supplier_payment(id));
CREATE POLICY pilgrimage_supplier_payment_delete ON public.supplier_payments AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public._is_pilgrimage_supplier_payment(id));

-- Treasury rows that settle these sources must follow their finance RPCs.
CREATE POLICY pilgrimage_treasury_insert ON public.bank_account_transactions AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_supplier_order(related_payment_order_id)
    AND NOT public._is_pilgrimage_b2b_invoice(related_invoice_id, NULL));
CREATE POLICY pilgrimage_treasury_update ON public.bank_account_transactions AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(related_payment_order_id)
    AND NOT public._is_pilgrimage_b2b_invoice(related_invoice_id, NULL))
  WITH CHECK (NOT public._is_pilgrimage_supplier_order(related_payment_order_id)
    AND NOT public._is_pilgrimage_b2b_invoice(related_invoice_id, NULL));
CREATE POLICY pilgrimage_treasury_delete ON public.bank_account_transactions AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public._is_pilgrimage_supplier_order(related_payment_order_id)
    AND NOT public._is_pilgrimage_b2b_invoice(related_invoice_id, NULL));

CREATE FUNCTION public.create_pilgrimage_supplier_obligation(
  _sale_id uuid, _supplier_id uuid, _reference text, _amount numeric, _due_date date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  agreement public.pilgrimage_b2b_agreements%ROWTYPE;
  purchase public.supplier_payment_orders%ROWTYPE;
  purchase_id uuid;
  document text := nullif(btrim(_reference), '');
BEGIN
  SELECT * INTO agreement FROM public.pilgrimage_b2b_agreements
  WHERE sale_id = _sale_id AND public.user_belongs_to_org(auth.uid(), organization_id) FOR UPDATE;
  IF NOT FOUND OR NOT public._has_pilgrimage_finance_permission(agreement.organization_id, 'financial_edit') THEN
    RAISE EXCEPTION 'pilgrimage_supplier_obligation_denied' USING ERRCODE = '42501';
  END IF;
  IF _supplier_id IS NULL OR document IS NULL OR char_length(document) > 120 OR _amount IS NULL
    OR _amount NOT BETWEEN 0.01 AND 999999999999.99 OR round(_amount, 2) <> _amount
    OR _due_date IS NULL THEN
    RAISE EXCEPTION 'invalid_pilgrimage_supplier_document' USING ERRCODE = '22023';
  END IF;
  -- Serialize a document reference across different agreements as well.
  PERFORM pg_advisory_xact_lock(hashtextextended(agreement.organization_id::text || ':' ||
    coalesce(_supplier_id::text, '') || ':' || lower(document), 0));
  SELECT * INTO purchase FROM public.supplier_payment_orders
    WHERE organization_id = agreement.organization_id AND supplier_id = _supplier_id
      AND lower(reference_number) = lower(document) AND pilgrimage_b2b_agreement_id IS NOT NULL;
  IF FOUND THEN
    IF purchase.pilgrimage_b2b_agreement_id = agreement.id AND purchase.amount = _amount
      AND purchase.due_date = _due_date THEN RETURN purchase.id; END IF;
    RAISE EXCEPTION 'pilgrimage_supplier_document_already_recorded' USING ERRCODE = '22023';
  END IF;
  IF agreement.status <> 'approved_internal' OR EXISTS (
    SELECT 1 FROM public.pilgrimage_b2b_cancellations c
    WHERE c.agreement_id = agreement.id AND c.status = 'requested'
  ) OR agreement.currency <> 'EGP' OR NOT EXISTS (
    SELECT 1 FROM public.organization_settings s WHERE s.organization_id = agreement.organization_id
      AND upper(s.currency) = agreement.currency
  ) OR NOT EXISTS (
    SELECT 1 FROM public.suppliers s WHERE s.id = _supplier_id
      AND s.organization_id = agreement.organization_id AND s.is_active
  ) THEN RAISE EXCEPTION 'invalid_pilgrimage_supplier_obligation' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.supplier_payment_orders (
    organization_id, pilgrimage_b2b_agreement_id, supplier_id, service_type,
    reference_number, amount, currency, due_date, status, approval_status
  ) VALUES (
    agreement.organization_id, agreement.id, _supplier_id, 'pilgrimage_b2b',
    document, _amount, agreement.currency, _due_date, 'pending', 'pending'
  ) RETURNING id INTO purchase_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_invoices i JOIN public.journal_entries j
      ON j.organization_id = i.organization_id AND j.source_type = 'supplier_invoice'
      AND j.source_id = i.id AND j.status = 'posted'
    WHERE i.payment_order_id = purchase_id AND i.organization_id = agreement.organization_id
      AND j.total_debit = _amount AND j.total_credit = _amount
  ) THEN RAISE EXCEPTION 'pilgrimage_supplier_posting_failed'; END IF;
  RETURN purchase_id;
END;
$$;

-- A payment approval changes authority to disburse. The verified supplier
-- invoice remains payable even if a particular payment approval is declined.
DO $patch$
DECLARE
  definition text := pg_get_functiondef('public.sync_supplier_invoice_from_payment_order()'::regprocedure);
  old_condition text := 'NEW.approval_status = ''rejected'' OR NEW.status = ''cancelled''';
BEGIN
  IF strpos(definition, old_condition) = 0 THEN RAISE EXCEPTION 'Unexpected supplier invoice sync'; END IF;
  EXECUTE replace(definition, old_condition,
    '(NEW.pilgrimage_b2b_agreement_id IS NULL AND NEW.approval_status = ''rejected'') OR NEW.status = ''cancelled''');
END;
$patch$;

CREATE OR REPLACE FUNCTION public._trg_post_supplier_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND NEW.status <> 'cancelled'
    AND public._is_pilgrimage_supplier_order(NEW.payment_order_id)
    AND (NEW.amount, NEW.currency, NEW.exchange_rate, NEW.invoice_date, NEW.booking_id, NEW.supplier_id)
      IS NOT DISTINCT FROM
        (OLD.amount, OLD.currency, OLD.exchange_rate, OLD.invoice_date, OLD.booking_id, OLD.supplier_id)
  THEN RETURN NEW; END IF;
  PERFORM public.post_supplier_invoice(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._trg_post_supplier_invoice() FROM PUBLIC, anon, authenticated;

DO $patch$
DECLARE
  definition text;
  marker text := 'IF NOT public.can_process_org_payments(v_po.organization_id) THEN RAISE EXCEPTION ''Not authorized''; END IF;';
BEGIN
  definition := pg_get_functiondef('public.approve_supplier_payment_order(uuid,boolean,text)'::regprocedure);
  IF strpos(definition, marker) = 0 THEN RAISE EXCEPTION 'Unexpected supplier approval permissions'; END IF;
  EXECUTE replace(definition, marker, marker || $sql$
  IF v_po.pilgrimage_b2b_agreement_id IS NOT NULL
    AND NOT public._has_pilgrimage_finance_permission(v_po.organization_id, 'payments_process')
  THEN RAISE EXCEPTION 'pilgrimage_supplier_payment_denied' USING ERRCODE = '42501'; END IF;
$sql$);

  definition := pg_get_functiondef(
    'public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text)'::regprocedure);
  IF strpos(definition, marker) = 0 THEN RAISE EXCEPTION 'Unexpected supplier payment permissions'; END IF;
  EXECUTE replace(definition, marker, marker || $sql$
  IF v_po.pilgrimage_b2b_agreement_id IS NOT NULL THEN
    IF NOT public._has_pilgrimage_finance_permission(v_po.organization_id, 'payments_process') THEN
      RAISE EXCEPTION 'pilgrimage_supplier_payment_denied' USING ERRCODE = '42501';
    END IF;
    IF _exchange_rate IS DISTINCT FROM 1 OR _amount <> round(_amount, 2)
      OR _currency IS DISTINCT FROM v_po.currency OR _method IS DISTINCT FROM 'bank_transfer'
      OR nullif(btrim(_reference), '') IS NULL OR char_length(btrim(_reference)) > 120
      OR _payment_date IS NULL OR _payment_date NOT BETWEEN v_po.created_at::date AND current_date
      OR NOT EXISTS (SELECT 1 FROM public.bank_accounts b WHERE b.id = _treasury_account_id
        AND b.organization_id = v_po.organization_id AND b.is_active
        AND b.currency = v_po.currency AND b.treasury_kind = 'bank')
    THEN RAISE EXCEPTION 'invalid_pilgrimage_supplier_payment' USING ERRCODE = '22023'; END IF;
    SELECT p.id INTO v_payment_id FROM public.supplier_payments p
    JOIN public.supplier_payment_allocations a ON a.supplier_payment_id = p.id
    WHERE a.payment_order_id = v_po.id AND p.organization_id = v_po.organization_id
      AND lower(btrim(p.reference_number)) = lower(btrim(_reference));
    IF FOUND THEN
      IF EXISTS (SELECT 1 FROM public.supplier_payments p WHERE p.id = v_payment_id
        AND p.amount = _amount AND p.payment_date = _payment_date
        AND p.treasury_account_id = _treasury_account_id AND p.status IN ('paid','completed'))
      THEN RETURN v_payment_id; END IF;
      RAISE EXCEPTION 'pilgrimage_supplier_payment_reference_already_used' USING ERRCODE = '22023';
    END IF;
  END IF;
$sql$);
END;
$patch$;

REVOKE ALL ON FUNCTION public._has_pilgrimage_finance_permission(uuid, text),
  public.create_pilgrimage_supplier_obligation(uuid, uuid, text, numeric, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pilgrimage_supplier_obligation(uuid, uuid, text, numeric, date) TO authenticated;
CREATE TABLE public.pilgrimage_b2b_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  agreement_id uuid NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','rejected','approved')),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  reversal_journal_id uuid REFERENCES public.journal_entries(id),
  credit_note_id uuid REFERENCES public.credit_notes(id),
  refund_id uuid REFERENCES public.refund_requests(id),
  FOREIGN KEY (organization_id, agreement_id)
    REFERENCES public.pilgrimage_b2b_agreements(organization_id, id),
  CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by)
);
CREATE UNIQUE INDEX pilgrimage_cancellation_active_idx
  ON public.pilgrimage_b2b_cancellations(agreement_id) WHERE status IN ('requested','approved');
CREATE INDEX pilgrimage_cancellation_invoice_idx ON public.pilgrimage_b2b_cancellations(invoice_id);
ALTER TABLE public.pilgrimage_b2b_cancellations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilgrimage_b2b_cancellations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pilgrimage_b2b_cancellations TO authenticated;
CREATE POLICY pilgrimage_cancellation_read ON public.pilgrimage_b2b_cancellations
  FOR SELECT TO authenticated USING (public._can_read_pilgrimage_b2b_receivables(organization_id));

-- Keep the original approval attribution on an agreement that is later voided.
DO $patch$
DECLARE approval_constraint text;
BEGIN
  SELECT conname INTO STRICT approval_constraint FROM pg_constraint
  WHERE conrelid = 'public.pilgrimage_b2b_agreements'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%approved_at%approved_by%';
  EXECUTE format('ALTER TABLE public.pilgrimage_b2b_agreements DROP CONSTRAINT %I', approval_constraint);
END;
$patch$;
ALTER TABLE public.pilgrimage_b2b_agreements ADD CONSTRAINT pilgrimage_agreement_approval_audit CHECK (
  (approved_at IS NULL) = (approved_by IS NULL)
  AND (status <> 'approved_internal' OR approved_at IS NOT NULL)
  AND (status <> 'draft' OR approved_at IS NULL)
);

ALTER TABLE public.refund_requests ADD COLUMN pilgrimage_b2b_cancellation_id uuid UNIQUE
  REFERENCES public.pilgrimage_b2b_cancellations(id);

CREATE POLICY pilgrimage_refund_insert ON public.refund_requests AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (pilgrimage_b2b_cancellation_id IS NULL);
CREATE POLICY pilgrimage_refund_update ON public.refund_requests AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (pilgrimage_b2b_cancellation_id IS NULL)
  WITH CHECK (pilgrimage_b2b_cancellation_id IS NULL);
CREATE POLICY pilgrimage_refund_delete ON public.refund_requests AS RESTRICTIVE
  FOR DELETE TO authenticated USING (pilgrimage_b2b_cancellation_id IS NULL);

-- Retain the original journal and allow only the cancellation workflow to
-- close a linked invoice after a reversing journal has been posted.
DO $patch$
DECLARE
  definition text := pg_get_functiondef('public._guard_pilgrimage_b2b_invoice()'::regprocedure);
  marker text := '  IF (to_jsonb(NEW)';
BEGIN
  IF strpos(definition, marker) = 0 THEN RAISE EXCEPTION 'Unexpected B2B invoice guard'; END IF;
  EXECUTE replace(definition, marker, $sql$
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' AND EXISTS (
    SELECT 1 FROM public.pilgrimage_b2b_cancellations c
    JOIN public.journal_entries j ON j.id = c.reversal_journal_id AND j.organization_id = c.organization_id
    WHERE c.invoice_id = OLD.id AND c.status = 'approved' AND j.status = 'posted'
      AND j.source_type = 'pilgrimage_b2b_cancellation' AND j.source_id = c.id
  ) THEN RETURN NEW; END IF;
$sql$ || marker);
END;
$patch$;

-- The core locked-source guard would reject the approved status transition.
-- Keep the existing trigger for all other locked invoices.
DROP TRIGGER trg_guard_locked_invoice_cancellation ON public.invoices;
CREATE TRIGGER trg_guard_locked_invoice_cancellation
  BEFORE UPDATE OF status ON public.invoices FOR EACH ROW
  WHEN (OLD.pilgrimage_b2b_agreement_id IS NULL AND NEW.status IN ('draft','cancelled')
    AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.guard_locked_financial_source('invoice');

DO $patch$
DECLARE
  definition text := pg_get_functiondef('public.issue_pilgrimage_b2b_invoice(uuid,numeric)'::regprocedure);
  marker text := '  IF agreement.status <> ''approved_internal''';
BEGIN
  IF strpos(definition, marker) = 0 THEN RAISE EXCEPTION 'Unexpected B2B issue flow'; END IF;
  EXECUTE replace(definition, marker, $sql$
  IF EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations c
    WHERE c.agreement_id = agreement.id AND c.status IN ('requested','approved')) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_in_progress' USING ERRCODE = '22023';
  END IF;
$sql$ || marker);

  definition := pg_get_functiondef('public._guard_pilgrimage_b2b_payment()'::regprocedure);
  marker := '  IF TG_OP <> ''INSERT'' OR NEW.status';
  IF strpos(definition, marker) = 0 THEN RAISE EXCEPTION 'Unexpected B2B payment guard'; END IF;
  EXECUTE replace(definition, marker, $sql$
  IF EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations c
    WHERE c.agreement_id = invoice.pilgrimage_b2b_agreement_id AND c.status IN ('requested','approved')) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_in_progress' USING ERRCODE = '22023';
  END IF;
$sql$ || marker);
END;
$patch$;

DO $patch$
DECLARE
  definition text := pg_get_functiondef('public.get_pilgrimage_b2b_receivables(uuid,uuid,uuid)'::regprocedure);
  marker text := $sql$    'invoice', CASE WHEN i.id IS NOT NULL THEN jsonb_build_object($sql$;
  status_filter text := $sql$b.status = 'approved_internal'$sql$;
BEGIN
  IF strpos(definition, marker) = 0 OR strpos(definition, status_filter) = 0 THEN
    RAISE EXCEPTION 'Unexpected B2B receivables query';
  END IF;
  definition := replace(definition, status_filter, $sql$b.status IN ('approved_internal','voided')$sql$);
  EXECUTE replace(definition, marker, $sql$
    'sale_id', b.sale_id, 'cancelled', b.status = 'voided',
    'cancellation_pending', EXISTS (SELECT 1 FROM public.pilgrimage_b2b_cancellations c
      WHERE c.agreement_id = b.id AND c.status = 'requested'),
$sql$ || marker);
END;
$patch$;

CREATE FUNCTION public.request_pilgrimage_b2b_cancellation(_sale_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  agreement public.pilgrimage_b2b_agreements%ROWTYPE;
  request public.pilgrimage_b2b_cancellations%ROWTYPE;
  bill_id uuid;
  request_id uuid;
  reason_text text := btrim(_reason);
BEGIN
  SELECT * INTO agreement FROM public.pilgrimage_b2b_agreements
  WHERE sale_id = _sale_id AND public.user_belongs_to_org(auth.uid(), organization_id) FOR UPDATE;
  IF NOT FOUND OR NOT public._has_pilgrimage_finance_permission(agreement.organization_id, 'financial_edit') THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_denied' USING ERRCODE = '42501';
  END IF;
  IF reason_text IS NULL OR char_length(reason_text) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO request FROM public.pilgrimage_b2b_cancellations
  WHERE agreement_id = agreement.id AND status IN ('requested','approved');
  IF FOUND THEN
    IF request.requested_by = auth.uid() AND request.reason = reason_text THEN RETURN request.id; END IF;
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_in_progress' USING ERRCODE = '22023';
  END IF;
  IF agreement.status <> 'approved_internal' THEN
    RAISE EXCEPTION 'approved_pilgrimage_b2b_agreement_required' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO bill_id FROM public.invoices WHERE pilgrimage_b2b_agreement_id = agreement.id FOR UPDATE;
  INSERT INTO public.pilgrimage_b2b_cancellations (organization_id, agreement_id, invoice_id, reason, requested_by)
  VALUES (agreement.organization_id, agreement.id, bill_id, reason_text, auth.uid())
  RETURNING id INTO request_id;
  RETURN request_id;
END;
$$;

CREATE FUNCTION public.review_pilgrimage_b2b_cancellation(_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  request public.pilgrimage_b2b_cancellations%ROWTYPE;
  agreement public.pilgrimage_b2b_agreements%ROWTYPE;
  sale public.pilgrimage_sales%ROWTYPE;
  allocation public.pilgrimage_seat_allocations%ROWTYPE;
  invoice public.invoices%ROWTYPE;
  original public.journal_entries%ROWTYPE;
  original_ar uuid;
  refunds_payable uuid;
  reversal uuid;
  credit_id uuid;
  new_refund_id uuid;
  paid numeric;
  now_at timestamptz := clock_timestamp();
  decision_reason text := nullif(btrim(_reason), '');
BEGIN
  SELECT * INTO request FROM public.pilgrimage_b2b_cancellations
  WHERE id = _id AND public.user_belongs_to_org(auth.uid(), organization_id);
  IF NOT FOUND OR NOT public._has_pilgrimage_finance_permission(request.organization_id, 'payments_refund')
    OR request.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_reviewer_required' USING ERRCODE = '42501';
  END IF;
  IF _approve IS NULL OR (NOT _approve AND decision_reason IS NULL)
    OR char_length(decision_reason) > 1000 THEN
    RAISE EXCEPTION 'pilgrimage_b2b_review_reason_required' USING ERRCODE = '22023';
  END IF;

  -- Preserve the operational quote → program → allocation lock order.
  SELECT * INTO STRICT sale FROM public.pilgrimage_sales
  WHERE organization_id = request.organization_id AND id = (
    SELECT sale_id FROM public.pilgrimage_b2b_agreements WHERE id = request.agreement_id) FOR UPDATE;
  PERFORM 1 FROM public.pilgrimage_programs
    WHERE id = sale.program_id AND organization_id = request.organization_id FOR UPDATE;
  SELECT * INTO STRICT allocation FROM public.pilgrimage_seat_allocations
    WHERE sale_id = sale.id AND organization_id = request.organization_id FOR UPDATE;
  SELECT * INTO STRICT agreement FROM public.pilgrimage_b2b_agreements WHERE id = request.agreement_id FOR UPDATE;
  SELECT * INTO STRICT request FROM public.pilgrimage_b2b_cancellations WHERE id = _id FOR UPDATE;
  IF request.status <> 'requested' THEN
    IF (_approve AND request.status = 'approved') OR (NOT _approve AND request.status = 'rejected') THEN
      RETURN request.id;
    END IF;
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_already_reviewed' USING ERRCODE = '22023';
  END IF;
  IF NOT _approve THEN
    UPDATE public.pilgrimage_b2b_cancellations SET status = 'rejected', reviewed_by = auth.uid(),
      reviewed_at = now_at, review_reason = decision_reason WHERE id = request.id;
    RETURN request.id;
  END IF;
  IF agreement.status <> 'approved_internal' OR sale.status <> 'quoted' OR allocation.status <> 'allocated' THEN
    RAISE EXCEPTION 'pilgrimage_b2b_cancellation_state_changed' USING ERRCODE = '22023';
  END IF;

  IF request.invoice_id IS NOT NULL THEN
    SELECT * INTO STRICT invoice FROM public.invoices WHERE id = request.invoice_id
      AND organization_id = request.organization_id AND pilgrimage_b2b_agreement_id = agreement.id FOR UPDATE;
    SELECT * INTO STRICT original FROM public.journal_entries WHERE organization_id = request.organization_id
      AND source_type = 'invoice' AND source_id = invoice.id AND status = 'posted' AND is_locked;
    SELECT account_id INTO STRICT original_ar FROM public.journal_entry_lines
    WHERE journal_entry_id = original.id AND debit = invoice.final_amount AND credit = 0;
    paid := invoice.total_paid_amount;
    IF paid > 0 THEN
      -- Validate that the collected balances used the same control account as
      -- the original invoice. Route changes require reconciliation first.
      IF EXISTS (
        SELECT 1 FROM public.customer_payment_allocations a
        JOIN public.customer_payments p ON p.id = a.payment_id AND p.status = 'completed'
        WHERE a.invoice_id = invoice.id AND NOT EXISTS (
          SELECT 1 FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id = j.id
          WHERE j.organization_id = request.organization_id AND j.source_type = 'customer_payment'
            AND j.source_id = p.id AND j.status = 'posted' AND l.account_id = original_ar AND l.credit = a.amount
        )
      ) THEN RAISE EXCEPTION 'pilgrimage_b2b_receipts_need_reconciliation' USING ERRCODE = '22023'; END IF;
      refunds_payable := public._resolve_account(request.organization_id, '2050');
      IF refunds_payable IS NULL THEN RAISE EXCEPTION 'pilgrimage_b2b_refund_account_missing'; END IF;
    END IF;

    INSERT INTO public.journal_entries (
      organization_id, entry_number, entry_date, reference_type, reference_id, description,
      total_debit, total_credit, status, currency, source_type, source_id,
      functional_currency, fx_rate, posted_at, auto_generated
    ) VALUES (
      request.organization_id, public._next_entry_number(request.organization_id), current_date,
      'invoice', invoice.id, 'عكس فاتورة الحج والعمرة ' || invoice.invoice_number,
      invoice.final_amount + paid, invoice.final_amount + paid, 'posted', invoice.currency,
      'pilgrimage_b2b_cancellation', request.id, invoice.currency, 1, now_at, true
    ) RETURNING id INTO reversal;

    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit, description, line_order)
    SELECT reversal, account_id, credit, debit, 'عكس: ' || coalesce(description, ''), line_order
    FROM public.journal_entry_lines WHERE journal_entry_id = original.id;
    IF paid > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit, description, line_order)
      VALUES (reversal, original_ar, paid, 0, 'إقفال رصيد الشركة المدينة', 100),
        (reversal, refunds_payable, 0, paid, 'استرداد مستحق لشركة السياحة', 101);
    END IF;
    UPDATE public.journal_entries SET is_locked = true WHERE id = reversal;

    INSERT INTO public.credit_notes (organization_id, party_type, party_id, invoice_id, note_number,
      note_date, amount, currency, exchange_rate, amount_base, reason, status, created_by)
    VALUES (request.organization_id, 'customer', invoice.customer_id, invoice.id,
      'CN-B2B-' || request.id::text, current_date, invoice.final_amount, invoice.currency,
      1, invoice.final_amount, request.reason, 'applied', auth.uid())
    RETURNING id INTO credit_id;

    IF paid > 0 THEN
      INSERT INTO public.refund_requests (organization_id, customer_id, invoice_id,
        pilgrimage_b2b_cancellation_id, amount, currency, exchange_rate, amount_base,
        reason, status, requested_by, approved_by, approved_at, advance_component, sales_return_component)
      VALUES (request.organization_id, invoice.customer_id, invoice.id, request.id, paid, invoice.currency,
        1, paid, request.reason, 'approved', request.requested_by, auth.uid(), now_at, paid, 0)
      RETURNING id INTO new_refund_id;
    END IF;
  END IF;

  UPDATE public.pilgrimage_b2b_cancellations SET status = 'approved', reviewed_by = auth.uid(),
    reviewed_at = now_at, review_reason = decision_reason,
    reversal_journal_id = reversal, credit_note_id = credit_id,
    refund_id = new_refund_id WHERE id = request.id;
  IF invoice.id IS NOT NULL THEN
    UPDATE public.invoices SET status = 'cancelled', remaining_amount = 0 WHERE id = invoice.id;
  END IF;
  UPDATE public.pilgrimage_b2b_agreements SET status = 'voided'
    WHERE id = agreement.id;
  UPDATE public.pilgrimage_seat_allocations SET status = 'released', hold_expires_at = NULL,
    allocated_at = NULL, released_at = now_at, updated_at = now_at, updated_by = auth.uid()
    WHERE id = allocation.id;
  INSERT INTO public.pilgrimage_seat_allocation_events (organization_id, allocation_id, action, actor_id, seat_count)
  VALUES (request.organization_id, allocation.id, 'released', auth.uid(), allocation.seat_count);
  UPDATE public.pilgrimage_sales SET status = 'cancelled' WHERE id = sale.id;
  RETURN request.id;
END;
$$;

CREATE OR REPLACE FUNCTION public._guard_pilgrimage_b2b_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.pilgrimage_b2b_cancellation_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.pilgrimage_b2b_cancellations c JOIN public.invoices i ON i.id = c.invoice_id
      WHERE c.id = NEW.pilgrimage_b2b_cancellation_id AND c.organization_id = NEW.organization_id
        AND i.id = NEW.invoice_id AND i.customer_id = NEW.customer_id
        AND i.currency = NEW.currency AND i.total_paid_amount = NEW.amount
        AND NEW.advance_component = NEW.amount AND NEW.sales_return_component = 0
        AND NEW.booking_id IS NULL AND NEW.source_payment_id IS NULL AND NEW.exchange_rate = 1
    ) AND (
      (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
      (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status = 'paid'
        AND (to_jsonb(NEW) - ARRAY['status','paid_at','treasury_account_id','updated_at'])
          = (to_jsonb(OLD) - ARRAY['status','paid_at','treasury_account_id','updated_at']))
    ) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'invalid_pilgrimage_b2b_refund_transition' USING ERRCODE = '22023';
  END IF;
  IF public._is_pilgrimage_b2b_invoice(NEW.invoice_id, NULL) OR EXISTS (
    SELECT 1 FROM public.customer_payments p
    WHERE p.id = NEW.source_payment_id AND public._is_pilgrimage_b2b_invoice(p.invoice_id, NULL)
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_refund_requires_financial_reversal' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE POLICY pilgrimage_refund_select ON public.refund_requests AS RESTRICTIVE
  FOR SELECT TO authenticated USING (pilgrimage_b2b_cancellation_id IS NULL OR
    public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_credit_note_select ON public.credit_notes AS RESTRICTIVE
  FOR SELECT TO authenticated USING (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL) OR
    public._can_read_pilgrimage_b2b_receivables(organization_id));
CREATE POLICY pilgrimage_credit_note_insert ON public.credit_notes AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL));
CREATE POLICY pilgrimage_credit_note_update ON public.credit_notes AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL))
  WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL));
CREATE POLICY pilgrimage_credit_note_delete ON public.credit_notes AS RESTRICTIVE
  FOR DELETE TO authenticated USING (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL));

-- Reuse the standard disbursement and double-entry posting. A cancellation
-- has already reversed revenue/VAT and established a refund liability.
DO $patch$
DECLARE
  definition text := pg_get_functiondef('public.pay_refund_request(uuid,uuid,text)'::regprocedure);
  previous text := $sql$  IF v_r.status<>'approved' THEN RAISE EXCEPTION 'Refund is not approved'; END IF;
  IF NOT public._can_manage_refunds(v_r.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;$sql$;
BEGIN
  IF strpos(definition, previous) = 0 THEN RAISE EXCEPTION 'Unexpected refund payment authorization'; END IF;
  EXECUTE replace(definition, previous, $sql$
  IF v_r.pilgrimage_b2b_cancellation_id IS NOT NULL THEN
    IF NOT public._has_pilgrimage_finance_permission(v_r.organization_id, 'payments_refund')
      OR NOT public._has_pilgrimage_finance_permission(v_r.organization_id, 'payments_process')
      OR NOT public.can_process_org_payments(v_r.organization_id)
    THEN RAISE EXCEPTION 'pilgrimage_b2b_refund_denied' USING ERRCODE = '42501'; END IF;
    IF nullif(btrim(_reference), '') IS NULL OR char_length(btrim(_reference)) > 120 THEN
      RAISE EXCEPTION 'pilgrimage_b2b_refund_reference_required' USING ERRCODE = '22023';
    END IF;
    IF v_r.status = 'paid' AND v_r.treasury_account_id = _treasury_account_id AND EXISTS (
      SELECT 1 FROM public.bank_account_transactions b WHERE b.organization_id = v_r.organization_id
        AND b.related_invoice_id = v_r.invoice_id AND b.bank_account_id = _treasury_account_id
        AND b.transaction_type = 'refund' AND b.amount = v_r.amount
        AND lower(btrim(b.reference_number)) = lower(btrim(_reference))
    ) THEN RETURN; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.pilgrimage_b2b_cancellations c JOIN public.journal_entry_lines l
        ON l.journal_entry_id = c.reversal_journal_id
      WHERE c.id = v_r.pilgrimage_b2b_cancellation_id AND c.status = 'approved'
        AND l.line_order = 101 AND l.credit = v_r.amount
        AND l.account_id = public._resolve_account(v_r.organization_id, '2050')
    ) THEN RAISE EXCEPTION 'pilgrimage_b2b_refund_requires_financial_reversal' USING ERRCODE = '22023'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.bank_accounts b WHERE b.id = _treasury_account_id
      AND b.organization_id = v_r.organization_id AND b.treasury_kind IN ('bank','cash'))
    THEN RAISE EXCEPTION 'invalid_pilgrimage_b2b_refund_treasury' USING ERRCODE = '22023'; END IF;
  ELSIF NOT public._can_manage_refunds(v_r.organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_r.status <> 'approved' THEN RAISE EXCEPTION 'Refund is not approved'; END IF;
$sql$);
END;
$patch$;

CREATE FUNCTION public.get_pilgrimage_b2b_settlement(_org uuid, _sale_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public._can_read_pilgrimage_b2b_receivables(_org) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'agreement_status', b.status,
    'supplier_orders', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'reference', p.reference_number,
        'supplier', s.name, 'amount', p.amount, 'paid', i.amount_paid,
        'status', p.status, 'approval_status', p.approval_status, 'due_date', p.due_date)
        ORDER BY p.due_date, p.id), '[]'::jsonb)
      FROM public.supplier_payment_orders p
      JOIN public.suppliers s ON s.id = p.supplier_id AND s.organization_id = p.organization_id
      JOIN public.supplier_invoices i ON i.payment_order_id = p.id AND i.organization_id = p.organization_id
      WHERE p.pilgrimage_b2b_agreement_id = b.id AND p.organization_id = _org
    ),
    'cancellation', (
      SELECT jsonb_build_object('id', c.id, 'status', c.status, 'reason', c.reason,
        'review_reason', c.review_reason, 'own_request', c.requested_by = auth.uid(),
        'credit_note', n.note_number, 'refund_id', r.id, 'refund_amount', r.amount,
        'refund_status', r.status)
      FROM public.pilgrimage_b2b_cancellations c
      LEFT JOIN public.credit_notes n ON n.id = c.credit_note_id AND n.organization_id = c.organization_id
      LEFT JOIN public.refund_requests r ON r.id = c.refund_id AND r.organization_id = c.organization_id
      WHERE c.agreement_id = b.id AND c.organization_id = _org
      ORDER BY c.requested_at DESC, c.id DESC LIMIT 1
    )
  ) INTO result
  FROM public.pilgrimage_b2b_agreements b
  WHERE b.sale_id = _sale_id AND b.organization_id = _org AND b.status IN ('approved_internal','voided');
  RETURN result;
END;
$$;

-- Include credit notes in the canonical customer ledger. The invoice and
-- receipt remain visible, and the later cash refund is a separate movement.
DO $patch$
DECLARE
  definition text := pg_get_functiondef('public.get_customer_ledger(uuid,date,date)'::regprocedure);
  old_filter text := 'FROM public.invoices i WHERE i.customer_id=_customer_id AND COALESCE(i.status,''draft'')<>''cancelled''';
  refund_marker text := '    SELECT r.paid_at,';
BEGIN
  IF strpos(definition, old_filter) = 0 OR strpos(definition, refund_marker) = 0 THEN
    RAISE EXCEPTION 'Unexpected customer ledger format';
  END IF;
  definition := replace(definition, old_filter, $sql$FROM public.invoices i
    WHERE i.customer_id=_customer_id AND i.organization_id=v_org AND
      ((i.pilgrimage_b2b_agreement_id IS NULL AND COALESCE(i.status,'draft')<>'cancelled') OR
        (i.pilgrimage_b2b_agreement_id IS NOT NULL AND public._can_read_pilgrimage_b2b_receivables(v_org)))$sql$);
  definition := replace(definition, 'p.customer_id=_customer_id AND p.status=''completed''',
    'p.customer_id=_customer_id AND p.status=''completed'' AND p.organization_id=v_org AND
    (NOT public._is_pilgrimage_b2b_invoice(p.invoice_id, v_org) OR public._can_read_pilgrimage_b2b_receivables(v_org))');
  definition := replace(definition, 'r.customer_id=_customer_id AND r.status=''paid''',
    'r.customer_id=_customer_id AND r.status=''paid'' AND r.organization_id=v_org AND
    (r.pilgrimage_b2b_cancellation_id IS NULL OR public._can_read_pilgrimage_b2b_receivables(v_org))');
  EXECUTE replace(definition, refund_marker, $sql$
    SELECT n.note_date::timestamptz,'credit_note',n.note_number,NULL::uuid,0::numeric,n.amount,n.currency
    FROM public.credit_notes n JOIN public.pilgrimage_b2b_cancellations c ON c.credit_note_id = n.id
    WHERE c.organization_id = v_org AND n.organization_id = v_org AND n.party_id = _customer_id
      AND n.status = 'applied' AND public._can_read_pilgrimage_b2b_receivables(v_org)
      AND (_from IS NULL OR n.note_date >= _from) AND (_to IS NULL OR n.note_date <= _to)
    UNION ALL
$sql$ || refund_marker);
END;
$patch$;

REVOKE ALL ON FUNCTION public.request_pilgrimage_b2b_cancellation(uuid, text),
  public.review_pilgrimage_b2b_cancellation(uuid, boolean, text),
  public.get_pilgrimage_b2b_settlement(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_pilgrimage_b2b_cancellation(uuid, text),
  public.review_pilgrimage_b2b_cancellation(uuid, boolean, text),
  public.get_pilgrimage_b2b_settlement(uuid, uuid) TO authenticated;
COMMIT;
