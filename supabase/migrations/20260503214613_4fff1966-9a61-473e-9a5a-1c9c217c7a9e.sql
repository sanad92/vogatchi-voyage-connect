
-- 1. Add currency column to journal_entries
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';

CREATE INDEX IF NOT EXISTS idx_journal_entries_org_currency
  ON public.journal_entries(organization_id, currency);

-- 2. Replace post_journal_entry to accept optional currency (default EGP, backward compatible)
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  _org_id uuid, _entry_date date, _description text,
  _reference_type text, _reference_id uuid, _lines jsonb,
  _currency text DEFAULT 'EGP'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_entry_id UUID; v_entry_number TEXT;
  v_total_debit NUMERIC := 0; v_total_credit NUMERIC := 0;
  v_line JSONB; v_account_id UUID; v_order INTEGER := 0;
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
    description, total_debit, total_credit, status, created_by, currency
  ) VALUES (
    _org_id, v_entry_number, _entry_date, _reference_type, _reference_id,
    _description, v_total_debit, v_total_credit, 'posted', auth.uid(),
    COALESCE(NULLIF(_currency,''), 'EGP')
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
END;
$$;

-- 3. Update triggers to pass currency

CREATE OR REPLACE FUNCTION public.trg_invoice_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_revenue_code TEXT; v_lines JSONB;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.final_amount IS NULL OR NEW.final_amount = 0 THEN RETURN NEW; END IF;
  v_revenue_code := CASE NEW.booking_type
    WHEN 'hotel' THEN '4000' WHEN 'flight' THEN '4010'
    WHEN 'transport' THEN '4020' WHEN 'car_rental' THEN '4030'
    WHEN 'package' THEN '4040' ELSE '4900' END;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='invoice' AND reference_id = NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','1100','debit',NEW.final_amount,'credit',0,'description','فاتورة ' || COALESCE(NEW.invoice_number,'')),
    jsonb_build_object('account_code',v_revenue_code,'debit',0,'credit',NEW.final_amount,'description','إيراد فاتورة ' || COALESCE(NEW.invoice_number,''))
  );
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.issued_date, CURRENT_DATE),
    'فاتورة رقم ' || COALESCE(NEW.invoice_number,''), 'invoice', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'invoice journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_invoice_payment_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_delta numeric;
BEGIN
  v_delta := COALESCE(NEW.total_paid_amount,0) - COALESCE(OLD.total_paid_amount,0);
  IF NEW.organization_id IS NULL OR v_delta <= 0 THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE reference_type='invoice_payment' AND reference_id=NEW.id
      AND total_debit = v_delta AND entry_date = CURRENT_DATE
  ) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','1000','debit',v_delta,'credit',0,'description','تحصيل دفعة من عميل: ' || COALESCE(NEW.customer_name,'')),
    jsonb_build_object('account_code','1100','debit',0,'credit',v_delta,'description','تخفيض ذمم العميل')
  );
  PERFORM public.post_journal_entry(NEW.organization_id, CURRENT_DATE,
    'تحصيل دفعة فاتورة ' || NEW.invoice_number, 'invoice_payment', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'invoice payment journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_hotel_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.cost_per_night,0) * COALESCE(NEW.number_of_nights,0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='hotel_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5000','debit',v_cost,'credit',0,'description','تكلفة فندق'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز فندق', 'hotel_cost', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'hotel cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_flight_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost_egp, NEW.supplier_cost, 0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='flight_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5010','debit',v_cost,'credit',0,'description','تكلفة طيران'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز طيران', 'flight_cost', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'flight cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_car_rental_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost_egp, NEW.supplier_total_cost, 0)
    + COALESCE(NEW.insurance_cost,0) + COALESCE(NEW.additional_fees,0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='car_rental_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5030','debit',v_cost,'credit',0,'description','تكلفة تأجير سيارة'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.rental_start_date, CURRENT_DATE),
    'تكلفة تأجير سيارة', 'car_rental_cost', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'car rental cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_transport_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost,0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='transport_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5020','debit',v_cost,'credit',0,'description','تكلفة نقل'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز نقل', 'transport_cost', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'transport cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_expense_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines JSONB;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.amount IS NULL OR NEW.amount = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='expense' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6900','debit',NEW.amount,'credit',0,'description',COALESCE(NEW.description,'مصروف')),
    jsonb_build_object('account_code','1000','debit',0,'credit',NEW.amount,'description','دفع مصروف')
  );
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.transaction_date, CURRENT_DATE),
    COALESCE(NEW.description,'مصروف'), 'expense', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'expense journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_rent_payment_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_amount numeric;
BEGIN
  v_amount := COALESCE(NEW.amount, NEW.amount_egp, 0);
  IF NEW.organization_id IS NULL OR v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='rent_payment' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6100','debit',v_amount,'credit',0,'description','مصروف إيجار شهري'),
    jsonb_build_object('account_code','1000','debit',0,'credit',v_amount,'description','دفع إيجار نقدي')
  );
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد إيجار', 'rent_payment', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'rent payment journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_commission_payment_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_amount numeric; v_org_id uuid;
BEGIN
  v_amount := COALESCE(NEW.total_commission_amount,0);
  v_org_id := NEW.organization_id;
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id FROM public.employees WHERE id = NEW.employee_id;
  END IF;
  IF v_org_id IS NULL OR v_amount = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='commission_payment' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6010','debit',v_amount,'credit',0,'description','مصروف عمولات موظف'),
    jsonb_build_object('account_code','1000','debit',0,'credit',v_amount,'description','دفع عمولات نقدي')
  );
  PERFORM public.post_journal_entry(v_org_id, COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد عمولات موظف', 'commission_payment', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'commission payment journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_supplier_payment_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb;
BEGIN
  IF NEW.organization_id IS NULL OR COALESCE(NEW.amount,0) = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='supplier_payment' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','2000','debit',NEW.amount,'credit',0,'description','سداد للمورد'),
    jsonb_build_object('account_code','1000','debit',0,'credit',NEW.amount,'description','دفع نقدي للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد مستحقات مورد', 'supplier_payment', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'supplier payment journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_salary_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_lines jsonb; v_amount numeric;
BEGIN
  v_amount := COALESCE(NEW.net_salary_egp, 0);
  IF NEW.organization_id IS NULL OR v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='salary' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','6000','debit',v_amount,'credit',0,'description','مصروف راتب شهري'),
    jsonb_build_object('account_code','1000','debit',0,'credit',v_amount,'description','صرف راتب'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.salary_month, CURRENT_DATE),
    'صرف راتب شهري', 'salary', NEW.id, v_lines, COALESCE(NEW.currency,'EGP'));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'salary journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;

-- 4. Backfill existing journal_entries currency from source tables
UPDATE public.journal_entries je SET currency = i.currency
  FROM public.invoices i WHERE je.reference_id = i.id AND je.reference_type IN ('invoice','invoice_payment') AND i.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = h.currency
  FROM public.hotel_bookings h WHERE je.reference_id = h.id AND je.reference_type='hotel_cost' AND h.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = f.currency
  FROM public.flight_bookings f WHERE je.reference_id = f.id AND je.reference_type='flight_cost' AND f.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = c.currency
  FROM public.car_rentals c WHERE je.reference_id = c.id AND je.reference_type='car_rental_cost' AND c.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = t.currency
  FROM public.transport_bookings t WHERE je.reference_id = t.id AND je.reference_type='transport_cost' AND t.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = e.currency
  FROM public.expense_transactions e WHERE je.reference_id = e.id AND je.reference_type='expense' AND e.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = r.currency
  FROM public.rent_payments r WHERE je.reference_id = r.id AND je.reference_type='rent_payment' AND r.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = cp.currency
  FROM public.commission_payments cp WHERE je.reference_id = cp.id AND je.reference_type='commission_payment' AND cp.currency IS NOT NULL;

UPDATE public.journal_entries je SET currency = sp.currency
  FROM public.supplier_payments sp WHERE je.reference_id = sp.id AND je.reference_type='supplier_payment' AND sp.currency IS NOT NULL;

-- 5. Reports filtered by currency
CREATE OR REPLACE FUNCTION public.get_income_statement(
  _org_id uuid, _start_date date, _end_date date, _currency text DEFAULT NULL
)
RETURNS TABLE(account_type account_type, account_code text, account_name text, account_name_ar text, amount numeric, currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar,
    CASE WHEN coa.account_type='revenue' THEN COALESCE(SUM(jel.credit) - SUM(jel.debit),0)
         ELSE COALESCE(SUM(jel.debit) - SUM(jel.credit),0) END,
    je.currency
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.status='posted' AND je.entry_date BETWEEN _start_date AND _end_date
    AND (_currency IS NULL OR je.currency = _currency)
  WHERE coa.organization_id = _org_id AND coa.is_active = true
    AND coa.account_type IN ('revenue','expense')
  GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar, je.currency
  HAVING COALESCE(SUM(jel.debit),0) <> 0 OR COALESCE(SUM(jel.credit),0) <> 0
  ORDER BY je.currency NULLS LAST, coa.account_type DESC, coa.account_code
$$;

CREATE OR REPLACE FUNCTION public.get_trial_balance(
  _org_id uuid, _end_date date DEFAULT NULL, _currency text DEFAULT NULL
)
RETURNS TABLE(account_id uuid, account_code text, account_name text, account_name_ar text, account_type account_type, total_debit numeric, total_credit numeric, balance numeric, currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coa.id, coa.account_code, coa.account_name, coa.account_name_ar, coa.account_type,
    COALESCE(SUM(jel.debit),0), COALESCE(SUM(jel.credit),0),
    COALESCE(SUM(jel.debit) - SUM(jel.credit),0),
    je.currency
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    AND je.status='posted'
    AND (_end_date IS NULL OR je.entry_date <= _end_date)
    AND (_currency IS NULL OR je.currency = _currency)
  WHERE coa.organization_id = _org_id AND coa.is_active = true
  GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_name_ar, coa.account_type, je.currency
  ORDER BY je.currency NULLS LAST, coa.account_code
$$;

CREATE OR REPLACE FUNCTION public.get_balance_sheet(
  _org_id uuid, _as_of_date date DEFAULT NULL, _currency text DEFAULT NULL
)
RETURNS TABLE(account_type account_type, account_code text, account_name text, account_name_ar text, balance numeric, currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar,
    CASE WHEN coa.account_type IN ('asset','expense') THEN COALESCE(SUM(jel.debit) - SUM(jel.credit),0)
         ELSE COALESCE(SUM(jel.credit) - SUM(jel.debit),0) END,
    je.currency
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status='posted'
    AND (_as_of_date IS NULL OR je.entry_date <= _as_of_date)
    AND (_currency IS NULL OR je.currency = _currency)
  WHERE coa.organization_id = _org_id AND coa.is_active = true
    AND coa.account_type IN ('asset','liability','equity')
  GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar, je.currency
  HAVING COALESCE(SUM(jel.debit),0) <> 0 OR COALESCE(SUM(jel.credit),0) <> 0
  ORDER BY je.currency NULLS LAST, coa.account_type, coa.account_code
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow(
  _org_id uuid, _start_date date, _end_date date, _currency text DEFAULT NULL
)
RETURNS TABLE(period_date date, inflows numeric, outflows numeric, net_flow numeric, currency text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT je.entry_date,
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.debit ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.credit ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.debit - jel.credit ELSE 0 END),0),
    je.currency
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.organization_id = _org_id AND je.status='posted'
    AND je.entry_date BETWEEN _start_date AND _end_date
    AND coa.account_code IN ('1000','1010')
    AND (_currency IS NULL OR je.currency = _currency)
  GROUP BY je.entry_date, je.currency
  ORDER BY je.entry_date, je.currency
$$;

-- 6. Helper to list active currencies
CREATE OR REPLACE FUNCTION public.get_active_currencies(_org_id uuid)
RETURNS TABLE(currency text, entries_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT currency, COUNT(*)::bigint
  FROM public.journal_entries
  WHERE organization_id = _org_id AND status='posted'
  GROUP BY currency
  ORDER BY COUNT(*) DESC
$$;
