-- Preserve the first recorded payment when another request retries the transition.
-- The payroll triggers validate and post the selected account for both payment methods.
CREATE OR REPLACE FUNCTION public.update_salary_status(p_salary_id uuid, p_status text, p_payment_date date DEFAULT NULL::date, p_payment_method text DEFAULT NULL::text, p_bank_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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

CREATE OR REPLACE FUNCTION operations_private.preserve_posted_salary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
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
CREATE OR REPLACE TRIGGER preserve_posted_salary BEFORE UPDATE OR DELETE ON public.monthly_salaries
FOR EACH ROW EXECUTE FUNCTION operations_private.preserve_posted_salary();

CREATE OR REPLACE FUNCTION operations_private.guard_salary_treasury_movement()
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
CREATE OR REPLACE TRIGGER guard_salary_treasury_movement BEFORE INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION operations_private.guard_salary_treasury_movement();

-- Production accrues payroll on save and settles the existing payable on payment.
-- Keep that attached trigger and journal pair. Change only the live treasury path.
DO $salary_treasury$
DECLARE
  definition text;
  old_normalization text := $old$
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
$old$;
  new_normalization text := $new$
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') <> 'paid') THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('cash', 'bank_transfer') THEN
      RAISE EXCEPTION 'اختر طريقة الدفع قبل صرف الراتب';
    END IF;
    IF NEW.bank_account_id IS NULL THEN
      RAISE EXCEPTION 'اختر حساب الخزينة قبل صرف الراتب. حدّث الصفحة لو اختيار الحساب مش ظاهر.';
    END IF;
    IF NOT COALESCE(NEW.net_salary > 0 AND NEW.net_salary < 'Infinity'::numeric, false) THEN
      RAISE EXCEPTION 'صافي الراتب يجب أن يكون مبلغًا موجبًا';
    END IF;
    SELECT COALESCE(currency, 'EGP') INTO v_bank_currency
    FROM public.bank_accounts
    WHERE id = NEW.bank_account_id AND organization_id = NEW.organization_id AND is_active
      AND treasury_kind = CASE NEW.payment_method WHEN 'cash' THEN 'cash' ELSE 'bank' END
    FOR NO KEY UPDATE;
    IF NOT FOUND OR v_bank_currency IS DISTINCT FROM NEW.currency THEN
      RAISE EXCEPTION 'حساب الخزينة غير موجود أو نوعه أو عملته مختلفة';
    END IF;
    NEW.payment_date := COALESCE(NEW.payment_date, CURRENT_DATE);
  END IF;
$new$;
  old_cash_condition text := '_source_type = ''expense_payment'' AND _payment_method = ''cash'' AND _bank_account_id IS NOT NULL';
  new_cash_condition text := '_source_type IN (''expense_payment'', ''salary_payment'') AND _payment_method = ''cash'' AND _bank_account_id IS NOT NULL';
  old_payroll_call text := '  PERFORM public.post_salary_accrual(NEW.id);';
  new_payroll_call text := $payroll$  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' THEN RETURN NEW; END IF;
  END IF;
  PERFORM public.post_salary_accrual(NEW.id);$payroll$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.monthly_salaries'::regclass
      AND tgfoid = 'public._trg_post_salary()'::regprocedure
      AND tgenabled IN ('O', 'A') AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'The expected payroll posting trigger is unavailable';
  END IF;

  SELECT pg_get_functiondef('public.normalize_salary_financials()'::regprocedure) INTO definition;
  IF strpos(definition, new_normalization) = 0 THEN
    IF strpos(definition, old_normalization) = 0 THEN
      RAISE EXCEPTION 'Unexpected salary normalization definition';
    END IF;
    EXECUTE replace(definition, old_normalization, new_normalization);
  END IF;

  SELECT pg_get_functiondef('public.sync_operating_bank_outflow(text,uuid,uuid,text,uuid,numeric,text,date,text,boolean)'::regprocedure)
  INTO definition;
  IF strpos(definition, new_cash_condition) = 0 THEN
    IF strpos(definition, old_cash_condition) = 0 THEN
      RAISE EXCEPTION 'Unexpected treasury outflow definition';
    END IF;
    EXECUTE replace(definition, old_cash_condition, new_cash_condition);
  END IF;

  SELECT pg_get_functiondef('public._trg_post_salary()'::regprocedure) INTO definition;
  IF strpos(definition, new_payroll_call) = 0 THEN
    IF strpos(definition, old_payroll_call) = 0 OR strpos(definition, 'PERFORM public.post_salary_payment(NEW.id);') = 0 THEN
      RAISE EXCEPTION 'Unexpected payroll posting definition';
    END IF;
    EXECUTE replace(definition, old_payroll_call, new_payroll_call);
  END IF;
END;
$salary_treasury$;
