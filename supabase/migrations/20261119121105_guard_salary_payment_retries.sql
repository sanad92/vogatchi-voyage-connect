-- Preserve the first recorded payment when another request retries the transition.
CREATE OR REPLACE FUNCTION public.update_salary_status(p_salary_id uuid, p_status text, p_payment_date date DEFAULT NULL::date, p_payment_method text DEFAULT NULL::text, p_bank_account_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.monthly_salaries%ROWTYPE;
  v_bank_currency text;
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

  IF p_status = 'paid' THEN
    IF s.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'يمكن تسجيل الصرف للراتب المعلّق فقط';
    END IF;
    IF COALESCE(p_payment_method, s.payment_method, '') = '' THEN
      RAISE EXCEPTION 'اختر طريقة الدفع قبل صرف الراتب';
    END IF;
    IF COALESCE(p_payment_method, s.payment_method) <> 'cash' THEN
      IF COALESCE(p_bank_account_id, s.bank_account_id) IS NULL THEN
        RAISE EXCEPTION 'اختر حساب الخزينة قبل صرف الراتب';
      END IF;
      SELECT COALESCE(currency, 'EGP') INTO v_bank_currency
      FROM public.bank_accounts
      WHERE id = COALESCE(p_bank_account_id, s.bank_account_id)
        AND organization_id = s.organization_id
        AND is_active
        AND (coalesce(p_payment_method, s.payment_method) <> 'bank_transfer' OR treasury_kind = 'bank');
      IF NOT FOUND OR v_bank_currency IS DISTINCT FROM s.currency THEN
        RAISE EXCEPTION 'حساب الخزينة غير موجود أو عملته مختلفة';
      END IF;
    END IF;
  END IF;

  UPDATE public.monthly_salaries
  SET status = p_status,
      payment_date = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_date, payment_date, CURRENT_DATE) ELSE NULL END,
      payment_method = CASE WHEN p_status = 'paid'
        THEN COALESCE(p_payment_method, payment_method) ELSE NULL END,
      bank_account_id = CASE
        WHEN p_status <> 'paid' THEN NULL
        WHEN COALESCE(p_payment_method, payment_method) = 'cash' THEN NULL
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
