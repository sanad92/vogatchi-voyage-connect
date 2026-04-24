-- B) Salaries
CREATE OR REPLACE FUNCTION public.trg_salary_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    'صرف راتب شهري', 'salary', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'salary journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_salary_journal ON public.monthly_salaries;
CREATE TRIGGER trg_salary_journal AFTER INSERT OR UPDATE OF status ON public.monthly_salaries
FOR EACH ROW EXECUTE FUNCTION public.trg_salary_to_journal();

-- C) Hotel cost
CREATE OR REPLACE FUNCTION public.trg_hotel_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.cost_per_night, 0) * COALESCE(NEW.number_of_nights, 0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='hotel_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5000','debit',v_cost,'credit',0,'description','تكلفة فندق'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز فندق', 'hotel_cost', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'hotel cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_hotel_cost_journal ON public.hotel_bookings;
CREATE TRIGGER trg_hotel_cost_journal AFTER INSERT ON public.hotel_bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_hotel_cost_to_journal();

-- D) Flight cost
CREATE OR REPLACE FUNCTION public.trg_flight_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost_egp, NEW.supplier_cost, 0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='flight_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5010','debit',v_cost,'credit',0,'description','تكلفة طيران'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز طيران', 'flight_cost', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'flight cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_flight_cost_journal ON public.flight_bookings;
CREATE TRIGGER trg_flight_cost_journal AFTER INSERT ON public.flight_bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_flight_cost_to_journal();

-- E) Transport cost
CREATE OR REPLACE FUNCTION public.trg_transport_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost, 0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='transport_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5020','debit',v_cost,'credit',0,'description','تكلفة نقل'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.booking_date, CURRENT_DATE),
    'تكلفة حجز نقل', 'transport_cost', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'transport cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_transport_cost_journal ON public.transport_bookings;
CREATE TRIGGER trg_transport_cost_journal AFTER INSERT ON public.transport_bookings
FOR EACH ROW EXECUTE FUNCTION public.trg_transport_cost_to_journal();

-- F) Car rental cost
CREATE OR REPLACE FUNCTION public.trg_car_rental_cost_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines jsonb; v_cost numeric;
BEGIN
  v_cost := COALESCE(NEW.supplier_cost_egp, NEW.supplier_total_cost, 0)
    + COALESCE(NEW.insurance_cost, 0) + COALESCE(NEW.additional_fees, 0);
  IF NEW.organization_id IS NULL OR v_cost = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='car_rental_cost' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','5030','debit',v_cost,'credit',0,'description','تكلفة تأجير سيارة'),
    jsonb_build_object('account_code','2000','debit',0,'credit',v_cost,'description','مستحق للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.rental_start_date, CURRENT_DATE),
    'تكلفة تأجير سيارة', 'car_rental_cost', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'car rental cost journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_car_rental_cost_journal ON public.car_rentals;
CREATE TRIGGER trg_car_rental_cost_journal AFTER INSERT ON public.car_rentals
FOR EACH ROW EXECUTE FUNCTION public.trg_car_rental_cost_to_journal();

-- G) Supplier payments
CREATE OR REPLACE FUNCTION public.trg_supplier_payment_to_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lines jsonb;
BEGIN
  IF NEW.organization_id IS NULL OR COALESCE(NEW.amount, 0) = 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE reference_type='supplier_payment' AND reference_id=NEW.id) THEN RETURN NEW; END IF;
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code','2000','debit',NEW.amount,'credit',0,'description','سداد للمورد'),
    jsonb_build_object('account_code','1000','debit',0,'credit',NEW.amount,'description','دفع نقدي للمورد'));
  PERFORM public.post_journal_entry(NEW.organization_id, COALESCE(NEW.payment_date, CURRENT_DATE),
    'سداد مستحقات مورد', 'supplier_payment', NEW.id, v_lines);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'supplier payment journal failed %: %', NEW.id, SQLERRM; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_supplier_payment_journal ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payment_journal AFTER INSERT ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_payment_to_journal();

-- H) Balance Sheet
CREATE OR REPLACE FUNCTION public.get_balance_sheet(_org_id uuid, _as_of_date date DEFAULT NULL)
RETURNS TABLE(account_type account_type, account_code text, account_name text, account_name_ar text, balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar,
    CASE WHEN coa.account_type IN ('asset','expense') THEN COALESCE(SUM(jel.debit) - SUM(jel.credit), 0)
         ELSE COALESCE(SUM(jel.credit) - SUM(jel.debit), 0) END
  FROM public.chart_of_accounts coa
  LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
  LEFT JOIN public.journal_entries je ON je.id = jel.journal_entry_id AND je.status='posted'
    AND (_as_of_date IS NULL OR je.entry_date <= _as_of_date)
  WHERE coa.organization_id = _org_id AND coa.is_active = true
    AND coa.account_type IN ('asset','liability','equity')
  GROUP BY coa.account_type, coa.account_code, coa.account_name, coa.account_name_ar
  HAVING COALESCE(SUM(jel.debit), 0) <> 0 OR COALESCE(SUM(jel.credit), 0) <> 0
  ORDER BY coa.account_type, coa.account_code
$$;

-- I) Cash Flow
CREATE OR REPLACE FUNCTION public.get_cash_flow(_org_id uuid, _start_date date, _end_date date)
RETURNS TABLE(period_date date, inflows numeric, outflows numeric, net_flow numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT je.entry_date,
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.credit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_code IN ('1000','1010') THEN jel.debit - jel.credit ELSE 0 END), 0)
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.organization_id = _org_id AND je.status = 'posted'
    AND je.entry_date BETWEEN _start_date AND _end_date
    AND coa.account_code IN ('1000','1010')
  GROUP BY je.entry_date ORDER BY je.entry_date
$$;

-- J) Customer Aging (uses total_paid_amount)
CREATE OR REPLACE FUNCTION public.get_customer_aging(_org_id uuid)
RETURNS TABLE(customer_id uuid, customer_name text, total_due numeric, 
  current_due numeric, days_30 numeric, days_60 numeric, days_90 numeric, days_over_90 numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.customer_id, i.customer_name,
    SUM(COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0)),
    SUM(CASE WHEN (CURRENT_DATE - i.due_date) <= 0 THEN COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 1 AND 30 THEN COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0) ELSE 0 END),
    SUM(CASE WHEN (CURRENT_DATE - i.due_date) > 90 THEN COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0) ELSE 0 END)
  FROM public.invoices i
  WHERE i.organization_id = _org_id
    AND COALESCE(i.final_amount,0) > COALESCE(i.total_paid_amount,0)
    AND i.customer_id IS NOT NULL
  GROUP BY i.customer_id, i.customer_name
  HAVING SUM(COALESCE(i.final_amount,0) - COALESCE(i.total_paid_amount,0)) > 0
  ORDER BY 3 DESC
$$;

-- K) Manual journal entry
CREATE OR REPLACE FUNCTION public.create_manual_journal_entry(
  _org_id uuid, _entry_date date, _description text, _lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_platform_admin(auth.uid()) 
    OR public.get_user_org_role(auth.uid(), _org_id) IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'غير مصرح لك بإنشاء قيود يدوية';
  END IF;
  RETURN public.post_journal_entry(_org_id, _entry_date, _description, 'manual', NULL, _lines);
END; $$;