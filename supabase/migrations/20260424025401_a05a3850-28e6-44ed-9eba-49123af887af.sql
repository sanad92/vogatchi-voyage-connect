
-- ============================================
-- ACCOUNTING ENGINE - PHASE 1
-- ============================================

CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- 1. Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_name_ar TEXT,
  account_type public.account_type NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, account_code)
);
CREATE INDEX idx_coa_org ON public.chart_of_accounts(organization_id);
CREATE INDEX idx_coa_type ON public.chart_of_accounts(account_type);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_select" ON public.chart_of_accounts FOR SELECT
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "coa_insert" ON public.chart_of_accounts FOR INSERT
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "coa_update" ON public.chart_of_accounts FOR UPDATE
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "coa_delete" ON public.chart_of_accounts FOR DELETE
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) AND is_system = false);

CREATE TRIGGER update_coa_updated_at BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Journal Entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'posted',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, entry_number)
);
CREATE INDEX idx_je_org ON public.journal_entries(organization_id);
CREATE INDEX idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX idx_je_ref ON public.journal_entries(reference_type, reference_id);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "je_select" ON public.journal_entries FOR SELECT
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "je_insert" ON public.journal_entries FOR INSERT
WITH CHECK (organization_id = ANY(public.get_user_org_ids(auth.uid())));
CREATE POLICY "je_update_draft" ON public.journal_entries FOR UPDATE
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) AND status = 'draft');
CREATE POLICY "je_delete_draft" ON public.journal_entries FOR DELETE
USING (organization_id = ANY(public.get_user_org_ids(auth.uid())) AND status = 'draft');

CREATE TRIGGER update_je_updated_at BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  line_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON public.journal_entry_lines(account_id);
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jel_select" ON public.journal_entry_lines FOR SELECT
USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id
  AND (je.organization_id = ANY(public.get_user_org_ids(auth.uid())) OR public.is_platform_admin(auth.uid()))));
CREATE POLICY "jel_insert" ON public.journal_entry_lines FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id
  AND je.organization_id = ANY(public.get_user_org_ids(auth.uid()))));
CREATE POLICY "jel_update_draft" ON public.journal_entry_lines FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id
  AND je.organization_id = ANY(public.get_user_org_ids(auth.uid())) AND je.status = 'draft'));
CREATE POLICY "jel_delete_draft" ON public.journal_entry_lines FOR DELETE
USING (EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id
  AND je.organization_id = ANY(public.get_user_org_ids(auth.uid())) AND je.status = 'draft'));


-- 4. Helpers
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(_org_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.journal_entries
  WHERE organization_id = _org_id AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE);
  RETURN 'JE-' || to_char(now(), 'YYYY') || '-' || LPAD(v_count::TEXT, 6, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.get_account_id_by_code(_org_id UUID, _code TEXT)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.chart_of_accounts WHERE organization_id = _org_id AND account_code = _code LIMIT 1
$$;

-- 5. Seed default chart of accounts
CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts(_org_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE organization_id = _org_id AND is_system = true) THEN
    RETURN;
  END IF;
  INSERT INTO public.chart_of_accounts (organization_id, account_code, account_name, account_name_ar, account_type, is_system) VALUES
  (_org_id, '1000', 'Cash', 'النقدية', 'asset', true),
  (_org_id, '1010', 'Bank Accounts', 'الحسابات البنكية', 'asset', true),
  (_org_id, '1100', 'Accounts Receivable', 'ذمم العملاء', 'asset', true),
  (_org_id, '1200', 'Prepaid Expenses', 'مصروفات مدفوعة مقدماً', 'asset', true),
  (_org_id, '2000', 'Accounts Payable', 'ذمم الموردين', 'liability', true),
  (_org_id, '2100', 'Tax Payable', 'الضرائب المستحقة', 'liability', true),
  (_org_id, '2200', 'Salaries Payable', 'الرواتب المستحقة', 'liability', true),
  (_org_id, '3000', 'Owner Equity', 'حقوق الملاك', 'equity', true),
  (_org_id, '3100', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', true),
  (_org_id, '4000', 'Hotel Booking Revenue', 'إيرادات حجوزات الفنادق', 'revenue', true),
  (_org_id, '4010', 'Flight Booking Revenue', 'إيرادات حجوزات الطيران', 'revenue', true),
  (_org_id, '4020', 'Transport Revenue', 'إيرادات النقل', 'revenue', true),
  (_org_id, '4030', 'Car Rental Revenue', 'إيرادات تأجير السيارات', 'revenue', true),
  (_org_id, '4040', 'Tour Package Revenue', 'إيرادات الباقات السياحية', 'revenue', true),
  (_org_id, '4900', 'Other Revenue', 'إيرادات أخرى', 'revenue', true),
  (_org_id, '5000', 'Cost of Sales - Hotels', 'تكلفة المبيعات - فنادق', 'expense', true),
  (_org_id, '5010', 'Cost of Sales - Flights', 'تكلفة المبيعات - طيران', 'expense', true),
  (_org_id, '5020', 'Cost of Sales - Transport', 'تكلفة المبيعات - نقل', 'expense', true),
  (_org_id, '5030', 'Cost of Sales - Car Rental', 'تكلفة المبيعات - سيارات', 'expense', true),
  (_org_id, '6000', 'Salaries Expense', 'مصروف الرواتب', 'expense', true),
  (_org_id, '6010', 'Commission Expense', 'مصروف العمولات', 'expense', true),
  (_org_id, '6100', 'Rent Expense', 'مصروف الإيجار', 'expense', true),
  (_org_id, '6200', 'Utilities Expense', 'مصروف المرافق', 'expense', true),
  (_org_id, '6300', 'Marketing Expense', 'مصروف التسويق', 'expense', true),
  (_org_id, '6400', 'Office Supplies', 'مصروف القرطاسية', 'expense', true),
  (_org_id, '6900', 'Other Expenses', 'مصروفات أخرى', 'expense', true);
END; $$;


-- 6. Core RPC: post_journal_entry
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  _org_id UUID, _entry_date DATE, _description TEXT,
  _reference_type TEXT, _reference_id UUID, _lines JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number TEXT;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line JSONB;
  v_account_id UUID;
  v_order INTEGER := 0;
BEGIN
  PERFORM public.seed_default_chart_of_accounts(_org_id);

  FOR v_line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
  END LOOP;

  IF ROUND(v_total_debit, 2) <> ROUND(v_total_credit, 2) THEN
    RAISE EXCEPTION 'القيد غير متوازن: مدين=% دائن=%', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit = 0 THEN RETURN NULL; END IF;

  v_entry_number := public.generate_journal_entry_number(_org_id);

  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, created_by
  ) VALUES (
    _org_id, v_entry_number, _entry_date, _reference_type, _reference_id,
    _description, v_total_debit, v_total_credit, 'posted', auth.uid()
  ) RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    v_account_id := public.get_account_id_by_code(_org_id, v_line->>'account_code');
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'الحساب غير موجود: %', v_line->>'account_code';
    END IF;
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (
      v_entry_id, v_account_id,
      COALESCE((v_line->>'debit')::NUMERIC, 0),
      COALESCE((v_line->>'credit')::NUMERIC, 0),
      v_line->>'description', v_order
    );
    v_order := v_order + 1;
  END LOOP;

  RETURN v_entry_id;
END; $$;


-- 7. Get account balance
CREATE OR REPLACE FUNCTION public.get_account_balance(
  _account_id UUID, _start_date DATE DEFAULT NULL, _end_date DATE DEFAULT NULL
) RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(jel.debit) - SUM(jel.credit), 0)
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = _account_id AND je.status = 'posted'
    AND (_start_date IS NULL OR je.entry_date >= _start_date)
    AND (_end_date IS NULL OR je.entry_date <= _end_date)
$$;


-- 8. Trial Balance
CREATE OR REPLACE FUNCTION public.get_trial_balance(_org_id UUID, _end_date DATE DEFAULT NULL)
RETURNS TABLE (
  account_id UUID, account_code TEXT, account_name TEXT, account_name_ar TEXT,
  account_type public.account_type, total_debit NUMERIC, total_credit NUMERIC, balance NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coa.id, coa.account_code, coa.account_name, coa.account_name_ar, coa.account_type,
    COALESCE(SUM(jel.debit), 0), COALESCE(SUM(jel.credit), 0),
    COALESCE(SUM(jel.debit) - SUM(jel.credit), 0)
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id 
    AND je.status = 'posted' AND (_end_date IS NULL OR je.entry_date <= _end_date)
  WHERE coa.organization_id = _org_id AND coa.is_active = true
  GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_name_ar, coa.account_type
  ORDER BY coa.account_code
$$;


-- 9. Income Statement
CREATE OR REPLACE FUNCTION public.get_income_statement(
  _org_id UUID, _start_date DATE, _end_date DATE
) RETURNS TABLE (
  account_type public.account_type, account_code TEXT, account_name TEXT,
  account_name_ar TEXT, amount NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar,
    CASE WHEN coa.account_type = 'revenue' THEN COALESCE(SUM(jel.credit) - SUM(jel.debit), 0)
         ELSE COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) END
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id 
    AND je.status = 'posted' AND je.entry_date BETWEEN _start_date AND _end_date
  WHERE coa.organization_id = _org_id AND coa.is_active = true
    AND coa.account_type IN ('revenue', 'expense')
  GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar
  HAVING COALESCE(SUM(jel.debit), 0) <> 0 OR COALESCE(SUM(jel.credit), 0) <> 0
  ORDER BY coa.account_type DESC, coa.account_code
$$;


-- 10. Trigger: Invoice → Journal Entry
CREATE OR REPLACE FUNCTION public.trg_invoice_to_journal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_revenue_code TEXT; v_lines JSONB;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.final_amount IS NULL OR NEW.final_amount = 0 THEN
    RETURN NEW;
  END IF;

  v_revenue_code := CASE NEW.booking_type
    WHEN 'hotel' THEN '4000' WHEN 'flight' THEN '4010'
    WHEN 'transport' THEN '4020' WHEN 'car_rental' THEN '4030'
    WHEN 'package' THEN '4040' ELSE '4900'
  END;

  IF EXISTS (SELECT 1 FROM public.journal_entries 
    WHERE reference_type = 'invoice' AND reference_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '1100', 'debit', NEW.final_amount, 'credit', 0,
      'description', 'فاتورة ' || COALESCE(NEW.invoice_number, '')),
    jsonb_build_object('account_code', v_revenue_code, 'debit', 0, 'credit', NEW.final_amount,
      'description', 'إيراد فاتورة ' || COALESCE(NEW.invoice_number, ''))
  );

  PERFORM public.post_journal_entry(
    NEW.organization_id, COALESCE(NEW.issued_date, CURRENT_DATE),
    'فاتورة رقم ' || COALESCE(NEW.invoice_number, ''),
    'invoice', NEW.id, v_lines
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'فشل ترحيل القيد للفاتورة %: %', NEW.id, SQLERRM;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_invoice_journal AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_to_journal();


-- 11. Trigger: Expense → Journal Entry
CREATE OR REPLACE FUNCTION public.trg_expense_to_journal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines JSONB;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.amount IS NULL OR NEW.amount = 0 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.journal_entries 
    WHERE reference_type = 'expense' AND reference_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '6900', 'debit', NEW.amount, 'credit', 0,
      'description', COALESCE(NEW.description, 'مصروف')),
    jsonb_build_object('account_code', '1000', 'debit', 0, 'credit', NEW.amount,
      'description', 'دفع مصروف')
  );

  PERFORM public.post_journal_entry(
    NEW.organization_id, COALESCE(NEW.transaction_date, CURRENT_DATE),
    COALESCE(NEW.description, 'مصروف'),
    'expense', NEW.id, v_lines
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'فشل ترحيل القيد للمصروف %: %', NEW.id, SQLERRM;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_expense_journal AFTER INSERT ON public.expense_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_expense_to_journal();
