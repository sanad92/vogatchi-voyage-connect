-- Restore the commission RPCs used by the UI and make net booking profit the
-- only commission base. All period calculations are currency-specific.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking_commission
ON public.employee_commissions(employee_id,booking_id)
WHERE booking_id IS NOT NULL AND payment_status<>'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_period_commission
ON public.employee_commission_periods(employee_id,period_start,period_end,currency)
WHERE status<>'cancelled';

CREATE OR REPLACE FUNCTION public.calculate_employee_commission(
  p_employee_id uuid,p_booking_amount numeric,p_commission_rate numeric DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;v_rate numeric;
BEGIN
  SELECT organization_id,COALESCE(commission_rate,0)
    INTO v_org,v_rate FROM public.employees WHERE id=p_employee_id AND is_active;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Active employee not found'; END IF;
  IF NOT public.user_belongs_to_org(auth.uid(),v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_rate<0 OR v_rate>100 THEN RAISE EXCEPTION 'Commission rate must be between 0 and 100'; END IF;
  IF p_commission_rate IS NOT NULL AND abs(p_commission_rate-v_rate)>0.001 THEN
    RAISE EXCEPTION 'Custom commission overrides are disabled; update the employee policy first';
  END IF;
  RETURN round(GREATEST(COALESCE(p_booking_amount,0),0)*v_rate/100,2);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_commission(
  p_employee_id uuid,p_booking_id uuid,p_commission_rate numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE b public.bookings%ROWTYPE;v_employee public.employees%ROWTYPE;v_rate numeric;v_amount numeric;v_id uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR SHARE;
  SELECT * INTO v_employee FROM public.employees WHERE id=p_employee_id AND is_active FOR SHARE;
  IF b.id IS NULL OR v_employee.id IS NULL THEN RAISE EXCEPTION 'Booking or active employee not found'; END IF;
  IF b.organization_id IS DISTINCT FROM v_employee.organization_id THEN RAISE EXCEPTION 'Employee and booking must belong to the same organization'; END IF;
  IF b.employee_id IS DISTINCT FROM p_employee_id THEN RAISE EXCEPTION 'Commission employee must match the employee assigned to the booking'; END IF;
  IF NOT public.can_org_write(b.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF b.status NOT IN ('confirmed','completed') OR b.is_demo THEN RAISE EXCEPTION 'Only real confirmed/completed bookings earn commission'; END IF;
  v_rate:=COALESCE(v_employee.commission_rate,0);
  IF v_rate<0 OR v_rate>100 THEN RAISE EXCEPTION 'Commission rate must be between 0 and 100'; END IF;
  IF p_commission_rate IS NOT NULL AND abs(p_commission_rate-v_rate)>0.001 THEN
    RAISE EXCEPTION 'Custom commission overrides are disabled; update the employee policy first';
  END IF;
  v_amount:=round(GREATEST(COALESCE(b.profit,0),0)*v_rate/100,2);
  IF v_amount<=0 THEN RAISE EXCEPTION 'Booking has no positive net profit'; END IF;
  INSERT INTO public.employee_commissions(
    employee_id,booking_id,booking_type,booking_amount,commission_rate,
    commission_amount,currency,commission_date,payment_status,notes,organization_id
  ) VALUES (
    p_employee_id,b.id,b.booking_type,b.profit,v_rate,v_amount,COALESCE(b.currency,'EGP'),
    COALESCE(b.start_date,CURRENT_DATE),'pending','10% policy: commission base is net booking profit',b.organization_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_commission(p_commission_id uuid,p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;v_status text;
BEGIN
  SELECT organization_id,payment_status INTO v_org,v_status
  FROM public.employee_commissions WHERE id=p_commission_id FOR UPDATE;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF NOT public.can_org_write(v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_status='paid' THEN RAISE EXCEPTION 'A paid commission cannot be cancelled directly'; END IF;
  UPDATE public.employee_commissions
  SET payment_status='cancelled',notes=concat_ws(E'\n',notes,'سبب الإلغاء: '||COALESCE(p_reason,'غير محدد')),updated_at=now()
  WHERE id=p_commission_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_employee_commissions(p_employee_id uuid)
RETURNS TABLE(commission_id uuid,issue text,expected_amount numeric,actual_amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.employees WHERE id=p_employee_id;
  IF v_org IS NULL OR NOT public.user_belongs_to_org(auth.uid(),v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT c.id,
         CASE
           WHEN b.id IS NULL THEN 'الحجز غير موجود'
           WHEN c.booking_amount IS DISTINCT FROM b.profit THEN 'أساس العمولة لا يساوي صافي ربح الحجز'
           WHEN abs(c.commission_amount-round(GREATEST(b.profit,0)*c.commission_rate/100,2))>0.01 THEN 'قيمة العمولة غير صحيحة'
           WHEN c.currency IS DISTINCT FROM b.currency THEN 'عملة العمولة مختلفة عن الحجز'
         END,
         round(GREATEST(COALESCE(b.profit,0),0)*COALESCE(c.commission_rate,0)/100,2),
         c.commission_amount
  FROM public.employee_commissions c
  LEFT JOIN public.bookings b ON b.id=c.booking_id
  WHERE c.employee_id=p_employee_id AND c.payment_status<>'cancelled'
    AND (
      b.id IS NULL OR c.booking_amount IS DISTINCT FROM b.profit
      OR abs(c.commission_amount-round(GREATEST(COALESCE(b.profit,0),0)*COALESCE(c.commission_rate,0)/100,2))>0.01
      OR c.currency IS DISTINCT FROM b.currency
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_employee_bookings_profit(
  p_employee_id uuid,p_period_start date,p_period_end date,p_currency text DEFAULT 'EGP'
)
RETURNS TABLE(
  booking_type text,booking_id uuid,booking_amount numeric,supplier_cost numeric,
  profit numeric,booking_date date,currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org uuid;v_currency text:=COALESCE(NULLIF(p_currency,''),'EGP');
BEGIN
  SELECT organization_id INTO v_org FROM public.employees WHERE id=p_employee_id AND is_active;
  IF v_org IS NULL OR NOT public.user_belongs_to_org(auth.uid(),v_org) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_period_start>p_period_end THEN RAISE EXCEPTION 'Start date must not be after end date'; END IF;
  RETURN QUERY
  SELECT b.booking_type,b.id,COALESCE(b.selling_price,0),COALESCE(b.cost_price,0),
         COALESCE(b.profit,0),COALESCE(b.start_date,b.created_at::date),v_currency
  FROM public.bookings b
  WHERE b.organization_id=v_org AND b.employee_id=p_employee_id AND NOT b.is_demo
    AND b.status IN ('confirmed','completed') AND COALESCE(b.currency,'EGP')=v_currency
    AND COALESCE(b.start_date,b.created_at::date) BETWEEN p_period_start AND p_period_end
  ORDER BY COALESCE(b.start_date,b.created_at::date),b.booking_number;
END;
$$;

-- Backward-compatible EGP-only signature used by older clients.
CREATE OR REPLACE FUNCTION public.calculate_employee_bookings_profit(
  p_employee_id uuid,p_period_start date,p_period_end date
)
RETURNS TABLE(
  booking_type text,booking_id uuid,booking_amount numeric,supplier_cost numeric,
  profit numeric,booking_date date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT x.booking_type,x.booking_id,x.booking_amount,x.supplier_cost,x.profit,x.booking_date
  FROM public.calculate_employee_bookings_profit(p_employee_id,p_period_start,p_period_end,'EGP') x;
$$;

CREATE OR REPLACE FUNCTION public.generate_period_commission(
  p_employee_id uuid,p_period_start date,p_period_end date,p_notes text DEFAULT NULL,
  p_currency text DEFAULT 'EGP'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_employee public.employees%ROWTYPE;v_currency text:=COALESCE(NULLIF(p_currency,''),'EGP');
  v_count int;v_sales numeric;v_cost numeric;v_profit numeric;v_rate numeric;v_commission numeric;v_id uuid;
BEGIN
  SELECT * INTO v_employee FROM public.employees WHERE id=p_employee_id AND is_active FOR SHARE;
  IF v_employee.id IS NULL OR NOT public.can_org_write(v_employee.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_period_start>p_period_end THEN RAISE EXCEPTION 'Start date must not be after end date'; END IF;
  SELECT COUNT(*),COALESCE(SUM(booking_amount),0),COALESCE(SUM(supplier_cost),0),COALESCE(SUM(profit),0)
    INTO v_count,v_sales,v_cost,v_profit
  FROM public.calculate_employee_bookings_profit(p_employee_id,p_period_start,p_period_end,v_currency);
  IF v_count=0 THEN
    RETURN jsonb_build_object('success',false,'message','لا توجد حجوزات مؤهلة بهذه العملة في الفترة المحددة');
  END IF;
  v_rate:=COALESCE(v_employee.commission_rate,0);
  IF v_rate<0 OR v_rate>100 THEN RAISE EXCEPTION 'Commission rate must be between 0 and 100'; END IF;
  v_commission:=round(GREATEST(v_profit,0)*v_rate/100,2);
  INSERT INTO public.employee_commission_periods(
    employee_id,period_start,period_end,total_bookings_count,total_booking_amount,
    total_supplier_cost,total_profit,commission_rate,commission_amount,currency,
    status,notes,created_by,organization_id
  ) VALUES (
    p_employee_id,p_period_start,p_period_end,v_count,v_sales,v_cost,v_profit,v_rate,
    v_commission,v_currency,'pending',p_notes,auth.uid(),v_employee.organization_id
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object(
    'success',true,'message','تم حساب وحفظ العمولة من صافي الربح','commission_period_id',v_id,
    'summary',jsonb_build_object('bookings_count',v_count,'total_profit',v_profit,
      'commission_amount',v_commission,'commission_rate',v_rate,'currency',v_currency)
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success',false,'message','تم إنشاء عمولة نشطة لنفس الموظف والفترة والعملة من قبل');
END;
$$;

CREATE OR REPLACE FUNCTION public.post_commission_period_accrual(_period_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE p public.employee_commission_periods%ROWTYPE;v_je uuid;v_exp uuid;v_payable uuid;
BEGIN
  SELECT * INTO p FROM public.employee_commission_periods WHERE id=_period_id;
  IF NOT FOUND OR p.organization_id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_je FROM public.journal_entries WHERE organization_id=p.organization_id AND source_type='commission_period_accrual' AND source_id=p.id;
  IF p.status='cancelled' OR COALESCE(p.commission_amount,0)<=0 THEN
    DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked; RETURN NULL;
  END IF;
  IF v_je IS NOT NULL AND EXISTS(SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked) THEN RETURN v_je; END IF;
  v_exp:=public._resolve_account(p.organization_id,'6010');v_payable:=public._resolve_account(p.organization_id,'2200');
  IF v_exp IS NULL OR v_payable IS NULL THEN RAISE EXCEPTION 'Missing commission expense/payable account'; END IF;
  DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked;
  INSERT INTO public.journal_entries(
    organization_id,entry_number,entry_date,reference_type,reference_id,description,
    total_debit,total_credit,status,currency,source_type,source_id,functional_currency,fx_rate,posted_at,auto_generated
  ) VALUES (
    p.organization_id,public._next_entry_number(p.organization_id),p.period_end,'commission_period',p.id,
    'استحقاق عمولة موظف للفترة',p.commission_amount,p.commission_amount,'posted',p.currency,
    'commission_period_accrual',p.id,p.currency,1,now(),true
  ) RETURNING id INTO v_je;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
  VALUES (v_je,v_exp,p.commission_amount,0,'مصروف عمولة',1),(v_je,v_payable,0,p.commission_amount,'عمولة مستحقة',2);
  RETURN v_je;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_commission_period_payment(_period_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE p public.employee_commission_periods%ROWTYPE;v_je uuid;v_cash uuid;v_payable uuid;
  v_kind text;v_bank_currency text;
BEGIN
  SELECT * INTO p FROM public.employee_commission_periods WHERE id=_period_id;
  IF NOT FOUND OR p.organization_id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_je FROM public.journal_entries WHERE organization_id=p.organization_id AND source_type='commission_period_payment' AND source_id=p.id;
  IF p.status<>'paid' THEN DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked; RETURN NULL; END IF;
  IF p.bank_account_id IS NULL THEN RAISE EXCEPTION 'Treasury account is required to pay commission'; END IF;
  IF v_je IS NOT NULL AND EXISTS(SELECT 1 FROM public.journal_entries WHERE id=v_je AND is_locked) THEN RETURN v_je; END IF;
  SELECT treasury_kind,COALESCE(currency,'EGP') INTO v_kind,v_bank_currency
  FROM public.bank_accounts
  WHERE id=p.bank_account_id AND organization_id=p.organization_id AND is_active;
  IF NOT FOUND OR v_bank_currency<>COALESCE(p.currency,'EGP') THEN
    RAISE EXCEPTION 'Commission treasury is missing, inactive, or uses another currency';
  END IF;
  v_cash:=public._resolve_account(p.organization_id,CASE WHEN v_kind='cash' THEN '1000' ELSE '1010' END);
  v_payable:=public._resolve_account(p.organization_id,'2200');
  IF v_cash IS NULL OR v_payable IS NULL THEN RAISE EXCEPTION 'Missing treasury/payable account'; END IF;
  DELETE FROM public.journal_entries WHERE id=v_je AND NOT is_locked;
  INSERT INTO public.journal_entries(
    organization_id,entry_number,entry_date,reference_type,reference_id,description,
    total_debit,total_credit,status,currency,source_type,source_id,functional_currency,fx_rate,posted_at,auto_generated
  ) VALUES (
    p.organization_id,public._next_entry_number(p.organization_id),COALESCE(p.payment_date,CURRENT_DATE),
    'commission_period_payment',p.id,'سداد عمولة موظف',p.commission_amount,p.commission_amount,
    'posted',p.currency,'commission_period_payment',p.id,p.currency,1,now(),true
  ) RETURNING id INTO v_je;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit,credit,description,line_order)
  VALUES (v_je,v_payable,p.commission_amount,0,'تسوية عمولة مستحقة',1),(v_je,v_cash,0,p.commission_amount,'سداد العمولة',2);
  RETURN v_je;
END;
$$;

CREATE OR REPLACE FUNCTION public._trg_post_commission_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  PERFORM public.post_commission_period_accrual(NEW.id);
  PERFORM public.post_commission_period_payment(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_commission_period ON public.employee_commission_periods;
CREATE TRIGGER trg_post_commission_period
AFTER INSERT OR UPDATE OF commission_amount,status,payment_date,bank_account_id,currency,period_end
ON public.employee_commission_periods FOR EACH ROW EXECUTE FUNCTION public._trg_post_commission_period();

CREATE OR REPLACE FUNCTION public.update_period_commission_status(
  p_commission_period_id uuid,p_status text,p_payment_date date DEFAULT NULL,
  p_payment_method text DEFAULT NULL,p_bank_account_id uuid DEFAULT NULL,p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE p public.employee_commission_periods%ROWTYPE;v_bank public.bank_accounts%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.employee_commission_periods WHERE id=p_commission_period_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.can_org_write(p.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status NOT IN ('pending','paid','cancelled') THEN RAISE EXCEPTION 'Invalid commission status'; END IF;
  IF p.status=p_status THEN RETURN jsonb_build_object('success',true,'message','الحالة لم تتغير','old_status',p.status,'new_status',p_status); END IF;

  IF p_status='paid' THEN
    IF p_bank_account_id IS NULL THEN RAISE EXCEPTION 'اختر حساب الخزينة قبل تسجيل الدفع'; END IF;
    SELECT * INTO v_bank FROM public.bank_accounts WHERE id=p_bank_account_id AND organization_id=p.organization_id AND is_active FOR UPDATE;
    IF v_bank.id IS NULL OR COALESCE(v_bank.currency,'EGP')<>COALESCE(p.currency,'EGP') THEN RAISE EXCEPTION 'حساب الخزينة غير موجود أو عملته مختلفة'; END IF;
    UPDATE public.bank_accounts SET current_balance=COALESCE(current_balance,0)-p.commission_amount,updated_at=now() WHERE id=v_bank.id;
    INSERT INTO public.bank_account_transactions(
      bank_account_id,transaction_type,amount,description,transaction_date,reference_number,created_by,organization_id
    ) VALUES (
      v_bank.id,'withdrawal',p.commission_amount,'سداد عمولة موظف',COALESCE(p_payment_date,CURRENT_DATE),
      'COMM-PERIOD-'||p.id,auth.uid(),p.organization_id
    );
  ELSIF p.status='paid' THEN
    UPDATE public.bank_accounts SET current_balance=COALESCE(current_balance,0)+p.commission_amount,updated_at=now()
    WHERE id=p.bank_account_id;
    DELETE FROM public.bank_account_transactions
    WHERE organization_id=p.organization_id AND reference_number='COMM-PERIOD-'||p.id;
  END IF;

  UPDATE public.employee_commission_periods
  SET status=p_status,
      payment_date=CASE WHEN p_status='paid' THEN COALESCE(p_payment_date,CURRENT_DATE) ELSE NULL END,
      payment_method=CASE WHEN p_status='paid' THEN COALESCE(p_payment_method,'bank_transfer') ELSE NULL END,
      bank_account_id=CASE WHEN p_status='paid' THEN p_bank_account_id ELSE NULL END,
      notes=COALESCE(p_notes,notes),updated_at=now()
  WHERE id=p.id;
  RETURN jsonb_build_object('success',true,'message','تم تحديث حالة العمولة','old_status',p.status,'new_status',p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_employee_commission(uuid,numeric,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_booking_commission(uuid,uuid,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cancel_commission(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.validate_employee_commissions(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.calculate_employee_bookings_profit(uuid,date,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.calculate_employee_bookings_profit(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.generate_period_commission(uuid,date,date,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_period_commission_status(uuid,text,date,text,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.post_commission_period_accrual(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.post_commission_period_payment(uuid) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_employee_commission(uuid,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_commission(uuid,uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_commission(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_employee_commissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employee_bookings_profit(uuid,date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_employee_bookings_profit(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_period_commission(uuid,date,date,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_period_commission_status(uuid,text,date,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_commission_period_accrual(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_commission_period_payment(uuid) TO service_role;

COMMIT;
