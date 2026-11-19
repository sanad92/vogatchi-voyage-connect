-- Preserve the first recorded payment when another request retries the transition.
-- The payroll triggers validate and post the selected account for both payment methods.
CREATE OR REPLACE FUNCTION public.update_salary_status(p_salary_id uuid, p_status text, p_payment_date date DEFAULT NULL::date, p_payment_method text DEFAULT NULL::text, p_bank_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.monthly_salaries%ROWTYPE;
BEGIN
  SELECT * INTO s
  FROM public.monthly_salaries
  WHERE id = p_salary_id
    AND public.has_org_hr_permission(organization_id, 'employees_salary')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'SALARY_NOT_FOUND');
  END IF;
  IF NOT coalesce(public.can_org_write(s.organization_id), false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid salary status';
  END IF;
  IF s.status = 'paid' THEN
    IF p_status <> 'paid' THEN
      RAISE EXCEPTION 'A paid salary requires an explicit reversal';
    END IF;
    IF coalesce(p_payment_date, s.payment_date) IS DISTINCT FROM s.payment_date
      OR coalesce(p_payment_method, s.payment_method) IS DISTINCT FROM s.payment_method
      OR coalesce(p_bank_account_id, s.bank_account_id) IS DISTINCT FROM s.bank_account_id
      OR coalesce(p_notes, s.notes) IS DISTINCT FROM s.notes THEN
      RAISE EXCEPTION 'تم تسجيل صرف الراتب بالفعل. حدّث الصفحة لمراجعة البيانات.';
    END IF;
    RETURN jsonb_build_object('success', true, 'old_status', s.status, 'new_status', s.status);
  END IF;

  IF p_status = 'paid' AND s.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'يمكن تسجيل الصرف للراتب المعلّق فقط';
  END IF;

  UPDATE public.monthly_salaries
  SET status = p_status,
      payment_date = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_date, payment_date, CURRENT_DATE) ELSE NULL END,
      payment_method = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_method, payment_method) ELSE NULL END,
      bank_account_id = CASE
        WHEN p_status <> 'paid' THEN NULL
        ELSE COALESCE(p_bank_account_id, bank_account_id) END,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_salary_id;

  RETURN jsonb_build_object(
    'success', true, 'old_status', s.status, 'new_status', p_status
  );
END;
$function$
;

CREATE FUNCTION operations_private.preserve_posted_salary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'paid' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'A paid salary requires an explicit reversal';
    END IF;
    IF (OLD.organization_id, OLD.employee_id, OLD.salary_month, OLD.status, OLD.payment_date,
        OLD.payment_method, OLD.bank_account_id, OLD.net_salary, OLD.net_salary_egp, OLD.currency, OLD.exchange_rate)
      IS DISTINCT FROM
       (NEW.organization_id, NEW.employee_id, NEW.salary_month, NEW.status, NEW.payment_date,
        NEW.payment_method, NEW.bank_account_id, NEW.net_salary, NEW.net_salary_egp, NEW.currency, NEW.exchange_rate) THEN
      RAISE EXCEPTION 'A paid salary requires an explicit reversal';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.preserve_posted_salary() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER preserve_posted_salary BEFORE UPDATE OR DELETE ON public.monthly_salaries
FOR EACH ROW EXECUTE FUNCTION operations_private.preserve_posted_salary();

CREATE FUNCTION operations_private.guard_salary_treasury_movement()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF (TG_OP <> 'INSERT' AND OLD.source_type = 'salary_payment')
      OR (TG_OP <> 'DELETE' AND NEW.source_type = 'salary_payment') THEN
      RAISE EXCEPTION 'salary_payment_linked_movement' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.guard_salary_treasury_movement() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_salary_treasury_movement BEFORE INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION operations_private.guard_salary_treasury_movement();

CREATE OR REPLACE FUNCTION public.trg_salary_to_journal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account public.bank_accounts%ROWTYPE;
  v_currency text := upper(COALESCE(NULLIF(NEW.currency, ''), 'EGP'));
  v_payment_date date := COALESCE(NEW.payment_date, CURRENT_DATE);
  v_amount numeric := NEW.net_salary;
  v_kind text;
  v_treasury_code text;
  v_journal_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' THEN RETURN NEW; END IF;
    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'يمكن تسجيل الصرف للراتب المعلّق فقط';
    END IF;
  END IF;

  IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('cash', 'bank_transfer') THEN
    RAISE EXCEPTION 'اختر طريقة الدفع قبل صرف الراتب';
  END IF;
  IF NEW.bank_account_id IS NULL THEN
    RAISE EXCEPTION 'اختر حساب الخزينة قبل صرف الراتب';
  END IF;
  IF NOT COALESCE(v_amount > 0 AND v_amount < 'Infinity'::numeric, false) THEN
    RAISE EXCEPTION 'صافي الراتب يجب أن يكون مبلغًا موجبًا';
  END IF;

  v_kind := CASE NEW.payment_method WHEN 'cash' THEN 'cash' ELSE 'bank' END;
  SELECT * INTO v_account
  FROM public.bank_accounts
  WHERE id = NEW.bank_account_id AND organization_id = NEW.organization_id
    AND is_active AND treasury_kind = v_kind AND COALESCE(currency, 'EGP') = v_currency
  FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'حساب الخزينة غير موجود أو نوعه أو عملته مختلفة';
  END IF;
  IF v_kind = 'cash' AND (v_account.current_balance = 'NaN'::numeric
    OR COALESCE(v_account.current_balance, 0) < v_amount) THEN
    RAISE EXCEPTION 'رصيد الخزنة النقدية غير كافٍ';
  END IF;

  v_treasury_code := public._require_route_code(NEW.organization_id, v_kind);
  INSERT INTO public.bank_account_transactions (
    bank_account_id, transaction_type, amount, description, transaction_date,
    reference_number, created_by, organization_id, source_type, source_id, currency
  ) VALUES (
    v_account.id, 'withdrawal', v_amount, 'صرف راتب شهري', v_payment_date,
    'SALARY-' || NEW.id, auth.uid(), NEW.organization_id, 'salary_payment', NEW.id, v_currency
  );

  v_journal_id := public.post_journal_entry(
    NEW.organization_id, v_payment_date, 'صرف راتب شهري', 'salary', NEW.id,
    jsonb_build_array(
      jsonb_build_object('account_code', '6000', 'debit', v_amount, 'credit', 0, 'description', 'مصروف راتب شهري'),
      jsonb_build_object('account_code', v_treasury_code, 'debit', 0, 'credit', v_amount, 'description', 'صرف راتب')),
    v_currency
  );
  IF v_journal_id IS NULL THEN RAISE EXCEPTION 'تعذّر ترحيل قيد صرف الراتب'; END IF;
  RETURN NEW;
END;
$$;
