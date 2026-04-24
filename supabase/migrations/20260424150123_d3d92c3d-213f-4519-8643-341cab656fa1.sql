-- ========== Cost Centers ==========
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  manager_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON public.cost_centers(organization_id);
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_centers_select" ON public.cost_centers FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "cost_centers_insert" ON public.cost_centers FOR INSERT
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "cost_centers_update" ON public.cost_centers FOR UPDATE
  USING (public.can_org_write(organization_id));
CREATE POLICY "cost_centers_delete" ON public.cost_centers FOR DELETE
  USING (public.can_org_write(organization_id));

CREATE TRIGGER trg_cost_centers_updated BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- إضافة cost_center_id إلى journal_entry_lines
ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jel_cost_center ON public.journal_entry_lines(cost_center_id);

-- ========== Accounting Periods ==========
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_periods_org ON public.accounting_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_periods_dates ON public.accounting_periods(organization_id, start_date, end_date);
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periods_select" ON public.accounting_periods FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "periods_insert" ON public.accounting_periods FOR INSERT
  WITH CHECK (public.can_org_write(organization_id) 
    AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager'));
CREATE POLICY "periods_update" ON public.accounting_periods FOR UPDATE
  USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin','manager') OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_periods_updated BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- منع الترحيل في فترات مقفلة
CREATE OR REPLACE FUNCTION public.trg_block_closed_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE organization_id = NEW.organization_id
      AND NEW.entry_date BETWEEN start_date AND end_date
      AND status IN ('closed','locked')
  ) THEN
    RAISE EXCEPTION 'لا يمكن إضافة قيود في فترة محاسبية مقفلة';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_je_block_closed ON public.journal_entries;
CREATE TRIGGER trg_je_block_closed BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_closed_period();

-- إقفال فترة
CREATE OR REPLACE FUNCTION public.close_accounting_period(_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_period record;
BEGIN
  SELECT * INTO v_period FROM public.accounting_periods WHERE id = _period_id;
  IF v_period IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفترة غير موجودة');
  END IF;
  IF NOT (public.is_platform_admin(auth.uid()) 
    OR public.get_user_org_role(auth.uid(), v_period.organization_id) IN ('owner','admin')) THEN
    RAISE EXCEPTION 'غير مصرح بإقفال الفترات';
  END IF;
  UPDATE public.accounting_periods 
    SET status='closed', closed_by=auth.uid(), closed_at=now(), updated_at=now()
    WHERE id = _period_id;
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.reopen_accounting_period(_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_period record;
BEGIN
  SELECT * INTO v_period FROM public.accounting_periods WHERE id = _period_id;
  IF v_period IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفترة غير موجودة');
  END IF;
  IF NOT (public.is_platform_admin(auth.uid()) 
    OR public.get_user_org_role(auth.uid(), v_period.organization_id) = 'owner') THEN
    RAISE EXCEPTION 'فقط المالك يمكنه إعادة فتح الفترات';
  END IF;
  IF v_period.status = 'locked' THEN
    RAISE EXCEPTION 'الفترة مقفلة نهائياً ولا يمكن فتحها';
  END IF;
  UPDATE public.accounting_periods 
    SET status='open', closed_by=NULL, closed_at=NULL, updated_at=now()
    WHERE id = _period_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- P&L لكل مركز تكلفة
CREATE OR REPLACE FUNCTION public.get_cost_center_pnl(_org_id uuid, _start_date date, _end_date date)
RETURNS TABLE(cost_center_id uuid, cost_center_code text, cost_center_name text, 
  revenue numeric, expenses numeric, profit numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cc.id, cc.code, cc.name,
    COALESCE(SUM(CASE WHEN coa.account_type='revenue' THEN jel.credit - jel.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_type='expense' THEN jel.debit - jel.credit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_type='revenue' THEN jel.credit - jel.debit
                      WHEN coa.account_type='expense' THEN -(jel.debit - jel.credit) ELSE 0 END), 0)
  FROM public.cost_centers cc
  LEFT JOIN public.journal_entry_lines jel ON jel.cost_center_id = cc.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id 
    AND je.status='posted' AND je.entry_date BETWEEN _start_date AND _end_date
  LEFT JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE cc.organization_id = _org_id AND cc.is_active = true
  GROUP BY cc.id, cc.code, cc.name
  ORDER BY cc.code
$$;

-- ========== ZATCA ==========
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS commercial_registration text,
  ADD COLUMN IF NOT EXISTS zatca_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.zatca_invoice_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  zatca_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_hash text,
  qr_code text,
  xml_content text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','accepted','rejected')),
  submission_response jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_zatca_org ON public.zatca_invoice_data(organization_id);
ALTER TABLE public.zatca_invoice_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zatca_select" ON public.zatca_invoice_data FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "zatca_insert" ON public.zatca_invoice_data FOR INSERT
  WITH CHECK (public.can_org_write(organization_id));
CREATE POLICY "zatca_update" ON public.zatca_invoice_data FOR UPDATE
  USING (public.can_org_write(organization_id));

CREATE TRIGGER trg_zatca_updated BEFORE UPDATE ON public.zatca_invoice_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- توليد QR Code TLV-encoded base64 (ZATCA Phase 1 simplified)
CREATE OR REPLACE FUNCTION public.generate_zatca_qr(_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv record; v_org record;
  v_qr_payload text;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = _invoice_id;
  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة');
  END IF;
  SELECT * INTO v_org FROM public.organizations WHERE id = v_inv.organization_id;

  -- حمولة مبسطة (Phase 1 needs proper TLV+base64; client may regenerate)
  v_qr_payload := concat(
    'Seller:', COALESCE(v_org.name, ''), '|',
    'VAT:', COALESCE(v_org.tax_number, ''), '|',
    'Date:', COALESCE(v_inv.issued_date::text, ''), '|',
    'Total:', COALESCE(v_inv.final_amount::text, '0'), '|',
    'VATAmount:', COALESCE((v_inv.final_amount * 0.15 / 1.15)::text, '0')
  );

  INSERT INTO public.zatca_invoice_data (organization_id, invoice_id, qr_code, status)
  VALUES (v_inv.organization_id, _invoice_id, v_qr_payload, 'pending')
  ON CONFLICT (invoice_id) DO UPDATE SET qr_code = EXCLUDED.qr_code, updated_at = now();

  RETURN jsonb_build_object('success', true, 'qr_payload', v_qr_payload);
END; $$;