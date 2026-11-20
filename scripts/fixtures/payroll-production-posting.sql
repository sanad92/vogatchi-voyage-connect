-- Baseline functions from the production payroll trigger chain. The fixture declares its
-- synthetic schema and attaches the existing triggers before the rollout.
CREATE OR REPLACE FUNCTION public.normalize_salary_financials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_withheld numeric;
  v_bank_currency text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION 'A paid salary requires an explicit reversal';
  END IF;
  NEW.base_salary := COALESCE(NEW.base_salary, 0);
  NEW.allowances := COALESCE(NEW.allowances, 0);
  NEW.overtime_hours := COALESCE(NEW.overtime_hours, 0);
  NEW.overtime_rate := COALESCE(NEW.overtime_rate, 0);
  NEW.overtime_amount := round(NEW.overtime_hours * NEW.overtime_rate, 2);
  NEW.bonus := COALESCE(NEW.bonus, 0);
  NEW.deductions := COALESCE(NEW.deductions, 0);
  NEW.tax_amount := COALESCE(NEW.tax_amount, 0);
  NEW.insurance_deduction := COALESCE(NEW.insurance_deduction, 0);
  NEW.currency := upper(COALESCE(NULLIF(NEW.currency, ''), 'EGP'));
  NEW.exchange_rate := COALESCE(NULLIF(NEW.exchange_rate, 0), 1);

  IF NEW.salary_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Salary month must use YYYY-MM format';
  END IF;
  IF LEAST(
    NEW.base_salary, NEW.allowances, NEW.overtime_hours, NEW.overtime_rate,
    NEW.bonus, NEW.deductions, NEW.tax_amount, NEW.insurance_deduction
  ) < 0 OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Salary amounts and exchange rate must be non-negative';
  END IF;

  NEW.gross_salary := round(
    NEW.base_salary + NEW.allowances + NEW.overtime_amount + NEW.bonus, 2
  );
  v_withheld := round(
    NEW.deductions + NEW.tax_amount + NEW.insurance_deduction, 2
  );
  IF v_withheld > NEW.gross_salary THEN
    RAISE EXCEPTION 'Payroll deductions cannot exceed gross salary';
  END IF;
  NEW.net_salary := round(NEW.gross_salary - v_withheld, 2);
  NEW.net_salary_egp := round(NEW.net_salary * NEW.exchange_rate, 2);

  IF NEW.status = 'paid'
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') <> 'paid'
       OR COALESCE(OLD.payment_method, '') <> '') THEN
    IF COALESCE(NEW.payment_method, '') = '' THEN
      RAISE EXCEPTION 'Payment method is required before paying salary';
    END IF;
    IF NEW.payment_method <> 'cash' THEN
      IF NEW.bank_account_id IS NULL THEN
        RAISE EXCEPTION 'Treasury account is required for non-cash salary payment';
      END IF;
      SELECT COALESCE(currency, 'EGP') INTO v_bank_currency
      FROM public.bank_accounts
      WHERE id = NEW.bank_account_id
        AND organization_id = NEW.organization_id
        AND is_active;
      IF NOT FOUND OR v_bank_currency IS DISTINCT FROM NEW.currency THEN
        RAISE EXCEPTION 'Salary treasury is missing, inactive, or uses another currency';
      END IF;
    ELSE
      NEW.bank_account_id := NULL;
    END IF;
    NEW.payment_date := COALESCE(NEW.payment_date, CURRENT_DATE);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_salary_accrual(_salary_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.monthly_salaries%ROWTYPE;
  v_je uuid;
  v_salary_expense uuid;
  v_salary_payable uuid;
  v_tax_payable uuid;
  v_insurance_payable uuid;
  v_deductions_payable uuid;
BEGIN
  SELECT * INTO s FROM public.monthly_salaries WHERE id = _salary_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_je
  FROM public.journal_entries
  WHERE organization_id = s.organization_id
    AND source_type = 'salary_accrual' AND source_id = s.id;

  IF COALESCE(s.status, 'pending') = 'cancelled'
     OR COALESCE(s.gross_salary, 0) <= 0 THEN
    DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
    RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
  ) THEN RETURN v_je; END IF;

  v_salary_expense := public._resolve_account(s.organization_id, '6000');
  v_salary_payable := public._resolve_account(s.organization_id, '2200');
  v_tax_payable := public._resolve_account(s.organization_id, '2100');
  v_insurance_payable := public._resolve_account(s.organization_id, '2210');
  v_deductions_payable := public._resolve_account(s.organization_id, '2220');
  IF v_salary_expense IS NULL OR v_salary_payable IS NULL
     OR v_tax_payable IS NULL OR v_insurance_payable IS NULL
     OR v_deductions_payable IS NULL THEN
    RAISE EXCEPTION 'Missing payroll expense or payable account';
  END IF;

  DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency, source_type,
    source_id, functional_currency, fx_rate, posted_at, auto_generated
  ) VALUES (
    s.organization_id, public._next_entry_number(s.organization_id),
    to_date(s.salary_month || '-01', 'YYYY-MM-DD'), 'salary_accrual', s.id,
    'استحقاق راتب شهر ' || s.salary_month,
    s.gross_salary, s.gross_salary, 'posted', s.currency,
    'salary_accrual', s.id, s.currency, 1, now(), true
  ) RETURNING id INTO v_je;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, debit, credit, description, line_order
  ) VALUES (v_je, v_salary_expense, s.gross_salary, 0, 'إجمالي مصروف الراتب', 1);
  IF s.net_salary > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_salary_payable, 0, s.net_salary, 'صافي راتب مستحق', 2);
  END IF;
  IF s.tax_amount > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_tax_payable, 0, s.tax_amount, 'ضريبة راتب مستحقة', 3);
  END IF;
  IF s.insurance_deduction > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_insurance_payable, 0, s.insurance_deduction, 'تأمينات مستحقة', 4);
  END IF;
  IF s.deductions > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, debit, credit, description, line_order
    ) VALUES (v_je, v_deductions_payable, 0, s.deductions, 'استقطاعات أخرى مستحقة', 5);
  END IF;

  RETURN v_je;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_salary_payment(_salary_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.monthly_salaries%ROWTYPE;
  v_je uuid;
  v_payable uuid;
  v_treasury uuid;
  v_kind text;
  v_bank_currency text;
BEGIN
  SELECT * INTO s FROM public.monthly_salaries WHERE id = _salary_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT id INTO v_je
  FROM public.journal_entries
  WHERE organization_id = s.organization_id
    AND source_type = 'salary_payment' AND source_id = s.id;

  IF s.status <> 'paid' OR COALESCE(s.payment_method, '') = '' THEN
    DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
    PERFORM public.sync_operating_bank_outflow(
      'salary_payment', s.id, s.organization_id, s.payment_method,
      s.bank_account_id, s.net_salary, s.currency, s.payment_date,
      'صرف راتب شهر ' || s.salary_month, false
    );
    RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries WHERE id = v_je AND is_locked
  ) THEN RETURN v_je; END IF;

  IF s.payment_method = 'cash' THEN
    v_kind := 'cash';
  ELSE
    SELECT treasury_kind, COALESCE(currency, 'EGP')
      INTO v_kind, v_bank_currency
    FROM public.bank_accounts
    WHERE id = s.bank_account_id
      AND organization_id = s.organization_id
      AND is_active;
    IF NOT FOUND OR v_bank_currency IS DISTINCT FROM s.currency THEN
      RAISE EXCEPTION 'Salary treasury is missing, inactive, or uses another currency';
    END IF;
  END IF;

  v_payable := public._resolve_account(s.organization_id, '2200');
  v_treasury := public._resolve_account(
    s.organization_id, CASE WHEN v_kind = 'cash' THEN '1000' ELSE '1010' END
  );
  IF v_payable IS NULL OR v_treasury IS NULL THEN
    RAISE EXCEPTION 'Missing salary payable or treasury account';
  END IF;

  DELETE FROM public.journal_entries WHERE id = v_je AND NOT is_locked;
  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, currency, source_type,
    source_id, functional_currency, fx_rate, posted_at, auto_generated
  ) VALUES (
    s.organization_id, public._next_entry_number(s.organization_id),
    COALESCE(s.payment_date, CURRENT_DATE), 'salary_payment', s.id,
    'صرف راتب شهر ' || s.salary_month,
    s.net_salary, s.net_salary, 'posted', s.currency,
    'salary_payment', s.id, s.currency, 1, now(), true
  ) RETURNING id INTO v_je;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, debit, credit, description, line_order
  ) VALUES
    (v_je, v_payable, s.net_salary, 0, 'تسوية صافي الراتب المستحق', 1),
    (v_je, v_treasury, 0, s.net_salary, 'صرف الراتب', 2);

  PERFORM public.sync_operating_bank_outflow(
    'salary_payment', s.id, s.organization_id, s.payment_method,
    s.bank_account_id, s.net_salary, s.currency, s.payment_date,
    'صرف راتب شهر ' || s.salary_month, true
  );
  RETURN v_je;
END;
$function$;

CREATE OR REPLACE FUNCTION public._trg_post_salary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.post_salary_accrual(NEW.id);
  PERFORM public.post_salary_payment(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_operating_bank_outflow(_source_type text, _source_id uuid, _org_id uuid, _payment_method text, _bank_account_id uuid, _amount numeric, _currency text, _transaction_date date, _description text, _is_paid boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing uuid;
  v_existing_account uuid;
  v_existing_amount numeric;
  v_bank_currency text;
  v_treasury_kind text;
  v_current_balance numeric;
  v_is_cash_expense boolean := _source_type = 'expense_payment' AND _payment_method = 'cash' AND _bank_account_id IS NOT NULL;
BEGIN
  SELECT id, bank_account_id, amount INTO v_existing, v_existing_account, v_existing_amount
  FROM public.bank_account_transactions
  WHERE organization_id = _org_id
    AND source_type = _source_type
    AND source_id = _source_id;

  IF NOT COALESCE(_is_paid, false) OR (COALESCE(_payment_method, '') = 'cash' AND NOT COALESCE(v_is_cash_expense, false)) THEN
    IF v_existing IS NOT NULL THEN
      DELETE FROM public.bank_account_transactions WHERE id = v_existing;
    END IF;
    RETURN NULL;
  END IF;

  IF _bank_account_id IS NULL THEN
    RAISE EXCEPTION 'A treasury account is required for non-cash payment';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Treasury outflow amount must be positive';
  END IF;

  SELECT COALESCE(currency, 'EGP'), treasury_kind, COALESCE(current_balance, 0)
    INTO v_bank_currency, v_treasury_kind, v_current_balance
  FROM public.bank_accounts
  WHERE id = _bank_account_id
    AND organization_id = _org_id
    AND is_active
  FOR NO KEY UPDATE;

  IF NOT FOUND OR v_bank_currency IS DISTINCT FROM COALESCE(_currency, 'EGP') THEN
    RAISE EXCEPTION 'Treasury account is missing, inactive, or uses another currency';
  END IF;

  IF v_is_cash_expense THEN
    IF v_treasury_kind IS DISTINCT FROM 'cash' THEN
      RAISE EXCEPTION 'Select a cash account for a cash expense';
    END IF;
    IF v_current_balance = 'NaN'::numeric OR v_current_balance +
       (CASE WHEN v_existing_account = _bank_account_id THEN v_existing_amount ELSE 0 END) < _amount THEN
      RAISE EXCEPTION 'Cash treasury has insufficient balance';
    END IF;
  END IF;

  INSERT INTO public.bank_account_transactions (
    bank_account_id, transaction_type, amount, description, transaction_date,
    reference_number, created_by, organization_id, source_type, source_id, currency
  ) VALUES (
    _bank_account_id, 'withdrawal', _amount, _description,
    COALESCE(_transaction_date, CURRENT_DATE),
    upper(replace(_source_type, '_', '-')) || '-' || _source_id,
    auth.uid(), _org_id, _source_type, _source_id, COALESCE(_currency, 'EGP')
  )
  ON CONFLICT (organization_id, source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL
  DO UPDATE SET
    bank_account_id = EXCLUDED.bank_account_id,
    transaction_type = EXCLUDED.transaction_type,
    amount = EXCLUDED.amount,
    description = EXCLUDED.description,
    transaction_date = EXCLUDED.transaction_date,
    currency = EXCLUDED.currency
  RETURNING id INTO v_existing;

  RETURN v_existing;
END;
$function$;
