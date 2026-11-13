-- Apply after the B2B agreement and roster scripts in an isolated environment.
BEGIN;

ALTER TABLE public.invoices
  ADD COLUMN pilgrimage_b2b_agreement_id uuid UNIQUE,
  ADD CONSTRAINT invoices_pilgrimage_b2b_agreement_fk
    FOREIGN KEY (organization_id, pilgrimage_b2b_agreement_id)
    REFERENCES public.pilgrimage_b2b_agreements (organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT invoices_pilgrimage_b2b_customer_check
    CHECK (pilgrimage_b2b_agreement_id IS NULL OR
      (organization_id IS NOT NULL AND customer_id IS NOT NULL AND booking_id IS NULL));

-- Older schemas have a booking existence check that also rejects NULL bookings.
-- Preserve its existing predicate for every other invoice.
DO $migration$
DECLARE booking_check text;
BEGIN
  SELECT pg_get_expr(conbin, conrelid) INTO booking_check
  FROM pg_constraint
  WHERE conrelid = 'public.invoices'::regclass AND conname = 'invoices_booking_id_exists_chk';
  IF booking_check IS NOT NULL THEN
    ALTER TABLE public.invoices DROP CONSTRAINT invoices_booking_id_exists_chk;
    EXECUTE format(
      'ALTER TABLE public.invoices ADD CONSTRAINT invoices_booking_id_exists_chk
       CHECK ((pilgrimage_b2b_agreement_id IS NOT NULL AND booking_id IS NULL) OR (%s)) NOT VALID',
      booking_check);
  END IF;
END;
$migration$;

-- Preserve the core normalization for existing invoices. For an inclusive
-- B2B quote, round VAT from gross and use the remainder as the net amount.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.normalize_invoice_totals()'::regprocedure);
  previous text := 'NEW.vat_amount := round(v_net * NEW.vat_rate / 100, 2);';
  replacement text := $rule$IF NEW.pilgrimage_b2b_agreement_id IS NULL THEN
    NEW.vat_amount := round(v_net * NEW.vat_rate / 100, 2);
  ELSE
    SELECT b.total_contract_amount - v_net INTO STRICT NEW.vat_amount
    FROM public.pilgrimage_b2b_agreements b
    WHERE b.id = NEW.pilgrimage_b2b_agreement_id AND b.organization_id = NEW.organization_id;
  END IF;$rule$;
BEGIN
  IF strpos(definition, replacement) > 0 THEN RETURN; END IF;
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Unexpected formula in normalize_invoice_totals';
  END IF;
  EXECUTE replace(definition, previous, replacement);
END;
$migration$;

CREATE FUNCTION public._can_read_pilgrimage_b2b_receivables(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT auth.uid() IS NOT NULL
    AND public.user_belongs_to_org(auth.uid(), _organization_id)
    AND EXISTS (
      SELECT 1 FROM public._org_permission_state(_organization_id, auth.uid(), 'invoices_view')
      WHERE granted AND data_scope = 'organization'
    )
    AND EXISTS (
      SELECT 1 FROM public._org_permission_state(_organization_id, auth.uid(), 'financial_view')
      WHERE granted AND data_scope = 'organization'
    );
$fn$;
REVOKE ALL ON FUNCTION public._can_read_pilgrimage_b2b_receivables(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_read_pilgrimage_b2b_receivables(uuid) TO authenticated;

CREATE POLICY pilgrimage_b2b_invoice_select ON public.invoices AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    pilgrimage_b2b_agreement_id IS NULL OR public._can_read_pilgrimage_b2b_receivables(organization_id)
  );
CREATE POLICY pilgrimage_b2b_invoice_insert ON public.invoices AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (pilgrimage_b2b_agreement_id IS NULL);
CREATE POLICY pilgrimage_b2b_invoice_update ON public.invoices AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (pilgrimage_b2b_agreement_id IS NULL)
  WITH CHECK (pilgrimage_b2b_agreement_id IS NULL);
CREATE POLICY pilgrimage_b2b_invoice_delete ON public.invoices AS RESTRICTIVE
  FOR DELETE TO authenticated USING (pilgrimage_b2b_agreement_id IS NULL);

CREATE FUNCTION public._guard_pilgrimage_b2b_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_requires_reversal' USING ERRCODE = '22023';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['updated_at', 'status', 'payment_status', 'total_paid_amount', 'remaining_amount'])
      IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['updated_at', 'status', 'payment_status', 'total_paid_amount', 'remaining_amount'])
     OR coalesce(NEW.status, '') NOT IN ('sent', 'paid') THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_requires_reversal' USING ERRCODE = '22023';
  END IF;

  -- The legacy receipt RPC updates the invoice before completing the payment.
  -- Only completed allocations may move this invoice's balance.
  SELECT coalesce(sum(a.amount), 0) INTO NEW.total_paid_amount
  FROM public.customer_payment_allocations a
  JOIN public.customer_payments p ON p.id = a.payment_id
  WHERE a.invoice_id = OLD.id AND a.organization_id = OLD.organization_id
    AND p.organization_id = OLD.organization_id AND p.status = 'completed';
  NEW.status := CASE WHEN NEW.total_paid_amount = OLD.final_amount THEN 'paid' ELSE 'sent' END;
  NEW.remaining_amount := OLD.final_amount - NEW.total_paid_amount;
  NEW.payment_status := CASE WHEN NEW.total_paid_amount = OLD.final_amount THEN 'paid'
    WHEN NEW.total_paid_amount > 0 THEN 'partial' ELSE 'unpaid' END;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER aa_guard_pilgrimage_b2b_invoice
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW WHEN (OLD.pilgrimage_b2b_agreement_id IS NOT NULL)
  EXECUTE FUNCTION public._guard_pilgrimage_b2b_invoice();

CREATE FUNCTION public._guard_pilgrimage_b2b_quote_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pilgrimage_b2b_agreements b
    WHERE b.sale_id = OLD.id AND b.organization_id = OLD.organization_id
      AND b.status = 'approved_internal'
  ) THEN
    RAISE EXCEPTION 'approved_b2b_requires_managed_release_and_finance_review'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER guard_pilgrimage_b2b_quote_cancellation
  BEFORE UPDATE OF status ON public.pilgrimage_sales FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled'
    AND OLD.sale_model = 'b2b_group')
  EXECUTE FUNCTION public._guard_pilgrimage_b2b_quote_cancellation();

CREATE FUNCTION public.issue_pilgrimage_b2b_invoice(_agreement_id uuid, _vat_rate numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  actor uuid := auth.uid();
  agreement public.pilgrimage_b2b_agreements%ROWTYPE;
  sale public.pilgrimage_sales%ROWTYPE;
  invoice public.invoices%ROWTYPE;
  debtor_name text;
  last_due_date date;
  net_amount numeric;
BEGIN
  SELECT * INTO agreement FROM public.pilgrimage_b2b_agreements
  WHERE id = _agreement_id;
  IF NOT FOUND OR actor IS NULL
    OR NOT coalesce(public.can_org_write(agreement.organization_id), false)
    OR NOT public._can_read_pilgrimage_b2b_receivables(agreement.organization_id)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(agreement.organization_id, actor, 'invoices_create')
      WHERE granted AND data_scope = 'organization'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(agreement.organization_id, actor, 'invoices_send')
      WHERE granted AND data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Same quote → agreement lock order as commercial approval and cancellation.
  SELECT * INTO STRICT sale FROM public.pilgrimage_sales
  WHERE id = agreement.sale_id AND organization_id = agreement.organization_id FOR UPDATE;
  SELECT * INTO STRICT agreement FROM public.pilgrimage_b2b_agreements
  WHERE id = _agreement_id AND organization_id = sale.organization_id FOR UPDATE;

  SELECT * INTO invoice FROM public.invoices WHERE pilgrimage_b2b_agreement_id = agreement.id;
  IF FOUND THEN
    IF invoice.vat_rate IS DISTINCT FROM _vat_rate THEN
      RAISE EXCEPTION 'pilgrimage_b2b_invoice_tax_already_set' USING ERRCODE = '22023';
    END IF;
    RETURN invoice.id;
  END IF;
  IF agreement.status <> 'approved_internal' OR sale.status <> 'quoted'
    OR sale.sale_model <> 'b2b_group' THEN
    RAISE EXCEPTION 'approved_pilgrimage_b2b_agreement_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_settings s
    WHERE s.organization_id = agreement.organization_id AND upper(s.currency) = agreement.currency
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_requires_company_currency' USING ERRCODE = '22023';
  END IF;
  SELECT name INTO debtor_name FROM public.customers
  WHERE id = agreement.debtor_customer_id AND organization_id = agreement.organization_id
    AND archived_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_pilgrimage_b2b_debtor_required' USING ERRCODE = '22023';
  END IF;
  SELECT max(due_date) INTO last_due_date FROM public.pilgrimage_b2b_installments
  WHERE agreement_id = agreement.id AND organization_id = agreement.organization_id;
  IF _vat_rate IS NULL OR _vat_rate NOT BETWEEN 0 AND 100 OR _vat_rate <> round(_vat_rate, 2) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_vat_rate_required' USING ERRCODE = '22023';
  END IF;

  net_amount := agreement.total_contract_amount
    - round(agreement.total_contract_amount * _vat_rate / (100 + _vat_rate), 2);

  INSERT INTO public.invoices (
    organization_id, pilgrimage_b2b_agreement_id, invoice_number, customer_id, customer_name,
    currency, subtotal, vat_rate, issued_date, due_date, status, created_by, notes
  ) VALUES (
    agreement.organization_id, agreement.id, 'INV-B2B-' || agreement.id::text,
    agreement.debtor_customer_id, debtor_name, agreement.currency, net_amount, _vat_rate,
    current_date, last_due_date, 'sent', actor, sale.name
  ) RETURNING * INTO invoice;

  IF invoice.final_amount IS DISTINCT FROM agreement.total_contract_amount OR NOT EXISTS (
    SELECT 1 FROM public.journal_entries j WHERE j.organization_id = agreement.organization_id
      AND j.source_type = 'invoice' AND j.source_id = invoice.id
      AND j.status = 'posted' AND j.total_debit = invoice.final_amount
      AND j.total_credit = invoice.final_amount AND j.currency = agreement.currency
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_posting_failed';
  END IF;
  -- The approved invoice journal remains stable when collection marks it paid.
  UPDATE public.journal_entries SET is_locked = true
  WHERE organization_id = agreement.organization_id AND source_type = 'invoice' AND source_id = invoice.id;
  RETURN invoice.id;
END;
$fn$;

CREATE FUNCTION public._guard_pilgrimage_b2b_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE invoice public.invoices%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = OLD.invoice_id AND i.pilgrimage_b2b_agreement_id IS NOT NULL
  ) THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'completed'
      AND (to_jsonb(NEW) - ARRAY['status', 'updated_at']) =
          (to_jsonb(OLD) - ARRAY['status', 'updated_at'])
      AND EXISTS (
        SELECT 1 FROM public.customer_payment_allocations a WHERE a.payment_id = OLD.id
          AND a.invoice_id = OLD.invoice_id AND a.organization_id = OLD.organization_id
          AND a.amount = OLD.amount
      ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'pilgrimage_b2b_receipt_requires_reversal' USING ERRCODE = '22023';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  SELECT * INTO invoice FROM public.invoices
  WHERE id = NEW.invoice_id AND pilgrimage_b2b_agreement_id IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF TG_OP <> 'INSERT' OR NEW.status <> 'pending'
    OR NEW.organization_id IS DISTINCT FROM invoice.organization_id
    OR NEW.customer_id IS DISTINCT FROM invoice.customer_id OR NEW.booking_id IS NOT NULL
    OR NEW.currency IS DISTINCT FROM invoice.currency OR NEW.exchange_rate IS DISTINCT FROM 1
    OR NEW.amount > invoice.remaining_amount OR NEW.is_demo
    OR NEW.payment_date NOT BETWEEN invoice.issued_date AND current_date
    OR NEW.payment_method NOT IN ('cash', 'bank_transfer') OR NEW.treasury_account_id IS NULL
    OR nullif(btrim(NEW.reference_number), '') IS NULL
    OR NEW.client_ref IS DISTINCT FROM ('pilgrimage-b2b:' || invoice.id::text || ':' || lower(btrim(NEW.reference_number)))
    OR NOT coalesce(public.can_process_org_payments(invoice.organization_id), false)
    OR NOT public._can_read_pilgrimage_b2b_receivables(invoice.organization_id)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(invoice.organization_id, auth.uid(), 'payments_process')
      WHERE granted AND data_scope = 'organization'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.bank_accounts b WHERE b.id = NEW.treasury_account_id
        AND b.organization_id = invoice.organization_id AND b.currency = invoice.currency
        AND b.is_active AND b.treasury_kind = CASE NEW.payment_method WHEN 'cash' THEN 'cash' ELSE 'bank' END
    ) THEN
    RAISE EXCEPTION 'invalid_pilgrimage_b2b_collection' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER guard_pilgrimage_b2b_payment
  BEFORE INSERT OR UPDATE OR DELETE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public._guard_pilgrimage_b2b_payment();

CREATE FUNCTION public._guard_pilgrimage_b2b_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF TG_OP <> 'INSERT' AND EXISTS (
    SELECT 1 FROM public.customer_payments p JOIN public.invoices i ON i.id = p.invoice_id
    WHERE p.id = OLD.payment_id AND i.pilgrimage_b2b_agreement_id IS NOT NULL
    UNION ALL
    SELECT 1 FROM public.invoices i WHERE i.id = OLD.invoice_id AND i.pilgrimage_b2b_agreement_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_receipt_requires_reversal' USING ERRCODE = '22023';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF EXISTS (
    SELECT 1 FROM public.customer_payments p JOIN public.invoices i ON i.id = p.invoice_id
    WHERE p.id = NEW.payment_id AND i.pilgrimage_b2b_agreement_id IS NOT NULL
    UNION ALL
    SELECT 1 FROM public.invoices i WHERE i.id = NEW.invoice_id AND i.pilgrimage_b2b_agreement_id IS NOT NULL
  ) AND (TG_OP <> 'INSERT' OR NOT EXISTS (
    SELECT 1 FROM public.customer_payments p JOIN public.invoices i ON i.id = p.invoice_id
    WHERE p.id = NEW.payment_id AND p.status = 'pending' AND p.invoice_id = NEW.invoice_id
      AND i.pilgrimage_b2b_agreement_id IS NOT NULL AND p.organization_id = NEW.organization_id
      AND p.amount = NEW.amount
      AND NOT EXISTS (SELECT 1 FROM public.customer_payment_allocations a WHERE a.payment_id = p.id)
  )) THEN
    RAISE EXCEPTION 'invalid_pilgrimage_b2b_allocation' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER guard_pilgrimage_b2b_allocation
  BEFORE INSERT OR UPDATE OR DELETE ON public.customer_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public._guard_pilgrimage_b2b_allocation();

-- Existing generic table grants must not allow callers to create pending
-- receipts themselves or to use another receipt to settle this invoice.
CREATE FUNCTION public._is_pilgrimage_b2b_invoice(_invoice_id uuid, _organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE id = _invoice_id AND (_organization_id IS NULL OR organization_id = _organization_id)
      AND pilgrimage_b2b_agreement_id IS NOT NULL
  );
$fn$;
REVOKE ALL ON FUNCTION public._is_pilgrimage_b2b_invoice(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._is_pilgrimage_b2b_invoice(uuid, uuid) TO authenticated;
CREATE POLICY pilgrimage_b2b_payment_select ON public.customer_payments AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id)
    OR public._can_read_pilgrimage_b2b_receivables(organization_id)
  );
CREATE POLICY pilgrimage_b2b_allocation_select ON public.customer_payment_allocations AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id)
    OR public._can_read_pilgrimage_b2b_receivables(organization_id)
  );
CREATE POLICY pilgrimage_b2b_payment_insert ON public.customer_payments AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id));
CREATE POLICY pilgrimage_b2b_payment_update ON public.customer_payments AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id))
  WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id));
CREATE POLICY pilgrimage_b2b_allocation_insert ON public.customer_payment_allocations AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, organization_id));

CREATE FUNCTION public._guard_pilgrimage_b2b_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF public._is_pilgrimage_b2b_invoice(NEW.invoice_id, NULL) OR EXISTS (
    SELECT 1 FROM public.customer_payments p
    WHERE p.id = NEW.source_payment_id AND public._is_pilgrimage_b2b_invoice(p.invoice_id, NULL)
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_refund_requires_financial_reversal' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER guard_pilgrimage_b2b_refund
  BEFORE INSERT OR UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public._guard_pilgrimage_b2b_refund();

-- Some deployments still expose the legacy invoice_payments table.
DO $migration$
BEGIN
  IF to_regclass('public.invoice_payments') IS NOT NULL THEN
    ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY pilgrimage_b2b_legacy_receipt_insert ON public.invoice_payments AS RESTRICTIVE
      FOR INSERT TO authenticated WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL));
    CREATE POLICY pilgrimage_b2b_legacy_receipt_update ON public.invoice_payments AS RESTRICTIVE
      FOR UPDATE TO authenticated USING (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL))
      WITH CHECK (NOT public._is_pilgrimage_b2b_invoice(invoice_id, NULL));
  END IF;
END;
$migration$;

-- Use the cash route for cash received into a physical cash treasury, as the
-- canonical journal already does. Leave the other payment methods unchanged.
DO $migration$
DECLARE
  definition text := pg_get_functiondef(
    'public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid)'::regprocedure);
  previous text := $rule$CASE WHEN _method='cash' AND _treasury_account_id IS NULL THEN 'cash' ELSE 'bank' END$rule$;
  replacement text := $rule$CASE WHEN _method='cash' AND (_treasury_account_id IS NULL OR EXISTS (
      SELECT 1 FROM public.bank_accounts b
      JOIN public.invoices i ON i.id=_invoice_id AND i.organization_id=v_org
        AND i.pilgrimage_b2b_agreement_id IS NOT NULL
      WHERE b.id=_treasury_account_id AND b.organization_id=v_org AND b.treasury_kind='cash'
    )) THEN 'cash' ELSE 'bank' END$rule$;
BEGIN
  IF strpos(definition, replacement) > 0 THEN RETURN; END IF;
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Unexpected cash routing in record_customer_payment';
  END IF;
  EXECUTE replace(definition, previous, replacement);
END;
$migration$;

CREATE FUNCTION public.record_pilgrimage_b2b_collection(
  _invoice_id uuid, _amount numeric, _method text, _treasury_account_id uuid,
  _payment_date date, _reference text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  invoice public.invoices%ROWTYPE;
  receipt public.customer_payments%ROWTYPE;
  receipt_id uuid;
  receipt_ref text := btrim(_reference);
  client_key text;
BEGIN
  SELECT * INTO invoice FROM public.invoices
  WHERE id = _invoice_id AND pilgrimage_b2b_agreement_id IS NOT NULL
    AND public.user_belongs_to_org(auth.uid(), organization_id) FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(public.can_process_org_payments(invoice.organization_id), false)
    OR NOT public._can_read_pilgrimage_b2b_receivables(invoice.organization_id)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(invoice.organization_id, auth.uid(), 'payments_process')
      WHERE granted AND data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_collection_not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount <> round(_amount, 2)
    OR _method IS NULL OR _method NOT IN ('cash', 'bank_transfer')
    OR _treasury_account_id IS NULL OR _payment_date IS NULL
    OR receipt_ref IS NULL OR char_length(receipt_ref) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'invalid_pilgrimage_b2b_collection' USING ERRCODE = '22023';
  END IF;
  client_key := 'pilgrimage-b2b:' || invoice.id::text || ':' || lower(receipt_ref);
  SELECT * INTO receipt FROM public.customer_payments
  WHERE organization_id = invoice.organization_id AND client_ref = client_key;
  IF FOUND THEN
    IF receipt.invoice_id = invoice.id AND receipt.status = 'completed'
      AND receipt.amount = _amount AND receipt.payment_method = _method
      AND receipt.payment_date = _payment_date AND receipt.treasury_account_id = _treasury_account_id
      AND lower(receipt.reference_number) = lower(receipt_ref) THEN RETURN receipt.id; END IF;
    RAISE EXCEPTION 'pilgrimage_b2b_receipt_reference_already_used' USING ERRCODE = '22023';
  END IF;
  IF _amount > invoice.remaining_amount THEN
    RAISE EXCEPTION 'pilgrimage_b2b_collection_exceeds_balance' USING ERRCODE = '22023';
  END IF;

  receipt_id := public.record_customer_payment(invoice.id, _amount, invoice.currency, 1,
    _method, _treasury_account_id, _payment_date, receipt_ref, NULL, client_key, NULL, NULL);
  IF NOT EXISTS (
    SELECT 1 FROM public.journal_entries j WHERE j.organization_id = invoice.organization_id
      AND j.source_type = 'customer_payment' AND j.source_id = receipt_id
      AND j.status = 'posted' AND j.currency = invoice.currency
      AND j.total_debit = _amount AND j.total_credit = _amount
  ) OR NOT EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = invoice.id
      AND i.remaining_amount = invoice.remaining_amount - _amount
  ) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_collection_posting_failed';
  END IF;
  RETURN receipt_id;
END;
$fn$;

CREATE FUNCTION public.get_pilgrimage_b2b_receivables(
  _organization_id uuid, _sale_id uuid DEFAULT NULL, _invoice_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE result jsonb;
BEGIN
  IF NOT public._can_read_pilgrimage_b2b_receivables(_organization_id) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_invoice_not_authorized' USING ERRCODE = '42501';
  END IF;
  IF (_sale_id IS NULL) = (_invoice_id IS NULL) THEN
    RAISE EXCEPTION 'pilgrimage_b2b_receivables_reference_required' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object(
    'agreement_id', b.id, 'customer_id', b.debtor_customer_id, 'total', b.total_contract_amount,
    'invoice', CASE WHEN i.id IS NOT NULL THEN jsonb_build_object(
      'id', i.id, 'number', i.invoice_number, 'paid', i.total_paid_amount,
      'remaining', i.remaining_amount, 'issued_date', i.issued_date) END,
    'receipts', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'date', p.payment_date,
        'amount', a.amount, 'reference', p.reference_number, 'method', p.payment_method)
        ORDER BY p.payment_date, p.id), '[]'::jsonb)
      FROM public.customer_payment_allocations a
      JOIN public.customer_payments p ON p.id = a.payment_id AND p.organization_id = a.organization_id
      WHERE a.invoice_id = i.id AND a.organization_id = b.organization_id AND p.status = 'completed'
    ),
    'installments', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('sequence_no', x.sequence_no,
        'due_date', x.due_date, 'amount', x.amount) ORDER BY x.due_date, x.sequence_no), '[]'::jsonb)
      FROM public.pilgrimage_b2b_installments x
      WHERE x.agreement_id = b.id AND x.organization_id = b.organization_id
    )
  ) INTO result
  FROM public.pilgrimage_b2b_agreements b
  LEFT JOIN public.invoices i ON i.pilgrimage_b2b_agreement_id = b.id
    AND i.organization_id = b.organization_id
  WHERE b.organization_id = _organization_id AND b.status = 'approved_internal'
    AND (b.sale_id = _sale_id OR i.id = _invoice_id);
  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public._guard_pilgrimage_b2b_invoice(),
  public._guard_pilgrimage_b2b_quote_cancellation(), public._guard_pilgrimage_b2b_payment(),
  public._guard_pilgrimage_b2b_allocation(), public._guard_pilgrimage_b2b_refund()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_pilgrimage_b2b_invoice(uuid, numeric),
  public.record_pilgrimage_b2b_collection(uuid, numeric, text, uuid, date, text),
  public.get_pilgrimage_b2b_receivables(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_pilgrimage_b2b_invoice(uuid, numeric),
  public.record_pilgrimage_b2b_collection(uuid, numeric, text, uuid, date, text),
  public.get_pilgrimage_b2b_receivables(uuid, uuid, uuid) TO authenticated;
COMMIT;
