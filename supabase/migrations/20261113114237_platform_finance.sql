BEGIN;

CREATE SCHEMA platform_finance_private;
REVOKE ALL ON SCHEMA platform_finance_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA platform_finance_private TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_finance_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE platform_finance_private.staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('accountant', 'auditor'))
);

CREATE TABLE platform_finance_private.access_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  previous_role text,
  new_role text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_finance_accounts (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('asset','liability','equity','income','expense'))
);

INSERT INTO public.platform_finance_accounts VALUES
  ('1010','الخزينة','Cash','asset'),
  ('1020','البنك','Bank','asset'),
  ('1030','مستحقات بوابة الدفع','Payment gateway clearing','asset'),
  ('2010','التزامات أخرى','Other liabilities','liability'),
  ('3010','الأرصدة الافتتاحية ورأس المال','Opening balances and capital','equity'),
  ('4010','إيرادات الاشتراكات','Subscription income','income'),
  ('4090','إيرادات أخرى','Other income','income'),
  ('5010','استضافة وخدمات تقنية','Hosting and technology','expense'),
  ('5020','التسويق','Marketing','expense'),
  ('5030','رسوم بوابة الدفع','Payment processing fees','expense'),
  ('5090','مصروفات تشغيلية أخرى','Other operating expenses','expense');

CREATE TABLE public.platform_finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  entry_date date NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  memo text NOT NULL CHECK (length(trim(memo)) BETWEEN 1 AND 500),
  source text NOT NULL CHECK (source IN ('manual','bank_transfer','paymob','reversal')),
  source_id uuid,
  request_id uuid UNIQUE,
  reverses_id uuid UNIQUE REFERENCES public.platform_finance_entries(id),
  posted_by uuid,
  posted_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source = 'reversal') = (reverses_id IS NOT NULL)),
  CHECK ((source IN ('bank_transfer','paymob')) = (source_id IS NOT NULL)),
  UNIQUE (source, source_id)
);

CREATE TABLE public.platform_finance_lines (
  entry_id uuid NOT NULL REFERENCES public.platform_finance_entries(id),
  line_no integer NOT NULL,
  account_code text NOT NULL REFERENCES public.platform_finance_accounts(code),
  debit numeric(18,2) NOT NULL,
  credit numeric(18,2) NOT NULL,
  PRIMARY KEY (entry_id, line_no),
  CHECK ((debit > 0 AND debit < 1e16 AND credit = 0) OR
         (credit > 0 AND credit < 1e16 AND debit = 0))
);

CREATE INDEX platform_finance_entries_currency_date_idx
  ON public.platform_finance_entries (currency, entry_date DESC, entry_no DESC);

CREATE FUNCTION platform_finance_private.current_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN public.has_platform_role(auth.uid(), 'platform_owner') THEN 'owner'
    ELSE (SELECT role FROM platform_finance_private.staff WHERE user_id = auth.uid())
  END
$$;

CREATE FUNCTION public.get_platform_finance_role()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.current_role() $$;

ALTER TABLE public.platform_finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_finance_lines ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_finance_accounts, public.platform_finance_entries,
  public.platform_finance_lines FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_finance_accounts, public.platform_finance_entries,
  public.platform_finance_lines TO authenticated;

CREATE POLICY platform_finance_accounts_read ON public.platform_finance_accounts FOR SELECT TO authenticated
  USING ((SELECT platform_finance_private.current_role()) IS NOT NULL);
CREATE POLICY platform_finance_entries_read ON public.platform_finance_entries FOR SELECT TO authenticated
  USING ((SELECT platform_finance_private.current_role()) IS NOT NULL);
CREATE POLICY platform_finance_lines_read ON public.platform_finance_lines FOR SELECT TO authenticated
  USING ((SELECT platform_finance_private.current_role()) IS NOT NULL);

CREATE FUNCTION platform_finance_private.list_staff()
RETURNS TABLE (email text, role text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT u.email::text, s.role
  FROM platform_finance_private.staff s JOIN auth.users u ON u.id = s.user_id
  WHERE u.email IS NOT NULL ORDER BY u.email;
END
$$;

CREATE FUNCTION platform_finance_private.set_staff(p_email text, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_previous text;
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('accountant','auditor') THEN
    RAISE EXCEPTION 'Invalid finance role' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO STRICT v_user FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
    AND (p_role IS NULL OR email_confirmed_at IS NOT NULL);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 40897));
  SELECT role INTO v_previous FROM platform_finance_private.staff WHERE user_id = v_user;
  IF v_previous IS NOT DISTINCT FROM p_role THEN RETURN; END IF;
  IF p_role IS NULL THEN
    DELETE FROM platform_finance_private.staff WHERE user_id = v_user;
  ELSE
    INSERT INTO platform_finance_private.staff (user_id, role) VALUES (v_user, p_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  INSERT INTO platform_finance_private.access_log (user_id, changed_by, previous_role, new_role)
    VALUES (v_user, auth.uid(), v_previous, p_role);
EXCEPTION WHEN no_data_found OR too_many_rows THEN
  RAISE EXCEPTION 'A unique confirmed user account is required' USING ERRCODE = '22023';
END
$$;

CREATE FUNCTION public.list_platform_finance_staff()
RETURNS TABLE (email text, role text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM platform_finance_private.list_staff() $$;

CREATE FUNCTION public.set_platform_finance_staff(p_email text, p_role text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.set_staff(p_email, p_role) $$;

-- Only this internal function writes ledger entries and their balanced lines.
CREATE FUNCTION platform_finance_private.post_entry(
  p_date date, p_currency text, p_memo text, p_lines jsonb, p_source text,
  p_source_id uuid, p_request_id uuid, p_reverses_id uuid
) RETURNS uuid LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_debit numeric;
  v_credit numeric;
BEGIN
  IF p_date IS NULL OR p_date > (now() AT TIME ZONE 'Africa/Cairo')::date
     OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
     OR p_memo IS NULL OR length(trim(p_memo)) NOT BETWEEN 1 AND 500
     OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid journal entry' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_lines) NOT BETWEEN 2 AND 50 THEN
    RAISE EXCEPTION 'A journal entry requires 2 to 50 lines' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_lines) AS l(account_code text, debit numeric, credit numeric)
    WHERE l.account_code IS NULL OR l.debit IS NULL OR l.credit IS NULL
       OR l.debit <> round(l.debit, 2) OR l.credit <> round(l.credit, 2)
       OR NOT ((l.debit > 0 AND l.debit < 1e16 AND l.credit = 0)
            OR (l.credit > 0 AND l.credit < 1e16 AND l.debit = 0))
  ) THEN
    RAISE EXCEPTION 'Invalid journal line' USING ERRCODE = '22023';
  END IF;
  SELECT sum(l.debit), sum(l.credit) INTO v_debit, v_credit
    FROM jsonb_to_recordset(p_lines) AS l(debit numeric, credit numeric);
  IF v_debit IS DISTINCT FROM v_credit THEN
    RAISE EXCEPTION 'Debits and credits must balance' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.platform_finance_entries
    (entry_date,currency,memo,source,source_id,request_id,reverses_id,posted_by)
    VALUES (p_date,p_currency,trim(p_memo),p_source,p_source_id,p_request_id,p_reverses_id,auth.uid())
    ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.platform_finance_entries
    WHERE (source = p_source AND source_id = p_source_id)
       OR request_id = p_request_id OR reverses_id = p_reverses_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Journal entry conflict'; END IF;
    IF p_request_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.platform_finance_entries e WHERE e.id = v_id
        AND e.posted_by = auth.uid() AND e.entry_date = p_date AND e.currency = p_currency AND e.memo = trim(p_memo)
        AND (
          SELECT jsonb_agg(jsonb_build_object('account_code', l.account_code, 'debit', l.debit, 'credit', l.credit) ORDER BY l.line_no)
          FROM public.platform_finance_lines l WHERE l.entry_id = v_id
        ) = p_lines
    ) THEN
      RAISE EXCEPTION 'Request ID already used for a different entry' USING ERRCODE = '23505';
    END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.platform_finance_lines (entry_id,line_no,account_code,debit,credit)
  SELECT v_id, ordinality, line->>'account_code', (line->>'debit')::numeric, (line->>'credit')::numeric
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS rows(line, ordinality);
  RETURN v_id;
END
$$;

CREATE FUNCTION platform_finance_private.post_manual(
  p_date date, p_currency text, p_memo text, p_lines jsonb, p_request_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF coalesce(platform_finance_private.current_role(), '') NOT IN ('owner','accountant') THEN
    RAISE EXCEPTION 'Finance posting permission required' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Missing request ID' USING ERRCODE = '22023'; END IF;
  RETURN platform_finance_private.post_entry(p_date,p_currency,p_memo,p_lines,'manual',NULL,p_request_id,NULL);
END
$$;

CREATE FUNCTION public.post_platform_finance_entry(
  p_date date, p_currency text, p_memo text, p_lines jsonb, p_request_id uuid
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.post_manual(p_date,p_currency,p_memo,p_lines,p_request_id) $$;

CREATE FUNCTION platform_finance_private.reverse_entry(p_entry_id uuid, p_memo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_entry public.platform_finance_entries;
  v_lines jsonb;
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_entry FROM public.platform_finance_entries WHERE id = p_entry_id AND source <> 'reversal';
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry cannot be reversed' USING ERRCODE = '22023'; END IF;
  SELECT jsonb_agg(jsonb_build_object('account_code',account_code,'debit',credit,'credit',debit) ORDER BY line_no)
  INTO v_lines FROM public.platform_finance_lines WHERE entry_id = p_entry_id;
  RETURN platform_finance_private.post_entry((now() AT TIME ZONE 'Africa/Cairo')::date,
    v_entry.currency,p_memo,v_lines,'reversal',NULL,NULL,p_entry_id);
END
$$;

CREATE FUNCTION public.reverse_platform_finance_entry(p_entry_id uuid, p_memo text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.reverse_entry(p_entry_id,p_memo) $$;

CREATE FUNCTION platform_finance_private.add_account(p_code text, p_name_ar text, p_name_en text, p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  IF p_code IS NULL OR trim(p_code) !~ '^[0-9]{4,8}$'
     OR p_name_ar IS NULL OR length(trim(p_name_ar)) NOT BETWEEN 1 AND 100
     OR p_name_en IS NULL OR length(trim(p_name_en)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid platform account' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.platform_finance_accounts VALUES (trim(p_code), trim(p_name_ar), trim(p_name_en), p_kind);
END
$$;

CREATE FUNCTION public.add_platform_finance_account(p_code text, p_name_ar text, p_name_en text, p_kind text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.add_account(p_code,p_name_ar,p_name_en,p_kind) $$;

CREATE FUNCTION public.platform_finance_trial_balance(p_from date, p_to date, p_currency text)
RETURNS TABLE (account_code text, opening numeric, debit numeric, credit numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT l.account_code,
    coalesce(sum(l.debit - l.credit) FILTER (WHERE e.entry_date < p_from), 0),
    coalesce(sum(l.debit) FILTER (WHERE e.entry_date >= p_from), 0),
    coalesce(sum(l.credit) FILTER (WHERE e.entry_date >= p_from), 0)
  FROM public.platform_finance_entries e JOIN public.platform_finance_lines l ON l.entry_id = e.id
  WHERE e.currency = p_currency AND e.entry_date <= p_to AND p_from <= p_to
  GROUP BY l.account_code ORDER BY l.account_code
$$;

-- Paymob checkout sessions are marked paid only by the verified payment workflow.
CREATE FUNCTION platform_finance_private.import_paymob(p_from date, p_to date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_count integer := 0;
BEGIN
  IF coalesce(platform_finance_private.current_role(), '') NOT IN ('owner','accountant') THEN
    RAISE EXCEPTION 'Finance posting permission required' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 92
     OR p_to > (now() AT TIME ZONE 'Africa/Cairo')::date THEN
    RAISE EXCEPTION 'Select a period of up to 93 days ending today or earlier' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(40897, 1);
  FOR v_payment IN
    SELECT t.id, t.amount_cents::numeric / 100 AS amount, t.currency,
           (t.subscription_activated_at AT TIME ZONE 'Africa/Cairo')::date AS entry_date
    FROM public.payment_transactions t
    JOIN public.payment_checkout_sessions s ON s.id = t.checkout_session_id
    WHERE t.status = 'success' AND t.hmac_valid IS TRUE AND t.amount_cents > 0
      AND s.status = 'paid' AND s.provider_transaction_id = t.paymob_transaction_id
      AND s.paymob_order_id = t.paymob_order_id AND s.amount_cents = t.amount_cents
      AND s.currency = t.currency AND s.organization_id = t.organization_id
      AND t.subscription_activated_at >= (p_from::timestamp AT TIME ZONE 'Africa/Cairo')
      AND t.subscription_activated_at < ((p_to + 1)::timestamp AT TIME ZONE 'Africa/Cairo')
      AND NOT EXISTS (SELECT 1 FROM public.platform_finance_entries e WHERE e.source = 'paymob' AND e.source_id = t.id)
    ORDER BY t.subscription_activated_at,t.id LIMIT 200
  LOOP
    PERFORM platform_finance_private.post_entry(v_payment.entry_date, v_payment.currency, 'اشتراك عبر Paymob',
      jsonb_build_array(jsonb_build_object('account_code','1030','debit',v_payment.amount,'credit',0),
                        jsonb_build_object('account_code','4010','debit',0,'credit',v_payment.amount)),
      'paymob',v_payment.id,NULL,NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END
$$;

CREATE FUNCTION public.import_platform_paymob_receipts(p_from date, p_to date)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.import_paymob(p_from,p_to) $$;

-- Approve a transfer, activate the subscription, and post to the platform ledger atomically.
CREATE FUNCTION platform_finance_private.approve_transfer(p_transfer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_transfer public.bank_transfer_requests;
  v_subscription public.subscriptions;
  v_currency text;
  v_amount numeric;
  v_expires timestamptz;
  v_days integer;
  v_entry uuid;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_transfer FROM public.bank_transfer_requests WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank transfer not found' USING ERRCODE = '22023'; END IF;
  IF v_transfer.status = 'approved' THEN
    SELECT id INTO v_entry FROM public.platform_finance_entries WHERE source = 'bank_transfer' AND source_id = p_transfer_id;
    IF v_entry IS NOT NULL THEN RETURN v_entry; END IF;
  END IF;
  IF v_transfer.status <> 'pending' THEN RAISE EXCEPTION 'Bank transfer was already reviewed' USING ERRCODE = '22023'; END IF;

  v_currency := upper(trim(v_transfer.currency));
  v_amount := round(v_transfer.amount, 2);
  IF v_amount IS NULL OR v_amount <> v_transfer.amount OR v_amount <= 0 OR v_amount * 100 > 2147483647 OR v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid bank transfer amount or currency' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_transfer.organization_id::text, 0));
  SELECT * INTO v_subscription FROM public.subscriptions
    WHERE organization_id = v_transfer.organization_id ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE;

  SELECT CASE WHEN v_transfer.billing_cycle = 'yearly' THEN 365 ELSE coalesce(duration_days,30) END
    INTO v_days FROM public.subscription_plans WHERE id = v_transfer.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = '22023'; END IF;
  v_expires := (CASE WHEN v_subscription.plan_id = v_transfer.plan_id AND v_subscription.status IN ('active','trialing')
                     THEN greatest(v_subscription.expires_at,now()) ELSE now() END) + make_interval(days => v_days);
  IF v_subscription.id IS NULL THEN
    INSERT INTO public.subscriptions (organization_id,plan_id,status,starts_at,expires_at,payment_method,payment_reference,activated_by)
    VALUES (v_transfer.organization_id,v_transfer.plan_id,'active',now(),v_expires,'bank_transfer',p_transfer_id::text,auth.uid());
  ELSE
    UPDATE public.subscriptions SET plan_id = v_transfer.plan_id, status = 'active',
      starts_at = CASE WHEN plan_id = v_transfer.plan_id AND status IN ('active','trialing') THEN starts_at ELSE now() END,
      expires_at = v_expires, payment_method = 'bank_transfer', payment_reference = p_transfer_id::text,
      activated_by = auth.uid(), paymob_transaction_id = NULL, updated_at = now()
    WHERE id = v_subscription.id;
  END IF;
  UPDATE public.bank_transfer_requests SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
    WHERE id = p_transfer_id;
  INSERT INTO public.payment_transactions (organization_id,amount_cents,currency,status,payment_method,processed_at)
    VALUES (v_transfer.organization_id,(v_amount * 100)::integer,v_currency,'completed','bank_transfer',now());
  RETURN platform_finance_private.post_entry((now() AT TIME ZONE 'Africa/Cairo')::date,
    v_currency,'اشتراك عبر تحويل بنكي',
    jsonb_build_array(jsonb_build_object('account_code','1020','debit',v_amount,'credit',0),
                      jsonb_build_object('account_code','4010','debit',0,'credit',v_amount)),
    'bank_transfer',p_transfer_id,NULL,NULL);
END
$$;

CREATE FUNCTION public.approve_platform_bank_transfer(p_transfer_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT platform_finance_private.approve_transfer(p_transfer_id) $$;

CREATE POLICY platform_transfer_requests_start_pending ON public.bank_transfer_requests
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

-- The verified settlement path is server-only. Retain browser inserts for legacy unverified rows.
CREATE POLICY platform_verified_payment_server_only ON public.payment_transactions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (hmac_valid IS NOT TRUE AND status <> 'success'
    AND checkout_session_id IS NULL AND subscription_activated_at IS NULL);

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA platform_finance_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_finance_private.current_role(), platform_finance_private.list_staff(),
  platform_finance_private.set_staff(text,text), platform_finance_private.post_manual(date,text,text,jsonb,uuid),
  platform_finance_private.reverse_entry(uuid,text), platform_finance_private.import_paymob(date,date),
  platform_finance_private.approve_transfer(uuid), platform_finance_private.add_account(text,text,text,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_platform_finance_role(), public.list_platform_finance_staff(),
  public.set_platform_finance_staff(text,text), public.post_platform_finance_entry(date,text,text,jsonb,uuid),
  public.reverse_platform_finance_entry(uuid,text), public.platform_finance_trial_balance(date,date,text),
  public.import_platform_paymob_receipts(date,date), public.approve_platform_bank_transfer(uuid),
  public.add_platform_finance_account(text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_finance_role(), public.list_platform_finance_staff(),
  public.set_platform_finance_staff(text,text), public.post_platform_finance_entry(date,text,text,jsonb,uuid),
  public.reverse_platform_finance_entry(uuid,text), public.platform_finance_trial_balance(date,date,text),
  public.import_platform_paymob_receipts(date,date), public.approve_platform_bank_transfer(uuid),
  public.add_platform_finance_account(text,text,text,text) TO authenticated;

COMMIT;
