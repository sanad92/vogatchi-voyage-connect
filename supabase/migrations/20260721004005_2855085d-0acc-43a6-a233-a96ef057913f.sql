
DROP FUNCTION IF EXISTS public.get_cash_flow(uuid,date,date);
DROP FUNCTION IF EXISTS public.get_finance_executive(uuid,date,date);
DROP FUNCTION IF EXISTS public.get_customer_ledger(uuid,date,date);
DROP FUNCTION IF EXISTS public.get_supplier_ledger(uuid,date,date);

-- Extend bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS treasury_kind text NOT NULL DEFAULT 'bank'
    CHECK (treasury_kind IN ('bank','cash','card','wallet','gateway'));

ALTER TABLE public.supplier_payment_orders
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  treasury_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EGP',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  amount_base numeric(14,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','reversed')),
  client_ref text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, client_ref)
);
CREATE INDEX IF NOT EXISTS idx_cust_pay_org ON public.customer_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cust_pay_booking ON public.customer_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_cust_pay_customer ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_pay_invoice ON public.customer_payments(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cp_read ON public.customer_payments;
DROP POLICY IF EXISTS cp_write ON public.customer_payments;
CREATE POLICY cp_read ON public.customer_payments FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY cp_write ON public.customer_payments FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.customer_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  amount_base numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpa_payment ON public.customer_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_cpa_invoice ON public.customer_payment_allocations(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payment_allocations TO authenticated;
GRANT ALL ON public.customer_payment_allocations TO service_role;
ALTER TABLE public.customer_payment_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cpa_read ON public.customer_payment_allocations;
DROP POLICY IF EXISTS cpa_write ON public.customer_payment_allocations;
CREATE POLICY cpa_read ON public.customer_payment_allocations FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY cpa_write ON public.customer_payment_allocations FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  payment_order_id uuid REFERENCES public.supplier_payment_orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  amount_base numeric(14,2) NOT NULL,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_invoices TO authenticated;
GRANT ALL ON public.supplier_invoices TO service_role;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sinv_read ON public.supplier_invoices;
DROP POLICY IF EXISTS sinv_write ON public.supplier_invoices;
CREATE POLICY sinv_read ON public.supplier_invoices FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY sinv_write ON public.supplier_invoices FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.supplier_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_payment_id uuid NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  payment_order_id uuid REFERENCES public.supplier_payment_orders(id) ON DELETE SET NULL,
  supplier_invoice_id uuid REFERENCES public.supplier_invoices(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  amount_base numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payment_allocations TO authenticated;
GRANT ALL ON public.supplier_payment_allocations TO service_role;
ALTER TABLE public.supplier_payment_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS spa_read ON public.supplier_payment_allocations;
DROP POLICY IF EXISTS spa_write ON public.supplier_payment_allocations;
CREATE POLICY spa_read ON public.supplier_payment_allocations FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY spa_write ON public.supplier_payment_allocations FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  party_type text NOT NULL CHECK (party_type IN ('customer','supplier')),
  party_id uuid,
  invoice_id uuid,
  note_number text NOT NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EGP',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  amount_base numeric(14,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','applied','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cn_read ON public.credit_notes;
DROP POLICY IF EXISTS cn_write ON public.credit_notes;
CREATE POLICY cn_read ON public.credit_notes FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY cn_write ON public.credit_notes FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  source_payment_id uuid REFERENCES public.customer_payments(id) ON DELETE SET NULL,
  treasury_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EGP',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  amount_base numeric(14,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','paid','cancelled')),
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rr_read ON public.refund_requests;
DROP POLICY IF EXISTS rr_write ON public.refund_requests;
CREATE POLICY rr_read ON public.refund_requests FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY rr_write ON public.refund_requests FOR ALL TO authenticated
  USING (can_org_write(organization_id)) WITH CHECK (can_org_write(organization_id));

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  account_code text,
  party_type text CHECK (party_type IN ('customer','supplier','employee','treasury') OR party_type IS NULL),
  party_id uuid,
  direction text NOT NULL CHECK (direction IN ('debit','credit')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EGP',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  amount_base numeric(14,2) NOT NULL,
  memo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ft_org_time ON public.finance_transactions(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ft_booking ON public.finance_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ft_party ON public.finance_transactions(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_ft_ref ON public.finance_transactions(reference_type, reference_id);
GRANT SELECT, INSERT ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ft_read ON public.finance_transactions;
DROP POLICY IF EXISTS ft_insert ON public.finance_transactions;
CREATE POLICY ft_read ON public.finance_transactions FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY ft_insert ON public.finance_transactions FOR INSERT TO authenticated
  WITH CHECK (can_org_write(organization_id));

DROP TRIGGER IF EXISTS trg_cp_updated ON public.customer_payments;
DROP TRIGGER IF EXISTS trg_sinv_updated ON public.supplier_invoices;
DROP TRIGGER IF EXISTS trg_cn_updated ON public.credit_notes;
DROP TRIGGER IF EXISTS trg_rr_updated ON public.refund_requests;
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sinv_updated BEFORE UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cn_updated BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rr_updated BEFORE UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.record_customer_payment(
  _invoice_id uuid, _amount numeric, _currency text DEFAULT 'EGP',
  _exchange_rate numeric DEFAULT 1, _method text DEFAULT 'cash',
  _treasury_account_id uuid DEFAULT NULL, _payment_date date DEFAULT CURRENT_DATE,
  _reference text DEFAULT NULL, _notes text DEFAULT NULL, _client_ref text DEFAULT NULL,
  _booking_id uuid DEFAULT NULL, _customer_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_payment_id uuid; v_base numeric;
  v_booking uuid := _booking_id; v_customer uuid := _customer_id;
BEGIN
  IF _invoice_id IS NOT NULL THEN
    SELECT organization_id, booking_id, customer_id INTO v_org, v_booking, v_customer
    FROM invoices WHERE id = _invoice_id;
  END IF;
  IF v_org IS NULL AND v_booking IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM bookings WHERE id = v_booking;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'organization not resolved'; END IF;
  IF NOT can_org_write(v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  v_base := round(_amount * COALESCE(_exchange_rate,1), 2);
  IF _client_ref IS NOT NULL THEN
    SELECT id INTO v_payment_id FROM customer_payments WHERE organization_id=v_org AND client_ref=_client_ref;
    IF v_payment_id IS NOT NULL THEN RETURN v_payment_id; END IF;
  END IF;
  INSERT INTO customer_payments (organization_id, booking_id, customer_id, invoice_id, treasury_account_id,
    amount, currency, exchange_rate, amount_base, payment_method, reference_number, payment_date, notes, client_ref, created_by)
  VALUES (v_org, v_booking, v_customer, _invoice_id, _treasury_account_id, _amount, _currency,
    COALESCE(_exchange_rate,1), v_base, _method, _reference, _payment_date, _notes, _client_ref, auth.uid())
  RETURNING id INTO v_payment_id;

  IF _invoice_id IS NOT NULL THEN
    INSERT INTO customer_payment_allocations (organization_id, payment_id, invoice_id, amount, amount_base)
    VALUES (v_org, v_payment_id, _invoice_id, _amount, v_base);
    UPDATE invoices SET
      total_paid_amount = COALESCE(total_paid_amount,0) + _amount,
      remaining_amount = GREATEST(0, COALESCE(final_amount,0) - (COALESCE(total_paid_amount,0) + _amount)),
      payment_status = CASE
        WHEN COALESCE(total_paid_amount,0) + _amount >= COALESCE(final_amount,0) THEN 'paid'
        WHEN COALESCE(total_paid_amount,0) + _amount > 0 THEN 'partial' ELSE 'unpaid' END,
      status = CASE WHEN COALESCE(total_paid_amount,0) + _amount >= COALESCE(final_amount,0) THEN 'paid' ELSE status END,
      updated_at = now()
    WHERE id = _invoice_id;
  END IF;

  IF _treasury_account_id IS NOT NULL THEN
    UPDATE bank_accounts SET current_balance = COALESCE(current_balance,0) + _amount, updated_at=now()
    WHERE id = _treasury_account_id;
    INSERT INTO bank_account_transactions (bank_account_id, transaction_type, amount, description,
      transaction_date, reference_number, related_invoice_id, organization_id, created_by)
    VALUES (_treasury_account_id, 'deposit', _amount, COALESCE(_notes,'Customer payment'),
      _payment_date, _reference, _invoice_id, v_org, auth.uid());
  END IF;

  INSERT INTO finance_transactions (organization_id, booking_id, reference_type, reference_id,
    account_code, party_type, party_id, direction, amount, currency, exchange_rate, amount_base, memo, created_by)
  VALUES
    (v_org, v_booking, 'customer_payment', v_payment_id, '1010', 'treasury', _treasury_account_id, 'debit', _amount, _currency, COALESCE(_exchange_rate,1), v_base, 'Customer payment received', auth.uid()),
    (v_org, v_booking, 'customer_payment', v_payment_id, '1200', 'customer', v_customer, 'credit', _amount, _currency, COALESCE(_exchange_rate,1), v_base, 'AR reduction', auth.uid());

  IF v_booking IS NOT NULL THEN
    INSERT INTO booking_timeline_events (organization_id, booking_id, event_type, title, description, metadata, created_by)
    VALUES (v_org, v_booking, 'payment_received', 'دفعة عميل: ' || _amount || ' ' || _currency,
      COALESCE(_notes,''), jsonb_build_object('payment_id', v_payment_id, 'invoice_id', _invoice_id, 'method', _method), auth.uid());
  END IF;
  RETURN v_payment_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,numeric,text,uuid,date,text,text,text,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_supplier_payment_order(
  _po_id uuid, _approve boolean DEFAULT true, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM supplier_payment_orders WHERE id=_po_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'PO not found'; END IF;
  IF NOT can_org_write(v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE supplier_payment_orders SET
    approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    status = CASE WHEN _approve THEN 'approved' ELSE status END,
    approved_by = auth.uid(), approved_at = now(),
    rejection_reason = CASE WHEN NOT _approve THEN _reason ELSE NULL END,
    updated_at = now()
  WHERE id = _po_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_supplier_payment_order(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_supplier_payment_order(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  _po_id uuid, _amount numeric, _currency text DEFAULT 'EGP', _exchange_rate numeric DEFAULT 1,
  _method text DEFAULT 'bank_transfer', _treasury_account_id uuid DEFAULT NULL,
  _payment_date date DEFAULT CURRENT_DATE, _reference text DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_booking uuid; v_supplier uuid; v_payment_id uuid; v_base numeric; v_po_status text;
BEGIN
  SELECT organization_id, booking_id, supplier_id, approval_status
    INTO v_org, v_booking, v_supplier, v_po_status FROM supplier_payment_orders WHERE id=_po_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'PO not found'; END IF;
  IF NOT can_org_write(v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF v_po_status <> 'approved' THEN RAISE EXCEPTION 'PO must be approved before payment'; END IF;
  v_base := round(_amount * COALESCE(_exchange_rate,1), 2);

  INSERT INTO supplier_payments (supplier_id, amount, currency, payment_date, payment_method,
    reference_number, booking_id, notes, status, created_by, paid_date, amount_in_egp, exchange_rate, organization_id)
  VALUES (v_supplier, _amount, _currency, _payment_date, _method, _reference, v_booking, _notes,
    'paid', auth.uid(), _payment_date, v_base, COALESCE(_exchange_rate,1), v_org)
  RETURNING id INTO v_payment_id;

  INSERT INTO supplier_payment_allocations (organization_id, supplier_payment_id, payment_order_id, amount, amount_base)
  VALUES (v_org, v_payment_id, _po_id, _amount, v_base);

  UPDATE supplier_payment_orders SET status='paid', updated_at=now() WHERE id=_po_id;

  IF _treasury_account_id IS NOT NULL THEN
    UPDATE bank_accounts SET current_balance = COALESCE(current_balance,0) - _amount, updated_at=now()
    WHERE id = _treasury_account_id;
    INSERT INTO bank_account_transactions (bank_account_id, transaction_type, amount, description,
      transaction_date, reference_number, related_payment_order_id, organization_id, created_by)
    VALUES (_treasury_account_id, 'withdrawal', _amount, COALESCE(_notes,'Supplier payment'),
      _payment_date, _reference, _po_id, v_org, auth.uid());
  END IF;

  INSERT INTO finance_transactions (organization_id, booking_id, reference_type, reference_id,
    account_code, party_type, party_id, direction, amount, currency, exchange_rate, amount_base, memo, created_by)
  VALUES
    (v_org, v_booking, 'supplier_payment', v_payment_id, '2100', 'supplier', v_supplier, 'debit', _amount, _currency, COALESCE(_exchange_rate,1), v_base, 'AP reduction', auth.uid()),
    (v_org, v_booking, 'supplier_payment', v_payment_id, '1010', 'treasury', _treasury_account_id, 'credit', _amount, _currency, COALESCE(_exchange_rate,1), v_base, 'Cash disbursement', auth.uid());

  IF v_booking IS NOT NULL THEN
    INSERT INTO booking_timeline_events (organization_id, booking_id, event_type, title, description, metadata, created_by)
    VALUES (v_org, v_booking, 'supplier_paid', 'دفعة مورد: ' || _amount || ' ' || _currency,
      COALESCE(_notes,''), jsonb_build_object('payment_id', v_payment_id, 'po_id', _po_id, 'method', _method), auth.uid());
  END IF;
  RETURN v_payment_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid,numeric,text,numeric,text,uuid,date,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_refund_request(
  _booking_id uuid, _amount numeric, _currency text DEFAULT 'EGP', _exchange_rate numeric DEFAULT 1,
  _source_payment_id uuid DEFAULT NULL, _reason text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_customer uuid; v_id uuid; v_base numeric;
BEGIN
  SELECT organization_id, customer_id INTO v_org, v_customer FROM bookings WHERE id=_booking_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF NOT can_org_write(v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  v_base := round(_amount * COALESCE(_exchange_rate,1), 2);
  INSERT INTO refund_requests (organization_id, booking_id, customer_id, source_payment_id,
    amount, currency, exchange_rate, amount_base, reason, requested_by)
  VALUES (v_org, _booking_id, v_customer, _source_payment_id, _amount, _currency,
    COALESCE(_exchange_rate,1), v_base, _reason, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO booking_timeline_events (organization_id, booking_id, event_type, title, description, metadata, created_by)
  VALUES (v_org, _booking_id, 'refund_requested', 'طلب استرداد: ' || _amount || ' ' || _currency,
    COALESCE(_reason,''), jsonb_build_object('refund_id', v_id), auth.uid());
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_refund_request(uuid,numeric,text,numeric,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_refund_request(uuid,numeric,text,numeric,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_refund_request(
  _refund_id uuid, _approve boolean DEFAULT true, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_booking uuid;
BEGIN
  SELECT organization_id, booking_id INTO v_org, v_booking FROM refund_requests WHERE id=_refund_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'refund not found'; END IF;
  IF NOT can_org_write(v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE refund_requests SET
    status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    approved_by = auth.uid(), approved_at = now(),
    rejection_reason = CASE WHEN NOT _approve THEN _reason END, updated_at = now()
  WHERE id = _refund_id;
  IF v_booking IS NOT NULL THEN
    INSERT INTO booking_timeline_events (organization_id, booking_id, event_type, title, description, created_by)
    VALUES (v_org, v_booking, CASE WHEN _approve THEN 'refund_approved' ELSE 'refund_rejected' END,
      CASE WHEN _approve THEN 'تمت الموافقة على طلب الاسترداد' ELSE 'تم رفض طلب الاسترداد' END,
      COALESCE(_reason,''), auth.uid());
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.approve_refund_request(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_refund_request(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pay_refund_request(
  _refund_id uuid, _treasury_account_id uuid, _reference text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r refund_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM refund_requests WHERE id=_refund_id;
  IF v_r.id IS NULL THEN RAISE EXCEPTION 'refund not found'; END IF;
  IF v_r.status <> 'approved' THEN RAISE EXCEPTION 'refund not approved'; END IF;
  IF NOT can_org_write(v_r.organization_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE refund_requests SET status='paid', paid_at=now(), treasury_account_id=_treasury_account_id, updated_at=now() WHERE id=_refund_id;
  UPDATE bank_accounts SET current_balance = COALESCE(current_balance,0) - v_r.amount, updated_at=now() WHERE id=_treasury_account_id;
  INSERT INTO bank_account_transactions (bank_account_id, transaction_type, amount, description,
    transaction_date, reference_number, related_invoice_id, organization_id, created_by)
  VALUES (_treasury_account_id, 'refund', v_r.amount, 'Customer refund', CURRENT_DATE, _reference,
    v_r.invoice_id, v_r.organization_id, auth.uid());
  INSERT INTO finance_transactions (organization_id, booking_id, reference_type, reference_id,
    account_code, party_type, party_id, direction, amount, currency, exchange_rate, amount_base, memo, created_by)
  VALUES
    (v_r.organization_id, v_r.booking_id, 'refund', v_r.id, '1200', 'customer', v_r.customer_id, 'debit', v_r.amount, v_r.currency, v_r.exchange_rate, v_r.amount_base, 'AR reversal (refund)', auth.uid()),
    (v_r.organization_id, v_r.booking_id, 'refund', v_r.id, '1010', 'treasury', _treasury_account_id, 'credit', v_r.amount, v_r.currency, v_r.exchange_rate, v_r.amount_base, 'Refund disbursed', auth.uid());
  IF v_r.booking_id IS NOT NULL THEN
    INSERT INTO booking_timeline_events (organization_id, booking_id, event_type, title, description, created_by)
    VALUES (v_r.organization_id, v_r.booking_id, 'refund_paid', 'تم صرف الاسترداد: ' || v_r.amount || ' ' || v_r.currency, '', auth.uid());
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.pay_refund_request(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_refund_request(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_ledger(
  _customer_id uuid, _from date DEFAULT NULL, _to date DEFAULT NULL
) RETURNS TABLE(entry_date timestamptz, entry_type text, reference text, booking_id uuid,
  debit numeric, credit numeric, currency text, balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM customers WHERE id=_customer_id;
  IF NOT user_belongs_to_org(auth.uid(), v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH events AS (
    SELECT i.issued_date::timestamptz AS entry_date, 'invoice'::text AS entry_type,
           i.invoice_number AS reference, i.booking_id, COALESCE(i.final_amount,0) AS debit,
           0::numeric AS credit, i.currency
    FROM invoices i WHERE i.customer_id=_customer_id
      AND (_from IS NULL OR i.issued_date >= _from) AND (_to IS NULL OR i.issued_date <= _to)
    UNION ALL
    SELECT p.payment_date::timestamptz, 'payment', COALESCE(p.reference_number,'-'),
           p.booking_id, 0::numeric, p.amount, p.currency
    FROM customer_payments p WHERE p.customer_id=_customer_id AND p.status='completed'
      AND (_from IS NULL OR p.payment_date >= _from) AND (_to IS NULL OR p.payment_date <= _to)
    UNION ALL
    SELECT r.paid_at, 'refund', 'REFUND', r.booking_id, r.amount, 0::numeric, r.currency
    FROM refund_requests r WHERE r.customer_id=_customer_id AND r.status='paid'
      AND (_from IS NULL OR r.paid_at::date >= _from) AND (_to IS NULL OR r.paid_at::date <= _to)
  )
  SELECT e.entry_date, e.entry_type, e.reference, e.booking_id, e.debit, e.credit, e.currency,
         SUM(e.debit - e.credit) OVER (ORDER BY e.entry_date, e.entry_type) AS balance
  FROM events e ORDER BY e.entry_date, e.entry_type;
END; $$;
REVOKE ALL ON FUNCTION public.get_customer_ledger(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_supplier_ledger(
  _supplier_id uuid, _from date DEFAULT NULL, _to date DEFAULT NULL
) RETURNS TABLE(entry_date timestamptz, entry_type text, reference text, booking_id uuid,
  debit numeric, credit numeric, currency text, balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM suppliers WHERE id=_supplier_id;
  IF NOT user_belongs_to_org(auth.uid(), v_org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH events AS (
    SELECT po.created_at AS entry_date, 'payment_order'::text AS entry_type,
           po.reference_number AS reference, po.booking_id, 0::numeric AS debit,
           COALESCE(po.amount,0) AS credit, po.currency
    FROM supplier_payment_orders po WHERE po.supplier_id=_supplier_id
      AND (_from IS NULL OR po.created_at::date >= _from) AND (_to IS NULL OR po.created_at::date <= _to)
    UNION ALL
    SELECT si.invoice_date::timestamptz, 'supplier_invoice', si.invoice_number, si.booking_id,
           0::numeric, si.amount, si.currency
    FROM supplier_invoices si WHERE si.supplier_id=_supplier_id
      AND (_from IS NULL OR si.invoice_date >= _from) AND (_to IS NULL OR si.invoice_date <= _to)
    UNION ALL
    SELECT sp.payment_date::timestamptz, 'payment', COALESCE(sp.reference_number,'-'),
           sp.booking_id, sp.amount, 0::numeric, sp.currency
    FROM supplier_payments sp WHERE sp.supplier_id=_supplier_id AND sp.status='paid'
      AND (_from IS NULL OR sp.payment_date >= _from) AND (_to IS NULL OR sp.payment_date <= _to)
  )
  SELECT e.entry_date, e.entry_type, e.reference, e.booking_id, e.debit, e.credit, e.currency,
         SUM(e.debit - e.credit) OVER (ORDER BY e.entry_date, e.entry_type) AS balance
  FROM events e ORDER BY e.entry_date, e.entry_type;
END; $$;
REVOKE ALL ON FUNCTION public.get_supplier_ledger(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_ledger(uuid,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_cash_flow(
  _org uuid, _from date DEFAULT NULL, _to date DEFAULT NULL
) RETURNS TABLE(day date, incoming numeric, outgoing numeric, net numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT transaction_date AS day,
    COALESCE(SUM(CASE WHEN transaction_type='deposit' THEN amount ELSE 0 END),0) AS incoming,
    COALESCE(SUM(CASE WHEN transaction_type IN ('withdrawal','refund') THEN amount ELSE 0 END),0) AS outgoing,
    COALESCE(SUM(CASE WHEN transaction_type='deposit' THEN amount ELSE -amount END),0) AS net
  FROM bank_account_transactions
  WHERE organization_id = _org
    AND user_belongs_to_org(auth.uid(), _org)
    AND (_from IS NULL OR transaction_date >= _from)
    AND (_to IS NULL OR transaction_date <= _to)
  GROUP BY transaction_date ORDER BY transaction_date;
$$;
REVOKE ALL ON FUNCTION public.get_cash_flow(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cash_flow(uuid,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_finance_executive(
  _org uuid, _from date DEFAULT NULL, _to date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT user_belongs_to_org(auth.uid(), _org) THEN RAISE EXCEPTION 'not authorized'; END IF;
  WITH inv AS (
    SELECT COALESCE(SUM(final_amount),0) AS sales, COALESCE(SUM(remaining_amount),0) AS ar,
           COUNT(*) FILTER (WHERE status<>'paid' AND due_date<CURRENT_DATE) AS overdue_count
    FROM invoices WHERE organization_id=_org
      AND (_from IS NULL OR issued_date >= _from) AND (_to IS NULL OR issued_date <= _to)
  ), po AS (
    SELECT COALESCE(SUM(amount),0) AS costs, COUNT(*) FILTER (WHERE approval_status='pending') AS pending_approvals
    FROM supplier_payment_orders WHERE organization_id=_org
      AND (_from IS NULL OR created_at::date >= _from) AND (_to IS NULL OR created_at::date <= _to)
  ), sp AS (
    SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid_to_suppliers,
           COALESCE(SUM(CASE WHEN status<>'paid' THEN amount ELSE 0 END),0) AS ap
    FROM supplier_payments WHERE organization_id=_org
      AND (_from IS NULL OR payment_date >= _from) AND (_to IS NULL OR payment_date <= _to)
  ), cash AS (
    SELECT COALESCE(SUM(current_balance),0) AS cash_total FROM bank_accounts WHERE organization_id=_org AND is_active
  ), top_customers AS (
    SELECT jsonb_agg(row_to_json(t)) AS list FROM (
      SELECT c.id, c.name, COALESCE(SUM(i.final_amount),0) AS revenue
      FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.organization_id=_org
      GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT 5) t
  ), top_suppliers AS (
    SELECT jsonb_agg(row_to_json(t)) AS list FROM (
      SELECT s.id, s.name, COALESCE(SUM(po.amount),0) AS spend
      FROM supplier_payment_orders po JOIN suppliers s ON s.id=po.supplier_id WHERE po.organization_id=_org
      GROUP BY s.id, s.name ORDER BY spend DESC LIMIT 5) t
  ), by_destination AS (
    SELECT jsonb_agg(row_to_json(t)) AS list FROM (
      SELECT COALESCE(b.destination,'N/A') AS destination,
             COALESCE(SUM(b.selling_price),0) AS revenue,
             COALESCE(SUM(b.cost_price),0) AS cost,
             COALESCE(SUM(b.selling_price - b.cost_price),0) AS profit
      FROM bookings b WHERE b.organization_id=_org GROUP BY 1 ORDER BY revenue DESC LIMIT 10) t
  )
  SELECT jsonb_build_object('sales', inv.sales, 'costs', po.costs, 'profit', inv.sales - po.costs,
    'cash', cash.cash_total, 'ar', inv.ar, 'ap', sp.ap,
    'overdue_invoices', inv.overdue_count, 'pending_po_approvals', po.pending_approvals,
    'paid_to_suppliers', sp.paid_to_suppliers, 'top_customers', top_customers.list,
    'top_suppliers', top_suppliers.list, 'by_destination', by_destination.list) INTO v
  FROM inv, po, sp, cash, top_customers, top_suppliers, by_destination;
  RETURN v;
END; $$;
REVOKE ALL ON FUNCTION public.get_finance_executive(uuid,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_executive(uuid,date,date) TO authenticated;
