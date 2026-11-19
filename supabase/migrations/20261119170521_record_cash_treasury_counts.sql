CREATE TABLE public.cash_treasury_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  book_amount numeric(12,2) NOT NULL CHECK (book_amount <> 'NaN'::numeric),
  counted_amount numeric(12,2) NOT NULL CHECK (counted_amount >= 0 AND counted_amount <> 'NaN'::numeric),
  difference numeric(13,2) GENERATED ALWAYS AS (counted_amount - book_amount) STORED,
  notes text CHECK (char_length(notes) <= 500),
  counted_by uuid NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, request_id)
);

CREATE INDEX cash_treasury_counts_recent_idx
ON public.cash_treasury_counts (organization_id, counted_at DESC, id DESC);
CREATE INDEX cash_treasury_counts_account_idx ON public.cash_treasury_counts (bank_account_id);

ALTER TABLE public.cash_treasury_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cash_treasury_counts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.cash_treasury_counts TO authenticated;

CREATE POLICY cash_treasury_counts_select ON public.cash_treasury_counts
FOR SELECT TO authenticated USING (
  public.user_belongs_to_org((SELECT auth.uid()), organization_id)
  AND public.has_org_permission(organization_id, 'financial_view')
);

CREATE FUNCTION public.list_cash_treasury_counts(_org uuid)
RETURNS SETOF public.cash_treasury_counts
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT c.* FROM public.cash_treasury_counts c
  WHERE c.organization_id = _org
  ORDER BY c.counted_at DESC, c.id DESC
  LIMIT 25;
$$;

CREATE FUNCTION operations_private.record_cash_treasury_count(
  _org uuid, _request uuid, _account uuid, _amount numeric, _notes text
)
RETURNS public.cash_treasury_counts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_account public.bank_accounts%ROWTYPE;
  v_result public.cash_treasury_counts%ROWTYPE;
  v_notes text := nullif(btrim(_notes), '');
BEGIN
  IF v_user IS NULL OR NOT coalesce(public.user_belongs_to_org(v_user, _org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'financial_view'), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_org, v_user, 'banking_transactions') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'cash_count_permission' USING ERRCODE = '42501';
  END IF;
  IF _request IS NULL OR _account IS NULL
    OR NOT (coalesce(_amount, -1) >= 0 AND _amount <= 9999999999.99)
    OR _amount IS DISTINCT FROM round(_amount, 2)
    OR char_length(v_notes) > 500 THEN
    RAISE EXCEPTION 'cash_count_invalid' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_org::text || ':cash-count:' || _request::text, 0));
  SELECT * INTO v_result FROM public.cash_treasury_counts
  WHERE organization_id = _org AND request_id = _request;
  IF FOUND THEN
    IF (v_result.bank_account_id, v_result.counted_amount, v_result.notes, v_result.counted_by)
       IS DISTINCT FROM (_account, _amount, v_notes, v_user) THEN
      RAISE EXCEPTION 'cash_count_request_conflict' USING ERRCODE = '22023';
    END IF;
    RETURN v_result;
  END IF;
  IF NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'cash_count_read_only' USING ERRCODE = '42501';
  END IF;

  -- Take the same account lock that incoming and outgoing movements must use.
  SELECT * INTO v_account FROM public.bank_accounts
  WHERE id = _account AND organization_id = _org
    AND is_active IS TRUE AND treasury_kind = 'cash'
  FOR SHARE;
  IF NOT FOUND OR v_account.currency IS NULL OR v_account.currency !~ '^[A-Z]{3}$'
    OR v_account.current_balance = 'NaN'::numeric THEN
    RAISE EXCEPTION 'cash_count_account' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.cash_treasury_counts (
    organization_id, request_id, bank_account_id, account_name, currency, book_amount, counted_amount, notes, counted_by
  ) VALUES (
    _org, _request, _account, v_account.account_name, v_account.currency,
    coalesce(v_account.current_balance, 0), _amount, v_notes, v_user
  ) RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE FUNCTION public.record_cash_treasury_count(
  _org uuid, _request uuid, _account uuid, _amount numeric, _notes text DEFAULT NULL
)
RETURNS SETOF public.cash_treasury_counts
LANGUAGE sql SECURITY INVOKER SET search_path = '' ROWS 1
AS $$
  SELECT c.* FROM operations_private.record_cash_treasury_count(_org, _request, _account, _amount, _notes) c;
$$;

REVOKE ALL ON FUNCTION public.list_cash_treasury_counts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_cash_treasury_counts(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_cash_treasury_count(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION operations_private.record_cash_treasury_count(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_treasury_count(uuid, uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION operations_private.record_cash_treasury_count(uuid, uuid, uuid, numeric, text) TO authenticated;
