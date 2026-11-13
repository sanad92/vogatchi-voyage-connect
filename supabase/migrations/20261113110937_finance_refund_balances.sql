BEGIN;

CREATE SCHEMA IF NOT EXISTS refund_balance_private;
REVOKE ALL ON SCHEMA refund_balance_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA refund_balance_private TO authenticated;

CREATE TABLE public.supplier_refund_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_invoice_id uuid NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  exchange_rate numeric(14,6) NOT NULL CHECK (exchange_rate > 0),
  reference text NOT NULL CHECK (length(reference) BETWEEN 1 AND 200),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid,
  confirmed_at timestamptz,
  rejected_at timestamptz,
  rejected_by uuid,
  UNIQUE (organization_id, supplier_id, reference)
);
CREATE INDEX supplier_refund_claims_source_idx ON public.supplier_refund_claims (supplier_invoice_id);
CREATE INDEX supplier_refund_claims_org_idx ON public.supplier_refund_claims (organization_id, supplier_id);

CREATE TABLE public.refund_balance_settlements (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  customer_refund_id uuid REFERENCES public.refund_requests(id) ON DELETE RESTRICT,
  supplier_claim_id uuid REFERENCES public.supplier_refund_claims(id) ON DELETE RESTRICT,
  treasury_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  supplier_invoice_id uuid REFERENCES public.supplier_invoices(id) ON DELETE RESTRICT,
  supplier_order_id uuid REFERENCES public.supplier_payment_orders(id) ON DELETE RESTRICT,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  bank_transaction_id uuid REFERENCES public.bank_account_transactions(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  reference text CHECK (length(reference) BETWEEN 1 AND 200),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(customer_refund_id, supplier_claim_id) = 1),
  CHECK (num_nonnulls(treasury_account_id, invoice_id, supplier_invoice_id) = 1),
  CHECK ((supplier_invoice_id IS NULL) = (supplier_order_id IS NULL)),
  CHECK (invoice_id IS NULL OR customer_refund_id IS NOT NULL),
  CHECK (supplier_invoice_id IS NULL OR supplier_claim_id IS NOT NULL),
  CHECK ((treasury_account_id IS NULL) = (bank_transaction_id IS NULL))
);
CREATE INDEX refund_settlements_org_idx ON public.refund_balance_settlements (organization_id, created_at DESC);
CREATE INDEX refund_settlements_customer_idx ON public.refund_balance_settlements (customer_refund_id) WHERE customer_refund_id IS NOT NULL;
CREATE INDEX refund_settlements_supplier_idx ON public.refund_balance_settlements (supplier_claim_id) WHERE supplier_claim_id IS NOT NULL;
CREATE INDEX refund_settlements_invoice_idx ON public.refund_balance_settlements (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX refund_settlements_supplier_invoice_idx ON public.refund_balance_settlements (supplier_invoice_id) WHERE supplier_invoice_id IS NOT NULL;
CREATE INDEX refund_settlements_order_idx ON public.refund_balance_settlements (supplier_order_id) WHERE supplier_order_id IS NOT NULL;
CREATE UNIQUE INDEX refund_settlements_bank_idx ON public.refund_balance_settlements (bank_transaction_id) WHERE bank_transaction_id IS NOT NULL;

CREATE FUNCTION refund_balance_private.can_read(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_platform_admin(auth.uid()) OR EXISTS (
      SELECT FROM public._org_permission_state(_org, auth.uid(), 'financial_view')
      WHERE granted AND data_scope = 'organization'
    )
  );
$$;
REVOKE ALL ON FUNCTION refund_balance_private.can_read(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_balance_private.can_read(uuid) TO authenticated;

ALTER TABLE public.supplier_refund_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_balance_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supplier_refund_claims, public.refund_balance_settlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.supplier_refund_claims, public.refund_balance_settlements TO authenticated;
CREATE POLICY read_supplier_refund_claims ON public.supplier_refund_claims FOR SELECT TO authenticated
  USING (refund_balance_private.can_read(organization_id));
CREATE POLICY read_refund_settlements ON public.refund_balance_settlements FOR SELECT TO authenticated
  USING (refund_balance_private.can_read(organization_id));

-- Browser clients already create and review refunds through RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.refund_requests FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS rr_read ON public.refund_requests;
CREATE POLICY rr_read ON public.refund_requests FOR SELECT TO authenticated
  USING (refund_balance_private.can_read(organization_id));

CREATE FUNCTION refund_balance_private.can_operate(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND coalesce(public.can_org_write(_org), false)
    AND refund_balance_private.can_read(_org)
    AND (public.is_platform_admin(auth.uid()) OR EXISTS (
      SELECT FROM public._org_permission_state(_org, auth.uid(), 'payments_process')
      WHERE granted AND data_scope = 'organization'
    ));
$$;

CREATE FUNCTION refund_balance_private.post(
  _org uuid, _source text, _id uuid, _booking uuid, _currency text, _rate numeric,
  _debits uuid[], _amounts numeric[], _credit uuid, _memo text
)
RETURNS uuid LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_total numeric;
BEGIN
  IF _credit IS NULL OR array_position(_debits, NULL) IS NOT NULL OR _credit = ANY (_debits)
     OR EXISTS (
       SELECT FROM unnest(array_append(_debits, _credit)) AS selected(id)
       WHERE NOT EXISTS (SELECT FROM public.chart_of_accounts a WHERE a.id = selected.id AND a.organization_id = _org)
     ) THEN
    RAISE EXCEPTION 'Refund accounts are missing or overlap';
  END IF;
  SELECT sum(amount) INTO v_total FROM unnest(_amounts) AS items(amount);
  IF NOT (v_total > 0) OR cardinality(_debits) <> cardinality(_amounts) THEN
    RAISE EXCEPTION 'Invalid refund journal amounts';
  END IF;

  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id, description,
    total_debit, total_credit, status, currency, source_type, source_id, booking_id,
    functional_currency, fx_rate, posted_at, auto_generated
  ) VALUES (
    _org, public._next_entry_number(_org), CURRENT_DATE, _source, _id, _memo,
    v_total, v_total, 'posted', _currency, _source, _id, _booking, _currency, _rate, now(), true
  ) RETURNING id INTO v_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit, line_order, description)
  SELECT v_id, item.account_id, item.amount, 0, item.line_no, _memo
  FROM unnest(_debits, _amounts) WITH ORDINALITY AS item(account_id, amount, line_no)
  WHERE item.amount > 0
  UNION ALL
  SELECT v_id, _credit, 0, v_total, cardinality(_debits) + 1, _memo;
  UPDATE public.journal_entries SET is_locked = true WHERE id = v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION refund_balance_private.recognize_customer(_refund public.refund_requests)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_vat numeric := 0;
  v_returns uuid;
  v_tax uuid;
  v_payable uuid;
BEGIN
  IF _refund.sales_return_component <= 0 OR EXISTS (
    SELECT FROM public.journal_entries
    WHERE organization_id = _refund.organization_id AND source_type = 'customer_refund_due' AND source_id = _refund.id
  ) THEN
    RETURN;
  END IF;

  SELECT coalesce(least(_refund.sales_return_component,
      round(_refund.sales_return_component * i.vat_amount / nullif(i.final_amount, 0), 2)), 0)
  INTO v_vat
  FROM public.invoices i
  WHERE i.id = _refund.invoice_id AND i.organization_id = _refund.organization_id;
  v_vat := coalesce(v_vat, 0);

  v_payable := public.get_org_account_route(_refund.organization_id, 'refunds_payable');
  v_returns := public.get_org_account_route(_refund.organization_id, 'sales_returns');
  v_tax := CASE WHEN v_vat > 0 THEN public.get_org_account_route(_refund.organization_id, 'tax_payable') ELSE v_returns END;
  PERFORM refund_balance_private.post(
    _refund.organization_id, 'customer_refund_due', _refund.id, _refund.booking_id,
    _refund.currency, _refund.exchange_rate, ARRAY[v_returns, v_tax],
    ARRAY[_refund.sales_return_component - v_vat, v_vat], v_payable, 'اعتماد استرداد العميل'
  );
END;
$$;

CREATE FUNCTION refund_balance_private.supplier_claim(
  _org uuid, _id uuid, _invoice uuid, _amount numeric, _reference text, _action text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_claim public.supplier_refund_claims%ROWTYPE;
  v_invoice public.supplier_invoices%ROWTYPE;
  v_expense uuid;
  v_prior numeric;
  v_confirmed_paid numeric;
BEGIN
  IF NOT refund_balance_private.can_operate(_org) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _id IS NULL OR _action IS NULL OR _action NOT IN ('create', 'confirm', 'reject') THEN
    RAISE EXCEPTION 'Invalid supplier refund action';
  END IF;

  IF _action = 'create' THEN
    SELECT * INTO STRICT v_invoice FROM public.supplier_invoices
    WHERE id = _invoice AND organization_id = _org FOR UPDATE;
    IF _amount IS NULL OR _amount <= 0 OR _amount >= 1e12 OR round(_amount, 2) <> _amount
       OR nullif(btrim(_reference), '') IS NULL OR v_invoice.supplier_id IS NULL
       OR v_invoice.status = 'cancelled' OR coalesce(v_invoice.amount_paid, 0) < _amount
       OR to_jsonb(v_invoice)->>'pilgrimage_b2b_agreement_id' IS NOT NULL
       OR NOT EXISTS (SELECT FROM public.suppliers WHERE id = v_invoice.supplier_id AND organization_id = _org) THEN
      RAISE EXCEPTION 'Select a paid supplier invoice and provide the refund amount and reference';
    END IF;
    INSERT INTO public.supplier_refund_claims (
      id, organization_id, supplier_id, supplier_invoice_id, amount, currency, exchange_rate, reference, created_by
    ) VALUES (
      _id, _org, v_invoice.supplier_id, _invoice, _amount, v_invoice.currency, v_invoice.exchange_rate, btrim(_reference), auth.uid()
    ) ON CONFLICT (id) DO NOTHING;
    IF FOUND THEN RETURN _id; END IF;
  END IF;

  SELECT * INTO STRICT v_claim FROM public.supplier_refund_claims
  WHERE id = _id AND organization_id = _org FOR UPDATE;
  IF _action = 'create' THEN
    IF (v_claim.supplier_invoice_id, v_claim.amount, v_claim.reference)
       IS DISTINCT FROM (_invoice, _amount, btrim(_reference)) THEN
      RAISE EXCEPTION 'Refund request reference was already used';
    END IF;
    RETURN _id;
  END IF;
  IF (_action = 'confirm' AND v_claim.confirmed_at IS NOT NULL)
     OR (_action = 'reject' AND v_claim.rejected_at IS NOT NULL) THEN
    RETURN _id;
  END IF;
  IF v_claim.confirmed_at IS NOT NULL OR v_claim.rejected_at IS NOT NULL THEN
    RAISE EXCEPTION 'Only pending claims can be reviewed';
  END IF;
  IF _action = 'reject' THEN
    UPDATE public.supplier_refund_claims SET rejected_at = now(), rejected_by = auth.uid() WHERE id = _id;
    RETURN _id;
  END IF;

  SELECT * INTO STRICT v_invoice FROM public.supplier_invoices
  WHERE id = v_claim.supplier_invoice_id AND organization_id = _org FOR UPDATE;
  SELECT coalesce(sum(amount), 0) INTO v_prior
  FROM public.supplier_refund_claims
  WHERE supplier_invoice_id = v_invoice.id AND confirmed_at IS NOT NULL;
  SELECT coalesce(sum(a.amount), 0) INTO v_confirmed_paid
  FROM public.supplier_payment_allocations a
  JOIN public.supplier_payments p ON p.id = a.supplier_payment_id
    AND p.organization_id = _org AND p.supplier_id = v_claim.supplier_id
    AND p.status IN ('paid', 'completed') AND coalesce(p.currency, 'EGP') = v_claim.currency
  WHERE a.supplier_invoice_id = v_invoice.id AND a.organization_id = _org;
  IF v_invoice.status = 'cancelled' OR v_invoice.supplier_id IS DISTINCT FROM v_claim.supplier_id
     OR v_invoice.currency <> v_claim.currency OR v_invoice.exchange_rate <> v_claim.exchange_rate
     OR v_prior + v_claim.amount > least(v_invoice.amount, v_confirmed_paid) THEN
    RAISE EXCEPTION 'Supplier refund exceeds the eligible paid amount';
  END IF;

  SELECT l.account_id INTO STRICT v_expense
  FROM public.journal_entries e
  JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
  JOIN public.chart_of_accounts a ON a.id = l.account_id AND a.organization_id = _org
  WHERE e.organization_id = _org AND e.source_type = 'supplier_invoice'
    AND e.source_id = v_invoice.id AND e.status = 'posted' AND e.currency = v_claim.currency
    AND a.account_type = 'expense' AND l.debit >= v_prior + v_claim.amount;

  PERFORM refund_balance_private.post(
    _org, 'supplier_refund_confirmed', _id, v_invoice.booking_id, v_claim.currency, v_claim.exchange_rate,
    ARRAY[public.get_org_account_route(_org, 'supplier_advances')], ARRAY[v_claim.amount],
    v_expense, 'تأكيد رصيد استرداد المورد'
  );
  UPDATE public.supplier_refund_claims SET confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _id;
  RETURN _id;
END;
$$;

CREATE FUNCTION refund_balance_private.settle(
  _org uuid, _id uuid, _refund uuid, _claim uuid, _amount numeric,
  _treasury uuid, _invoice uuid, _order uuid, _reference text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_refund public.refund_requests%ROWTYPE;
  v_claim public.supplier_refund_claims%ROWTYPE;
  v_existing public.refund_balance_settlements%ROWTYPE;
  v_bank public.bank_accounts%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_order public.supplier_payment_orders%ROWTYPE;
  v_supplier_invoice public.supplier_invoices%ROWTYPE;
  v_amount numeric;
  v_remaining numeric;
  v_available numeric;
  v_currency text;
  v_rate numeric;
  v_reference text := nullif(btrim(_reference), '');
  v_party_account uuid;
  v_destination_account uuid;
  v_journal uuid;
  v_bank_transaction uuid;
  v_booking uuid;
  v_treasury_route text;
BEGIN
  IF NOT refund_balance_private.can_operate(_org) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _id IS NULL OR num_nonnulls(_refund, _claim) <> 1
     OR num_nonnulls(_treasury, _invoice, _order) <> 1
     OR (_invoice IS NOT NULL AND _refund IS NULL) OR (_order IS NOT NULL AND _claim IS NULL)
     OR (_amount IS NOT NULL AND (_amount <= 0 OR _amount >= 1e12 OR round(_amount, 2) <> _amount))
     OR ((_treasury IS NULL OR _claim IS NOT NULL) AND v_reference IS NULL) THEN
    RAISE EXCEPTION 'Invalid refund settlement details';
  END IF;

  -- Both the old full-payment RPC and new partial payments lock the same source.
  IF _refund IS NOT NULL THEN
    SELECT * INTO STRICT v_refund FROM public.refund_requests
    WHERE id = _refund AND organization_id = _org FOR UPDATE;
    IF to_jsonb(v_refund)->>'pilgrimage_b2b_cancellation_id' IS NOT NULL THEN
      RAISE EXCEPTION 'Use the dedicated pilgrimage cancellation settlement';
    END IF;
    v_currency := v_refund.currency;
    v_rate := v_refund.exchange_rate;
    v_booking := v_refund.booking_id;
    v_amount := v_refund.amount;
  ELSE
    SELECT * INTO STRICT v_claim FROM public.supplier_refund_claims
    WHERE id = _claim AND organization_id = _org FOR UPDATE;
    v_currency := v_claim.currency;
    v_rate := v_claim.exchange_rate;
    v_amount := v_claim.amount;
    SELECT booking_id INTO v_booking FROM public.supplier_invoices WHERE id = v_claim.supplier_invoice_id;
  END IF;

  SELECT * INTO v_existing FROM public.refund_balance_settlements WHERE id = _id AND organization_id = _org;
  IF FOUND THEN
    IF (v_existing.customer_refund_id, v_existing.supplier_claim_id, v_existing.treasury_account_id,
        v_existing.invoice_id, v_existing.supplier_order_id, v_existing.amount, v_existing.reference)
       IS DISTINCT FROM (_refund, _claim, _treasury, _invoice, _order, coalesce(_amount, v_existing.amount), v_reference) THEN
      RAISE EXCEPTION 'Settlement reference was already used';
    END IF;
    RETURN _id;
  END IF;

  IF (_refund IS NOT NULL AND (v_refund.status <> 'approved' OR v_refund.customer_id IS NULL))
     OR (_claim IS NOT NULL AND v_claim.confirmed_at IS NULL) THEN
    RAISE EXCEPTION 'Refund must be approved or confirmed';
  END IF;
  SELECT v_amount - coalesce(sum(amount), 0) INTO v_remaining
  FROM public.refund_balance_settlements
  WHERE customer_refund_id = _refund OR supplier_claim_id = _claim;
  v_amount := coalesce(_amount, v_remaining);
  IF v_amount <= 0 OR v_amount > v_remaining THEN
    RAISE EXCEPTION 'Settlement exceeds the remaining refund balance';
  END IF;

  IF _refund IS NOT NULL THEN
    -- Earlier approved rows were only posted when paid. Recognize their
    -- remaining liability once when they first use the new settlement flow.
    PERFORM refund_balance_private.recognize_customer(v_refund);
    v_party_account := public.get_org_account_route(_org, 'refunds_payable');
    IF v_refund.sales_return_component > 0 THEN
      SELECT l.account_id INTO STRICT v_party_account
      FROM public.journal_entries e
      JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id AND l.credit > 0
      WHERE e.organization_id = _org AND e.source_type = 'customer_refund_due' AND e.source_id = _refund;
    END IF;
  ELSE
    SELECT l.account_id INTO STRICT v_party_account
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id AND l.debit > 0
    WHERE e.organization_id = _org AND e.source_type = 'supplier_refund_confirmed' AND e.source_id = _claim;
  END IF;

  IF _treasury IS NOT NULL THEN
    SELECT * INTO STRICT v_bank FROM public.bank_accounts
    WHERE id = _treasury AND organization_id = _org AND is_active FOR UPDATE;
    IF v_bank.currency IS DISTINCT FROM v_currency OR v_bank.treasury_kind IS NULL THEN
      RAISE EXCEPTION 'Select an active treasury account in the refund currency';
    END IF;
    IF _refund IS NOT NULL AND v_bank.treasury_kind = 'cash'
       AND coalesce(v_bank.current_balance, 0) < v_amount THEN
      RAISE EXCEPTION 'Cash treasury has insufficient balance';
    END IF;
    v_treasury_route := CASE WHEN v_bank.treasury_kind = 'cash' THEN 'cash' ELSE 'bank' END;
    v_destination_account := public.get_org_account_route(_org, v_treasury_route);
  ELSIF _invoice IS NOT NULL THEN
    SELECT * INTO STRICT v_invoice FROM public.invoices
    WHERE id = _invoice AND organization_id = _org FOR UPDATE;
    IF _invoice IS NOT DISTINCT FROM v_refund.invoice_id
       OR (v_invoice.booking_id IS NOT NULL AND v_invoice.booking_id = v_refund.booking_id)
       OR to_jsonb(v_invoice)->>'pilgrimage_b2b_agreement_id' IS NOT NULL
       OR v_invoice.customer_id IS DISTINCT FROM v_refund.customer_id
       OR coalesce(v_invoice.currency, 'EGP') <> v_currency
       OR v_invoice.is_demo OR coalesce(v_invoice.status, 'draft') IN ('draft', 'cancelled', 'paid')
       OR v_amount > coalesce(v_invoice.remaining_amount, 0) THEN
      RAISE EXCEPTION 'Select an open invoice for the same customer and currency on another booking';
    END IF;
    SELECT l.account_id INTO STRICT v_destination_account
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id AND l.debit > 0
    WHERE e.organization_id = _org AND e.source_type = 'invoice' AND e.source_id = _invoice AND e.status = 'posted';
    v_booking := v_invoice.booking_id;
  ELSE
    SELECT * INTO STRICT v_order FROM public.supplier_payment_orders
    WHERE id = _order AND organization_id = _org FOR UPDATE;
    IF to_jsonb(v_order)->>'pilgrimage_b2b_agreement_id' IS NOT NULL
       OR v_order.supplier_id IS DISTINCT FROM v_claim.supplier_id OR v_order.currency <> v_currency
       OR v_order.approval_status IS DISTINCT FROM 'approved'
       OR coalesce(v_order.status, '') NOT IN ('approved', 'pending', 'partially_paid') THEN
      RAISE EXCEPTION 'Select an approved order for the same supplier and currency';
    END IF;
    SELECT * INTO STRICT v_supplier_invoice FROM public.supplier_invoices
    WHERE payment_order_id = _order AND organization_id = _org AND status <> 'cancelled' FOR UPDATE;
    IF v_supplier_invoice.id = v_claim.supplier_invoice_id
       OR v_supplier_invoice.supplier_id IS DISTINCT FROM v_claim.supplier_id
       OR v_supplier_invoice.currency <> v_currency
       OR v_amount > v_supplier_invoice.amount - v_supplier_invoice.amount_paid THEN
      RAISE EXCEPTION 'Select a different open supplier invoice with sufficient balance';
    END IF;
    SELECT v_order.amount - coalesce(sum(amount), 0) INTO v_available
    FROM (
      SELECT amount FROM public.supplier_payment_allocations WHERE payment_order_id = _order
      UNION ALL
      SELECT amount FROM public.refund_balance_settlements WHERE supplier_order_id = _order
    ) AS amounts;
    IF v_amount > v_available THEN RAISE EXCEPTION 'Settlement exceeds the outstanding order amount'; END IF;

    SELECT l.account_id INTO STRICT v_destination_account
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id AND l.credit > 0
    WHERE e.organization_id = _org AND e.source_type = 'supplier_invoice'
      AND e.source_id = v_supplier_invoice.id AND e.status = 'posted';
    v_booking := v_order.booking_id;
  END IF;

  v_journal := refund_balance_private.post(
    _org, 'refund_balance_settlement', _id, v_booking, v_currency, v_rate,
    ARRAY[CASE WHEN _refund IS NOT NULL THEN v_party_account ELSE v_destination_account END],
    ARRAY[v_amount], CASE WHEN _refund IS NOT NULL THEN v_destination_account ELSE v_party_account END,
    CASE WHEN _refund IS NOT NULL THEN 'تسوية رصيد استرداد العميل' ELSE 'تسوية رصيد استرداد المورد' END
  );
  IF _treasury IS NOT NULL THEN
    INSERT INTO public.bank_account_transactions (
      bank_account_id, transaction_type, amount, description, transaction_date,
      reference_number, related_invoice_id, organization_id, created_by
    ) VALUES (
      _treasury, CASE WHEN _refund IS NOT NULL THEN 'refund' ELSE 'deposit' END,
      v_amount, CASE WHEN _refund IS NOT NULL THEN 'صرف استرداد للعميل' ELSE 'تحصيل استرداد من المورد' END,
      CURRENT_DATE, v_reference, v_refund.invoice_id, _org, auth.uid()
    ) RETURNING id INTO v_bank_transaction;
  END IF;

  INSERT INTO public.refund_balance_settlements (
    id, organization_id, customer_refund_id, supplier_claim_id, treasury_account_id, invoice_id,
    supplier_invoice_id, supplier_order_id, journal_id, bank_transaction_id, amount, currency, reference, created_by
  ) VALUES (
    _id, _org, _refund, _claim, _treasury, _invoice, v_supplier_invoice.id, _order,
    v_journal, v_bank_transaction, v_amount, v_currency, v_reference, auth.uid()
  );

  IF _invoice IS NOT NULL THEN
    UPDATE public.invoices SET total_paid_amount = coalesce(total_paid_amount, 0) + v_amount, updated_at = now()
    WHERE id = _invoice;
  ELSIF _order IS NOT NULL THEN
    PERFORM public.refresh_supplier_invoice_payment_state(v_supplier_invoice.id);
    UPDATE public.supplier_payment_orders
    SET status = CASE WHEN v_amount = v_available THEN 'paid' ELSE 'partially_paid' END, updated_at = now()
    WHERE id = _order;
  END IF;

  IF _refund IS NOT NULL THEN
    IF v_amount = v_remaining THEN
      UPDATE public.refund_requests SET status = 'paid', paid_at = now(),
        treasury_account_id = _treasury, updated_at = now() WHERE id = _refund;
    END IF;
    IF v_refund.booking_id IS NOT NULL THEN
      INSERT INTO public.booking_timeline_events (organization_id, booking_id, kind, actor_id, summary, payload)
      VALUES (
        _org, v_refund.booking_id,
        CASE WHEN v_amount = v_remaining THEN 'refund_paid' ELSE 'refund_partially_settled' END,
        auth.uid(), 'تسوية استرداد: ' || v_amount || ' ' || v_currency,
        jsonb_build_object('refund_id', _refund, 'settlement_id', _id, 'invoice_id', _invoice,
          'reference', v_reference, 'remaining_amount', v_remaining - v_amount)
      );
    END IF;
  END IF;
  RETURN _id;
END;
$$;

CREATE FUNCTION public.manage_supplier_refund_claim(
  _org uuid, _id uuid, _action text, _invoice uuid DEFAULT NULL,
  _amount numeric DEFAULT NULL, _reference text DEFAULT NULL
)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$
  SELECT refund_balance_private.supplier_claim(_org, _id, _invoice, _amount, _reference, _action);
$$;

CREATE FUNCTION public.settle_refund_balance(
  _org uuid, _id uuid, _amount numeric, _refund uuid DEFAULT NULL, _claim uuid DEFAULT NULL,
  _treasury uuid DEFAULT NULL, _invoice uuid DEFAULT NULL, _order uuid DEFAULT NULL, _reference text DEFAULT NULL
)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$
  SELECT refund_balance_private.settle(_org, _id, _refund, _claim, _amount, _treasury, _invoice, _order, _reference);
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA refund_balance_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_balance_private.can_read(uuid),
  refund_balance_private.supplier_claim(uuid,uuid,uuid,numeric,text,text),
  refund_balance_private.settle(uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.manage_supplier_refund_claim(uuid,uuid,text,uuid,numeric,text),
  public.settle_refund_balance(uuid,uuid,numeric,uuid,uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_supplier_refund_claim(uuid,uuid,text,uuid,numeric,text),
  public.settle_refund_balance(uuid,uuid,numeric,uuid,uuid,uuid,uuid,uuid,text) TO authenticated;

-- Allocation-based refreshes must retain wallet offsets when a later cash
-- payment arrives. Legacy invoice posting must exclude offsets from cash.
CREATE OR REPLACE FUNCTION public.refresh_customer_invoice_payment_state(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_paid numeric;
  v_legacy numeric;
BEGIN
  IF _invoice_id IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  SELECT coalesce(sum(a.amount), 0) INTO v_paid
  FROM public.customer_payment_allocations a
  JOIN public.customer_payments p ON p.id = a.payment_id AND p.status = 'completed'
  WHERE a.invoice_id = _invoice_id;
  SELECT coalesce(sum(amount), 0) + v_paid INTO v_paid
  FROM public.refund_balance_settlements WHERE invoice_id = _invoice_id;
  SELECT coalesce(sum(total_debit), 0) INTO v_legacy
  FROM public.journal_entries WHERE source_type = 'legacy_invoice_receipt' AND source_id = _invoice_id;
  UPDATE public.invoices SET total_paid_amount = least(final_amount, v_paid + v_legacy), updated_at = now()
  WHERE id = _invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_supplier_invoice_payment_state(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE v_paid numeric;
BEGIN
  IF _invoice_id IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM public.supplier_invoices WHERE id = _invoice_id FOR UPDATE;
  SELECT coalesce(sum(a.amount), 0) INTO v_paid
  FROM public.supplier_payment_allocations a
  JOIN public.supplier_payments p ON p.id = a.supplier_payment_id AND p.status IN ('paid', 'completed')
  WHERE a.supplier_invoice_id = _invoice_id;
  SELECT coalesce(sum(amount), 0) + v_paid INTO v_paid
  FROM public.refund_balance_settlements WHERE supplier_invoice_id = _invoice_id;
  UPDATE public.supplier_invoices
  SET amount_paid = v_paid, status = CASE
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN v_paid >= amount AND amount > 0 THEN 'paid'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'unpaid' END,
    updated_at = now()
  WHERE id = _invoice_id;
END;
$$;

CREATE FUNCTION refund_balance_private.allocation_offset(_org uuid, _invoice uuid, _supplier boolean)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_offset numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _supplier THEN
    SELECT coalesce(sum(amount), 0) INTO v_offset
    FROM public.refund_balance_settlements WHERE organization_id = _org AND supplier_invoice_id = _invoice;
  ELSE
    SELECT coalesce(sum(amount), 0) INTO v_offset
    FROM public.refund_balance_settlements WHERE organization_id = _org AND invoice_id = _invoice;
    SELECT coalesce(sum(total_debit), 0) + v_offset INTO v_offset FROM public.journal_entries
    WHERE organization_id = _org AND source_type = 'legacy_invoice_receipt' AND source_id = _invoice;
  END IF;
  RETURN v_offset;
END;
$$;
REVOKE ALL ON FUNCTION refund_balance_private.allocation_offset(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_balance_private.allocation_offset(uuid,uuid,boolean) TO authenticated;

-- Extend existing allocation/posting functions without replacing unrelated
-- deployed rules. Abort the migration if the expected baseline has drifted.
DO $patch$
DECLARE
  v_patch record;
  v_definition text;
BEGIN
  FOR v_patch IN SELECT * FROM (VALUES
    ('public.post_invoice_legacy_receipt(uuid)',
      'v_residual := GREATEST(COALESCE(i.total_paid_amount,0)-v_allocated,0);',
      'v_residual := GREATEST(COALESCE(i.total_paid_amount,0)-v_allocated-
        (SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements WHERE invoice_id = i.id),0);'),
    ('public.guard_customer_payment_allocation()',
      'IF v_invoice_allocated + NEW.amount > v_invoice.final_amount + 0.01 THEN',
      'v_invoice_allocated := v_invoice_allocated
        + refund_balance_private.allocation_offset(NEW.organization_id, NEW.invoice_id, false);
      IF v_invoice_allocated + NEW.amount > v_invoice.final_amount + 0.01 THEN'),
    ('public.prepare_supplier_payment_allocation()',
      'IF v_existing + NEW.amount > v_invoice.amount + 0.01 THEN',
      'v_existing := v_existing + refund_balance_private.allocation_offset(NEW.organization_id, NEW.supplier_invoice_id, true);
      IF v_existing + NEW.amount > v_invoice.amount + 0.01 THEN'),
    ('public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid)',
      'UPDATE public.invoices
    SET total_paid_amount=LEAST(final_amount,COALESCE(total_paid_amount,0)+v_allocate)
    WHERE id=_invoice_id;',
      'NULL; -- The completed-payment trigger refreshes the invoice.'),
    ('public.create_refund_request(uuid,numeric,text,numeric,uuid,text)',
      'IF _amount IS NULL OR _amount<=0 OR COALESCE(_exchange_rate,0)<=0 THEN',
      'IF _amount IS NULL OR _amount<=0 OR _amount >= 1e12 OR round(_amount, 2) <> _amount
         OR COALESCE(_exchange_rate,0)<=0 OR _exchange_rate >= 1e8 THEN'),
    ('public.create_refund_request(uuid,numeric,text,numeric,uuid,text)',
      'IF v_currency NOT IN (''EGP'',''USD'') THEN',
      'IF v_currency NOT IN (''EGP'',''USD'',''SAR'') THEN'),
    ('public.create_refund_request(uuid,numeric,text,numeric,uuid,text)',
      'SUM(LEAST(COALESCE(i.total_paid_amount,0),COALESCE(i.final_amount,0)))',
      'SUM(GREATEST(LEAST(COALESCE(i.total_paid_amount,0),COALESCE(i.final_amount,0))
        - (SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements WHERE invoice_id = i.id), 0))'),
    ('public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text)',
      'v_remaining := GREATEST(v_po.amount-v_allocated,0);',
      'v_allocated := v_allocated + (SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements
        WHERE supplier_order_id = _po_id);
      v_remaining := GREATEST(v_po.amount-v_allocated,0);'),
    ('public.pay_refund_request(uuid,uuid,text)',
      'IF NOT FOUND THEN RAISE EXCEPTION ''Refund not found''; END IF;',
      'IF NOT FOUND THEN RAISE EXCEPTION ''Refund not found''; END IF;
      IF to_jsonb(v_r)->>''pilgrimage_b2b_cancellation_id'' IS NULL THEN
        IF NOT public._can_manage_refunds(v_r.organization_id) THEN
          RAISE EXCEPTION ''Not authorized'' USING ERRCODE = ''42501'';
        END IF;
        PERFORM refund_balance_private.settle(v_r.organization_id, gen_random_uuid(), _refund_id,
          NULL, NULL, _treasury_account_id, NULL, NULL, _reference);
        RETURN;
      END IF;'),
    ('public.post_customer_refund(uuid)',
      'SELECT * INTO r FROM public.refund_requests WHERE id=_refund_id;',
      'IF EXISTS (SELECT FROM public.refund_balance_settlements WHERE customer_refund_id = _refund_id) THEN
        RETURN NULL;
      END IF;
      SELECT * INTO r FROM public.refund_requests WHERE id=_refund_id;')
  ) AS patch(signature, old_sql, new_sql)
  LOOP
    SELECT pg_get_functiondef(v_patch.signature::regprocedure) INTO STRICT v_definition;
    IF strpos(v_definition, v_patch.old_sql) = 0 THEN
      RAISE EXCEPTION 'Refund balance migration: unexpected definition of %', v_patch.signature;
    END IF;
    EXECUTE replace(v_definition, v_patch.old_sql, v_patch.new_sql);
  END LOOP;
END;
$patch$;

-- Preserve historical posting while preventing a second journal on final settlement.
CREATE OR REPLACE FUNCTION public._trg_post_customer_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF to_jsonb(NEW)->>'pilgrimage_b2b_cancellation_id' IS NOT NULL THEN
    PERFORM public.post_customer_refund(NEW.id);
  ELSIF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF auth.uid() IS NOT NULL AND NOT refund_balance_private.can_operate(NEW.organization_id) THEN
      RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;
    PERFORM refund_balance_private.recognize_customer(NEW);
  ELSIF NEW.status <> 'paid' OR NOT EXISTS (
    SELECT FROM public.refund_balance_settlements WHERE customer_refund_id = NEW.id
  ) THEN
    PERFORM public.post_customer_refund(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._trg_post_customer_refund() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION refund_balance_private.protect_bank_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT FROM public.refund_balance_settlements WHERE bank_transaction_id = OLD.id) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'A bank transaction linked to a refund settlement cannot be deleted';
    ELSIF (OLD.bank_account_id, OLD.organization_id, OLD.amount, OLD.transaction_type, OLD.transaction_date)
        IS DISTINCT FROM (NEW.bank_account_id, NEW.organization_id, NEW.amount, NEW.transaction_type, NEW.transaction_date) THEN
      RAISE EXCEPTION 'A bank transaction linked to a refund settlement cannot be changed';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION refund_balance_private.protect_bank_settlement() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_refund_bank_settlement BEFORE UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION refund_balance_private.protect_bank_settlement();

COMMIT;
