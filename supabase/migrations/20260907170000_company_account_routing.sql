-- Company-scoped accounting routes.
--
-- Posting code continues to send canonical keys (1100, 2000, ...), while each
-- company can point those keys at an account in its own chart. Existing
-- companies keep the seeded account as the fallback until an administrator
-- selects a different account.

BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_account_routing_catalog (
  routing_key text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  group_key text NOT NULL CHECK (group_key IN ('control', 'treasury', 'revenue', 'cost', 'expense', 'equity')),
  expected_account_type public.account_type NOT NULL,
  fallback_account_code text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_account_routing (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  routing_key text NOT NULL REFERENCES public.organization_account_routing_catalog(routing_key) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  notes text,
  configured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, routing_key),
  UNIQUE (organization_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_org_account_routing_org
  ON public.organization_account_routing(organization_id);

ALTER TABLE public.organization_account_routing_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_account_routing ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.organization_account_routing_catalog TO authenticated;
GRANT SELECT ON public.organization_account_routing TO authenticated;

DROP POLICY IF EXISTS organization_account_routing_catalog_read
  ON public.organization_account_routing_catalog;
CREATE POLICY organization_account_routing_catalog_read
  ON public.organization_account_routing_catalog
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS organization_account_routing_read
  ON public.organization_account_routing;
CREATE POLICY organization_account_routing_read
  ON public.organization_account_routing
  FOR SELECT TO authenticated
  USING (
    organization_id = ANY (public.get_user_org_ids(auth.uid()))
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS organization_account_routing_manage
  ON public.organization_account_routing;
CREATE POLICY organization_account_routing_manage
  ON public.organization_account_routing
  FOR ALL TO authenticated
  USING (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    OR public.is_platform_admin(auth.uid())
  );

DROP TRIGGER IF EXISTS update_org_account_routing_updated_at
  ON public.organization_account_routing;
CREATE TRIGGER update_org_account_routing_updated_at
  BEFORE UPDATE ON public.organization_account_routing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.organization_account_routing_catalog
  (routing_key, label_ar, label_en, group_key, expected_account_type, fallback_account_code)
VALUES
  ('accounts_receivable', 'ذمم العملاء', 'Accounts receivable', 'control', 'asset', '1100'),
  ('prepaid_expenses', 'مصروفات مدفوعة مقدمًا', 'Prepaid expenses', 'control', 'asset', '1200'),
  ('supplier_advances', 'دفعات مقدمة للموردين', 'Supplier advances', 'control', 'asset', '1210'),
  ('accounts_payable', 'ذمم الموردين', 'Accounts payable', 'control', 'liability', '2000'),
  ('refunds_payable', 'استردادات العملاء', 'Customer refunds payable', 'control', 'liability', '2050'),
  ('tax_payable', 'الضرائب المستحقة', 'Tax payable', 'control', 'liability', '2100'),
  ('salaries_payable', 'الرواتب المستحقة', 'Salaries payable', 'control', 'liability', '2200'),
  ('cash', 'النقدية', 'Cash', 'treasury', 'asset', '1000'),
  ('bank', 'الحسابات البنكية', 'Bank accounts', 'treasury', 'asset', '1010'),
  ('revenue_hotel', 'إيرادات الفنادق', 'Hotel revenue', 'revenue', 'revenue', '4000'),
  ('revenue_flight', 'إيرادات الطيران', 'Flight revenue', 'revenue', 'revenue', '4010'),
  ('revenue_transport', 'إيرادات النقل', 'Transport revenue', 'revenue', 'revenue', '4020'),
  ('revenue_car_rental', 'إيرادات تأجير السيارات', 'Car rental revenue', 'revenue', 'revenue', '4030'),
  ('revenue_tours', 'إيرادات البرامج السياحية', 'Tour package revenue', 'revenue', 'revenue', '4040'),
  ('sales_returns', 'مرتجعات المبيعات', 'Sales returns', 'revenue', 'revenue', '4050'),
  ('revenue_other', 'إيرادات أخرى', 'Other revenue', 'revenue', 'revenue', '4900'),
  ('cost_hotel', 'تكلفة الفنادق', 'Hotel cost of sales', 'cost', 'expense', '5000'),
  ('cost_flight', 'تكلفة الطيران', 'Flight cost of sales', 'cost', 'expense', '5010'),
  ('cost_transport', 'تكلفة النقل', 'Transport cost of sales', 'cost', 'expense', '5020'),
  ('cost_car_rental', 'تكلفة تأجير السيارات', 'Car rental cost of sales', 'cost', 'expense', '5030'),
  ('expense_salaries', 'مصروف الرواتب', 'Salaries expense', 'expense', 'expense', '6000'),
  ('expense_commissions', 'مصروف العمولات', 'Commission expense', 'expense', 'expense', '6010'),
  ('expense_rent', 'مصروف الإيجار', 'Rent expense', 'expense', 'expense', '6100'),
  ('expense_utilities', 'مصروف المرافق', 'Utilities expense', 'expense', 'expense', '6200'),
  ('expense_marketing', 'مصروف التسويق', 'Marketing expense', 'expense', 'expense', '6300'),
  ('expense_office_supplies', 'مصروف القرطاسية', 'Office supplies expense', 'expense', 'expense', '6400'),
  ('expense_other', 'مصروفات أخرى', 'Other expenses', 'expense', 'expense', '6900'),
  ('owner_equity', 'حقوق الملاك', 'Owner equity', 'equity', 'equity', '3000'),
  ('retained_earnings', 'الأرباح المحتجزة', 'Retained earnings', 'equity', 'equity', '3100')
ON CONFLICT (routing_key) DO UPDATE SET
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  group_key = EXCLUDED.group_key,
  expected_account_type = EXCLUDED.expected_account_type,
  fallback_account_code = EXCLUDED.fallback_account_code,
  is_active = true;

-- Older seed migrations omitted these three canonical accounts. Add them for
-- existing companies without changing any custom account names or codes.
INSERT INTO public.chart_of_accounts
  (organization_id, account_code, account_name, account_name_ar, account_type, is_system)
SELECT o.id, v.account_code, v.account_name, v.account_name_ar, v.account_type, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('1210', 'Supplier Advances', 'دفعات مقدمة للموردين', 'asset'::public.account_type),
  ('2050', 'Customer Refunds Payable', 'استردادات العملاء المستحقة', 'liability'::public.account_type),
  ('4050', 'Sales Returns', 'مرتجعات المبيعات', 'revenue'::public.account_type)
) AS v(account_code, account_name, account_name_ar, account_type)
ON CONFLICT (organization_id, account_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public._ensure_account_routing_defaults(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_chart_of_accounts(_org_id);

  INSERT INTO public.chart_of_accounts
    (organization_id, account_code, account_name, account_name_ar, account_type, is_system)
  VALUES
    (_org_id, '1210', 'Supplier Advances', 'دفعات مقدمة للموردين', 'asset', true),
    (_org_id, '2050', 'Customer Refunds Payable', 'استردادات العملاء المستحقة', 'liability', true),
    (_org_id, '4050', 'Sales Returns', 'مرتجعات المبيعات', 'revenue', true)
  ON CONFLICT (organization_id, account_code) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_account_route(
  _org_id uuid,
  _routing_key text
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_fallback_code text;
BEGIN
  IF _org_id IS NULL OR _routing_key IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public._ensure_account_routing_defaults(_org_id);

  SELECT r.account_id
    INTO v_account_id
  FROM public.organization_account_routing r
  JOIN public.chart_of_accounts a
    ON a.id = r.account_id
   AND a.organization_id = r.organization_id
   AND a.is_active = true
  WHERE r.organization_id = _org_id
    AND r.routing_key = _routing_key;

  IF v_account_id IS NOT NULL THEN
    RETURN v_account_id;
  END IF;

  SELECT fallback_account_code
    INTO v_fallback_code
  FROM public.organization_account_routing_catalog
  WHERE routing_key = _routing_key AND is_active = true;

  IF v_fallback_code IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT a.id
    INTO v_account_id
  FROM public.chart_of_accounts a
  WHERE a.organization_id = _org_id
    AND a.account_code = v_fallback_code
    AND a.is_active = true
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_account_route_code(
  _org_id uuid,
  _routing_key text
)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.account_code
  FROM public.chart_of_accounts a
  WHERE a.id = public.get_org_account_route(_org_id, _routing_key)
$$;

CREATE OR REPLACE FUNCTION public.list_org_account_routing(_org_id uuid)
RETURNS TABLE (
  routing_key text,
  label_ar text,
  label_en text,
  group_key text,
  expected_account_type public.account_type,
  fallback_account_code text,
  account_id uuid,
  account_code text,
  account_name text,
  account_name_ar text,
  configured boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_admin(auth.uid()) OR public.user_belongs_to_org(auth.uid(), _org_id)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.routing_key, c.label_ar, c.label_en, c.group_key,
         c.expected_account_type, c.fallback_account_code,
         COALESCE(r.account_id, fallback_account.id),
         COALESCE(selected_account.account_code, fallback_account.account_code),
         COALESCE(selected_account.account_name, fallback_account.account_name),
         COALESCE(selected_account.account_name_ar, fallback_account.account_name_ar),
         (r.account_id IS NOT NULL AND selected_account.id IS NOT NULL)
  FROM public.organization_account_routing_catalog c
  LEFT JOIN public.organization_account_routing r
    ON r.organization_id = _org_id AND r.routing_key = c.routing_key
  LEFT JOIN public.chart_of_accounts selected_account
    ON selected_account.id = r.account_id
   AND selected_account.organization_id = _org_id
   AND selected_account.is_active = true
  LEFT JOIN public.chart_of_accounts fallback_account
    ON fallback_account.organization_id = _org_id
   AND fallback_account.account_code = c.fallback_account_code
   AND fallback_account.is_active = true
  WHERE c.is_active = true
  ORDER BY c.group_key, c.fallback_account_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_org_account_route(
  _org_id uuid,
  _routing_key text,
  _account_id uuid,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_catalog public.organization_account_routing_catalog%ROWTYPE;
  v_old public.organization_account_routing%ROWTYPE;
BEGIN
  IF NOT (
    public.is_platform_admin(auth.uid())
    OR public.get_user_org_role(auth.uid(), _org_id) IN ('owner', 'admin')
    OR public.has_org_permission(_org_id, 'financial_edit')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_catalog
  FROM public.organization_account_routing_catalog
  WHERE routing_key = _routing_key AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown account routing key: %', _routing_key;
  END IF;

  PERFORM public._ensure_account_routing_defaults(_org_id);

  SELECT * INTO v_old
  FROM public.organization_account_routing
  WHERE organization_id = _org_id AND routing_key = _routing_key;

  IF NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = _account_id
      AND a.organization_id = _org_id
      AND a.is_active = true
      AND a.account_type = v_catalog.expected_account_type
  ) THEN
    RAISE EXCEPTION 'Account must be active, belong to the company, and have type %', v_catalog.expected_account_type;
  END IF;

  INSERT INTO public.organization_account_routing
    (organization_id, routing_key, account_id, notes, configured_by)
  VALUES (_org_id, _routing_key, _account_id, NULLIF(trim(_notes), ''), auth.uid())
  ON CONFLICT (organization_id, routing_key) DO UPDATE SET
    account_id = EXCLUDED.account_id,
    notes = EXCLUDED.notes,
    configured_by = EXCLUDED.configured_by,
    updated_at = now();

  BEGIN
    PERFORM public.log_admin_action(
      'account_route_updated',
      'organization_account_routing',
      _account_id,
      CASE WHEN v_old.account_id IS NULL THEN NULL ELSE jsonb_build_object('routing_key', _routing_key, 'account_id', v_old.account_id) END,
      jsonb_build_object('routing_key', _routing_key, 'account_id', _account_id),
      'تحديث توجيه حساب محاسبي للشركة'
    );
  EXCEPTION WHEN undefined_function OR not_null_violation OR foreign_key_violation THEN
    NULL;
  END;

  RETURN _account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_org_account_route(
  _org_id uuid,
  _routing_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.organization_account_routing%ROWTYPE;
BEGIN
  IF NOT (
    public.is_platform_admin(auth.uid())
    OR public.get_user_org_role(auth.uid(), _org_id) IN ('owner', 'admin')
    OR public.has_org_permission(_org_id, 'financial_edit')
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.organization_account_routing
  WHERE organization_id = _org_id AND routing_key = _routing_key
  RETURNING * INTO v_old;

  IF v_old.account_id IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM public.log_admin_action(
      'account_route_reset',
      'organization_account_routing',
      v_old.account_id,
      jsonb_build_object('routing_key', _routing_key, 'account_id', v_old.account_id),
      NULL,
      'إعادة توجيه الحساب إلى البديل الافتراضي'
    );
  EXCEPTION WHEN undefined_function OR not_null_violation OR foreign_key_violation THEN
    NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_id_by_code(_org_id uuid, _code text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_key text;
  v_account_id uuid;
BEGIN
  IF _org_id IS NULL OR _code IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public._ensure_account_routing_defaults(_org_id);

  SELECT routing_key
    INTO v_route_key
  FROM public.organization_account_routing_catalog
  WHERE fallback_account_code = btrim(_code)
    AND is_active = true
  LIMIT 1;

  IF v_route_key IS NOT NULL THEN
    v_account_id := public.get_org_account_route(_org_id, v_route_key);
    IF v_account_id IS NOT NULL THEN
      RETURN v_account_id;
    END IF;
  END IF;

  SELECT a.id INTO v_account_id
  FROM public.chart_of_accounts a
  WHERE a.organization_id = _org_id
    AND a.account_code = btrim(_code)
    AND a.is_active = true
  LIMIT 1;
  RETURN v_account_id;
END;
$$;

-- The later automatic-posting engine uses this helper directly. Make it obey
-- the same company routing map as post_journal_entry.
CREATE OR REPLACE FUNCTION public._resolve_account(_org uuid, _code text)
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_account_id_by_code(_org, _code)
$$;

-- The control report must follow selected company accounts instead of looking
-- only for the seeded codes.
CREATE OR REPLACE FUNCTION public.get_aging_control_totals_v2(
  _org_id uuid,
  _as_of_date date DEFAULT NULL,
  _currency text DEFAULT 'EGP'
)
RETURNS TABLE (
  entity_type text,
  aging_total numeric,
  control_balance numeric,
  difference numeric,
  historical_estimate_count integer,
  corrected_date_count integer,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_as_of date := COALESCE(_as_of_date, CURRENT_DATE);
  v_currency text := upper(COALESCE(NULLIF(trim(_currency), ''), 'EGP'));
  v_ar uuid;
  v_ap uuid;
BEGIN
  IF NOT public._can_read_org_finance(_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_ar := public.get_org_account_route(_org_id, 'accounts_receivable');
  v_ap := public.get_org_account_route(_org_id, 'accounts_payable');

  RETURN QUERY
  WITH ledger AS (
    SELECT
      l.account_id,
      COALESCE(SUM(l.debit), 0) AS debit,
      COALESCE(SUM(l.credit), 0) AS credit
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    WHERE e.organization_id = _org_id
      AND e.status = 'posted'
      AND e.currency = v_currency
      AND e.entry_date <= v_as_of
      AND l.account_id IN (v_ar, v_ap)
    GROUP BY l.account_id
  ), customer_totals AS (
    SELECT
      COALESCE(SUM(d.outstanding_amount), 0) AS aging_total,
      COUNT(*) FILTER (WHERE d.is_historical_estimate)::integer AS estimate_count,
      COUNT(*) FILTER (WHERE d.is_date_corrected)::integer AS corrected_count
    FROM public.get_customer_aging_details_v2(_org_id, v_as_of, v_currency, NULL) d
  ), supplier_totals AS (
    SELECT
      COALESCE(SUM(d.outstanding_amount), 0) AS aging_total,
      COUNT(*) FILTER (WHERE d.is_historical_estimate)::integer AS estimate_count,
      COUNT(*) FILTER (WHERE d.is_date_corrected)::integer AS corrected_count
    FROM public.get_supplier_aging_details_v2(_org_id, v_as_of, v_currency, NULL) d
  ), controls AS (
    SELECT
      COALESCE(MAX(debit - credit) FILTER (WHERE account_id = v_ar), 0) AS customer_control,
      COALESCE(MAX(credit - debit) FILTER (WHERE account_id = v_ap), 0) AS supplier_control
    FROM ledger
  )
  SELECT 'customer', c.aging_total, x.customer_control,
         c.aging_total - x.customer_control, c.estimate_count, c.corrected_count, v_currency
  FROM customer_totals c CROSS JOIN controls x
  UNION ALL
  SELECT 'supplier', s.aging_total, x.supplier_control,
         s.aging_total - x.supplier_control, s.estimate_count, s.corrected_count, v_currency
  FROM supplier_totals s CROSS JOIN controls x;
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_account_routing_defaults(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_account_route(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_account_route_code(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_org_account_routing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_org_account_route(uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_org_account_route(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_account_id_by_code(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._resolve_account(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_account_route(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_account_route_code(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_org_account_routing(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_org_account_route(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_org_account_route(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_account_id_by_code(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._resolve_account(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_aging_control_totals_v2(uuid, date, text) TO authenticated, service_role;

COMMIT;
