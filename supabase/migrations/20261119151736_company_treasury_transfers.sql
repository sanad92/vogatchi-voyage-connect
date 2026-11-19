CREATE TABLE public.treasury_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  to_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  from_account_name text NOT NULL,
  to_account_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <> 'NaN'::numeric),
  currency text NOT NULL,
  transfer_date date NOT NULL,
  receipt_reference text CHECK (char_length(receipt_reference) <= 120),
  journal_entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id),
  reference_number text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, request_id),
  CHECK (from_account_id <> to_account_id)
);

CREATE INDEX treasury_transfers_recent_idx ON public.treasury_transfers
  (organization_id, transfer_date DESC, created_at DESC, id DESC);
CREATE INDEX treasury_transfers_from_account_idx ON public.treasury_transfers (from_account_id);
CREATE INDEX treasury_transfers_to_account_idx ON public.treasury_transfers (to_account_id);

ALTER TABLE public.treasury_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.treasury_transfers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.treasury_transfers TO authenticated;

CREATE POLICY treasury_transfers_select ON public.treasury_transfers
FOR SELECT TO authenticated USING (
  public.user_belongs_to_org((SELECT auth.uid()), organization_id)
  AND public.has_org_permission(organization_id, 'financial_view')
);

CREATE FUNCTION public.list_company_treasury_transfers(_org uuid)
RETURNS SETOF public.treasury_transfers
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT t.*
  FROM public.treasury_transfers t
  WHERE t.organization_id = _org
  ORDER BY t.transfer_date DESC, t.created_at DESC, t.id DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION public.list_company_treasury_transfers(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_company_treasury_transfers(uuid) TO authenticated;

CREATE FUNCTION operations_private.guard_treasury_transfer_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP <> 'INSERT' AND OLD.source_type IN ('treasury_transfer_out', 'treasury_transfer_in') THEN
      RAISE EXCEPTION 'treasury_transfer_linked_movement' USING ERRCODE = '42501';
    END IF;
    IF TG_OP <> 'DELETE' AND NEW.source_type IN ('treasury_transfer_out', 'treasury_transfer_in') THEN
      RAISE EXCEPTION 'treasury_transfer_linked_movement' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION operations_private.guard_treasury_transfer_movement() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_treasury_transfer_movement
BEFORE INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION operations_private.guard_treasury_transfer_movement();

CREATE FUNCTION operations_private.post_company_treasury_transfer(
  _org uuid, _request uuid, _from_account uuid, _to_account uuid,
  _amount numeric, _date date, _receipt_reference text
)
RETURNS public.treasury_transfers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_transfer public.treasury_transfers%ROWTYPE;
  v_from public.bank_accounts%ROWTYPE;
  v_to public.bank_accounts%ROWTYPE;
  v_from_kind text;
  v_to_kind text;
  v_from_gl uuid;
  v_to_gl uuid;
  v_receipt text := nullif(btrim(_receipt_reference), '');
  v_transfer_id uuid := gen_random_uuid();
  v_journal uuid;
  v_reference text;
BEGIN
  IF v_user IS NULL
    OR NOT coalesce(public.user_belongs_to_org(v_user, _org), false)
    OR NOT coalesce(public.has_org_permission(_org, 'financial_view'), false)
    OR NOT EXISTS (
      SELECT 1 FROM public._org_permission_state(_org, v_user, 'banking_transfer') p
      WHERE p.granted AND p.data_scope = 'organization'
    ) THEN
    RAISE EXCEPTION 'treasury_transfer_permission' USING ERRCODE = '42501';
  END IF;

  IF _request IS NULL OR _from_account IS NULL OR _to_account IS NULL
    OR _from_account = _to_account OR _date IS NULL OR NOT isfinite(_date)
    OR NOT (coalesce(_amount, 0) > 0 AND _amount <= 9999999999.99)
    OR _amount IS DISTINCT FROM round(_amount, 2)
    OR char_length(v_receipt) > 120 THEN
    RAISE EXCEPTION 'treasury_transfer_invalid_details' USING ERRCODE = '22023';
  END IF;

  -- Retrying the same request returns the posted result even after balances change.
  PERFORM pg_advisory_xact_lock(hashtextextended(_org::text || ':treasury:' || _request::text, 0));
  SELECT * INTO v_transfer FROM public.treasury_transfers
  WHERE organization_id = _org AND request_id = _request;
  IF FOUND THEN
    IF (v_transfer.from_account_id, v_transfer.to_account_id, v_transfer.amount,
        v_transfer.transfer_date, v_transfer.receipt_reference, v_transfer.created_by)
      IS DISTINCT FROM (_from_account, _to_account, _amount, _date, v_receipt, v_user) THEN
      RAISE EXCEPTION 'treasury_transfer_request_conflict' USING ERRCODE = '22023';
    END IF;
    RETURN v_transfer;
  END IF;

  IF NOT coalesce(public.can_org_write(_org), false) THEN
    RAISE EXCEPTION 'treasury_transfer_read_only' USING ERRCODE = '42501';
  END IF;

  v_reference := public._next_entry_number(_org);
  -- Serialize changes to both balances in the same account order in either direction.
  PERFORM id FROM public.bank_accounts
  WHERE organization_id = _org AND id IN (_from_account, _to_account)
  ORDER BY id FOR UPDATE;

  SELECT * INTO v_from FROM public.bank_accounts WHERE organization_id = _org AND id = _from_account;
  SELECT * INTO v_to FROM public.bank_accounts WHERE organization_id = _org AND id = _to_account;
  v_from_kind := coalesce(v_from.treasury_kind, 'bank');
  v_to_kind := coalesce(v_to.treasury_kind, 'bank');
  IF v_from.is_active IS NOT TRUE OR v_to.is_active IS NOT TRUE
    OR v_from_kind NOT IN ('bank', 'cash') OR v_to_kind NOT IN ('bank', 'cash') THEN
    RAISE EXCEPTION 'treasury_transfer_invalid_accounts' USING ERRCODE = '22023';
  END IF;
  IF v_from.currency IS NULL OR v_from.currency !~ '^[A-Z]{3}$'
    OR v_from.currency IS DISTINCT FROM v_to.currency THEN
    RAISE EXCEPTION 'treasury_transfer_currency' USING ERRCODE = '22023';
  END IF;
  IF coalesce(v_from.current_balance, 0) < _amount OR v_from.current_balance = 'NaN'::numeric THEN
    RAISE EXCEPTION 'treasury_transfer_funds' USING ERRCODE = '22023';
  END IF;

  v_from_gl := public.get_org_account_route(_org, v_from_kind);
  v_to_gl := public.get_org_account_route(_org, v_to_kind);
  IF v_from_gl IS NULL OR v_to_gl IS NULL OR (v_from_kind <> v_to_kind AND v_from_gl = v_to_gl) THEN
    RAISE EXCEPTION 'treasury_transfer_account_routing' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.journal_entries (
    organization_id, entry_number, entry_date, reference_type, reference_id, description,
    total_debit, total_credit, status, currency, source_type, source_id,
    functional_currency, fx_rate, created_by, posted_at, auto_generated
  ) VALUES (
    _org, v_reference, _date, 'treasury_transfer', v_transfer_id,
    'تحويل داخلي من ' || v_from.account_name || ' إلى ' || v_to.account_name,
    _amount, _amount, 'posted', v_from.currency, 'treasury_transfer', v_transfer_id,
    v_from.currency, 1, v_user, now(), true
  ) RETURNING id INTO v_journal;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit, description, line_order)
  VALUES
    (v_journal, v_to_gl, _amount, 0, v_to.account_name, 1),
    (v_journal, v_from_gl, 0, _amount, v_from.account_name, 2);

  UPDATE public.journal_entries SET is_locked = true WHERE id = v_journal;

  -- The existing bank movement trigger applies both balance changes.
  INSERT INTO public.bank_account_transactions (
    organization_id, bank_account_id, transaction_type, amount, currency,
    transaction_date, reference_number, description, source_type, source_id, created_by
  ) VALUES
    (_org, _from_account, 'withdrawal', _amount, v_from.currency, _date, v_reference,
     'تحويل داخلي إلى ' || v_to.account_name, 'treasury_transfer_out', v_transfer_id, v_user),
    (_org, _to_account, 'deposit', _amount, v_to.currency, _date, v_reference,
     'تحويل داخلي من ' || v_from.account_name, 'treasury_transfer_in', v_transfer_id, v_user);

  INSERT INTO public.treasury_transfers (
    id, organization_id, request_id, from_account_id, to_account_id, from_account_name,
    to_account_name, amount, currency, transfer_date, receipt_reference, journal_entry_id,
    reference_number, created_by
  ) VALUES (
    v_transfer_id, _org, _request, _from_account, _to_account, v_from.account_name,
    v_to.account_name, _amount, v_from.currency, _date, v_receipt, v_journal, v_reference, v_user
  ) RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$$;

CREATE FUNCTION public.post_company_treasury_transfer(
  _org uuid, _request uuid, _from_account uuid, _to_account uuid,
  _amount numeric, _date date, _receipt_reference text DEFAULT NULL
)
RETURNS SETOF public.treasury_transfers
LANGUAGE sql SECURITY INVOKER SET search_path = '' ROWS 1
AS $$
  SELECT t.*
  FROM operations_private.post_company_treasury_transfer(
    _org, _request, _from_account, _to_account, _amount, _date, _receipt_reference
  ) t;
$$;

REVOKE ALL ON FUNCTION operations_private.post_company_treasury_transfer(uuid, uuid, uuid, uuid, numeric, date, text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_company_treasury_transfer(uuid, uuid, uuid, uuid, numeric, date, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION operations_private.post_company_treasury_transfer(uuid, uuid, uuid, uuid, numeric, date, text)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_company_treasury_transfer(uuid, uuid, uuid, uuid, numeric, date, text)
TO authenticated;
