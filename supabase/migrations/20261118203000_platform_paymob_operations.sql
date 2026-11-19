BEGIN;

ALTER TABLE platform_finance_private.staff
  ADD COLUMN can_void_paymob boolean NOT NULL DEFAULT false,
  ADD COLUMN can_refund_paymob boolean NOT NULL DEFAULT false;

ALTER TABLE platform_finance_private.access_log
  ADD COLUMN previous_paymob_permissions jsonb,
  ADD COLUMN new_paymob_permissions jsonb;

CREATE TABLE platform_finance_private.paymob_actions (
  id uuid PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payment_transactions(id),
  requested_by uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('void', 'refund')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency = 'EGP'),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 300),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'submitted', 'succeeded', 'rejected', 'unknown')),
  provider_action_id text UNIQUE,
  provider_status_code integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_finance_private.paymob_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON platform_finance_private.paymob_actions FROM PUBLIC, anon, authenticated;
CREATE INDEX platform_paymob_actions_history_idx
  ON platform_finance_private.paymob_actions (payment_id, created_at DESC);
CREATE UNIQUE INDEX platform_paymob_actions_one_outstanding_idx
  ON platform_finance_private.paymob_actions (payment_id)
  WHERE status IN ('requested', 'submitted', 'unknown');

-- Also protect databases whose deployed callback predates the child-event guard.
CREATE FUNCTION platform_finance_private.exclude_paymob_reversal_from_activation()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.raw_payload #>> '{obj,has_parent_transaction}' = 'true' THEN
    IF NEW.raw_payload #>> '{obj,is_void}' = 'true' THEN
      NEW.status := 'voided';
    ELSIF NEW.raw_payload #>> '{obj,is_refund}' = 'true' THEN
      NEW.status := 'refunded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_00_paymob_reversal_activation
BEFORE INSERT OR UPDATE OF status, raw_payload ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION platform_finance_private.exclude_paymob_reversal_from_activation();

CREATE FUNCTION platform_finance_private.paymob_permissions(p_actor uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'void', public.has_platform_role(p_actor, 'platform_owner') OR coalesce(
      (SELECT can_void_paymob FROM platform_finance_private.staff WHERE user_id = p_actor), false
    ),
    'refund', public.has_platform_role(p_actor, 'platform_owner') OR coalesce(
      (SELECT can_refund_paymob FROM platform_finance_private.staff WHERE user_id = p_actor), false
    )
  );
$$;

CREATE FUNCTION public.get_platform_paymob_permissions()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT platform_finance_private.paymob_permissions(auth.uid()); $$;

CREATE FUNCTION public.list_platform_paymob_staff()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'email', u.email, 'void', s.can_void_paymob, 'refund', s.can_refund_paymob
    ) ORDER BY u.email), '[]'::jsonb)
    FROM platform_finance_private.staff s JOIN auth.users u ON u.id = s.user_id
    WHERE u.email_confirmed_at IS NOT NULL
  );
END;
$$;

CREATE FUNCTION public.set_platform_paymob_staff_permissions(
  p_email text, p_can_void boolean, p_can_refund boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_staff platform_finance_private.staff%ROWTYPE;
BEGIN
  IF platform_finance_private.current_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Platform owner required' USING ERRCODE = '42501';
  END IF;
  SELECT s.* INTO STRICT v_staff
  FROM platform_finance_private.staff s JOIN auth.users u ON s.user_id = u.id
  WHERE lower(u.email) = lower(btrim(p_email)) AND u.email_confirmed_at IS NOT NULL
  FOR UPDATE OF s;
  IF v_staff.can_void_paymob = p_can_void AND v_staff.can_refund_paymob = p_can_refund THEN RETURN; END IF;
  UPDATE platform_finance_private.staff SET can_void_paymob = p_can_void, can_refund_paymob = p_can_refund
  WHERE user_id = v_staff.user_id;
  INSERT INTO platform_finance_private.access_log(
    user_id, changed_by, previous_role, new_role, previous_paymob_permissions, new_paymob_permissions
  ) VALUES (
    v_staff.user_id, auth.uid(), v_staff.role, v_staff.role,
    jsonb_build_object('void', v_staff.can_void_paymob, 'refund', v_staff.can_refund_paymob),
    jsonb_build_object('void', p_can_void, 'refund', p_can_refund)
  );
EXCEPTION WHEN no_data_found OR too_many_rows THEN
  RAISE EXCEPTION 'A unique confirmed finance account is required' USING ERRCODE = '22023';
END;
$$;

CREATE FUNCTION public.list_platform_paymob_transactions(
  p_search text DEFAULT '', p_status text DEFAULT '', p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_search text := left(btrim(coalesce(p_search, '')), 100);
  v_status text := coalesce(p_status, '');
BEGIN
  IF platform_finance_private.current_role() IS NULL THEN
    RAISE EXCEPTION 'Finance access required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH entries AS (
      SELECT t.id, t.organization_id, t.paymob_transaction_id, t.paymob_order_id, t.status,
        t.amount_cents, t.currency, t.payment_method, coalesce(t.processed_at, t.created_at) AS occurred_at,
        (t.hmac_valid IS TRUE AND t.subscription_activated_at IS NOT NULL) AS verified_subscription
      FROM public.payment_transactions t
      WHERE t.paymob_transaction_id IS NOT NULL
        AND coalesce(t.raw_payload #>> '{obj,has_parent_transaction}', 'false') <> 'true'
      UNION ALL
      SELECT s.id, s.organization_id, NULL::text, s.paymob_order_id,
        CASE WHEN s.status = 'pending' AND s.expires_at <= now() THEN 'expired' ELSE s.status END,
        s.amount_cents, s.currency, NULL::text, s.created_at, false
      FROM public.payment_checkout_sessions s
      WHERE s.paymob_order_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.payment_transactions t WHERE t.paymob_order_id = s.paymob_order_id
      )
    ), page AS (
      SELECT e.*, o.name AS organization_name
      FROM entries e LEFT JOIN public.organizations o ON o.id = e.organization_id
      WHERE (v_search = '' OR e.paymob_transaction_id = v_search OR e.paymob_order_id = v_search
             OR strpos(lower(coalesce(o.name, '')), lower(v_search)) > 0)
        AND (v_status = '' OR e.status = v_status)
      ORDER BY e.occurred_at DESC, e.id DESC
      OFFSET greatest(coalesce(p_offset, 0), 0) LIMIT 26
    )
    SELECT coalesce(jsonb_agg(to_jsonb(p) - 'organization_id' || jsonb_build_object(
      'actions', coalesce(history.rows, '[]'::jsonb)
    ) ORDER BY p.occurred_at DESC, p.id DESC), '[]'::jsonb)
    FROM page p
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'amount_cents', a.amount_cents,
        'status', a.status, 'reason', a.reason, 'provider_action_id', a.provider_action_id,
        'requested_by', u.email, 'created_at', a.created_at
      ) ORDER BY a.created_at DESC) AS rows
      FROM platform_finance_private.paymob_actions a
      LEFT JOIN auth.users u ON u.id = a.requested_by
      WHERE a.payment_id = p.id
    ) history ON true
  );
END;
$$;

-- A request is committed before contacting Paymob. Requests with an uncertain
-- outcome stay reserved until verified by a provider transaction lookup.
CREATE FUNCTION public.reserve_platform_paymob_action(
  p_id uuid, p_payment_id uuid, p_actor uuid, p_kind text, p_amount_cents bigint, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_payment public.payment_transactions%ROWTYPE;
  v_existing platform_finance_private.paymob_actions%ROWTYPE;
  v_amount bigint;
  v_refunded bigint;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('void', 'refund') OR
     (platform_finance_private.paymob_permissions(p_actor) ->> p_kind)::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Payment operation permission required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_payment FROM public.payment_transactions WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.hmac_valid IS DISTINCT FROM true OR v_payment.subscription_activated_at IS NULL
     OR v_payment.currency IS DISTINCT FROM 'EGP' OR coalesce(v_payment.paymob_transaction_id, '') !~ '^[0-9]+$'
     OR coalesce(v_payment.paymob_order_id, '') !~ '^[0-9]+$'
     OR v_payment.status NOT IN ('success', 'refunded') THEN
    RAISE EXCEPTION 'Verified subscription payment required' USING ERRCODE = '22023';
  END IF;
  v_amount := CASE WHEN p_kind = 'void' THEN v_payment.amount_cents ELSE p_amount_cents END;
  SELECT * INTO v_existing FROM platform_finance_private.paymob_actions WHERE id = p_id;
  IF FOUND THEN
    IF v_existing.payment_id <> p_payment_id OR v_existing.requested_by <> p_actor OR
       v_existing.kind <> p_kind OR v_existing.amount_cents IS DISTINCT FROM v_amount OR
       v_existing.reason IS DISTINCT FROM btrim(p_reason) THEN
      RAISE EXCEPTION 'Request identifier was already used' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('send', false, 'status', v_existing.status);
  END IF;
  SELECT coalesce(sum(amount_cents), 0) INTO v_refunded FROM platform_finance_private.paymob_actions
    WHERE payment_id = p_payment_id AND status = 'succeeded';
  IF v_amount IS NULL OR v_amount <= 0 OR v_amount > v_payment.amount_cents - v_refunded OR
     (p_kind = 'void' AND (v_payment.payment_method IS DISTINCT FROM 'card' OR v_refunded <> 0)) THEN
    RAISE EXCEPTION 'Payment amount or method is not eligible' USING ERRCODE = '22023';
  END IF;
  INSERT INTO platform_finance_private.paymob_actions(id, payment_id, requested_by, kind, amount_cents, currency, reason)
    VALUES (p_id, p_payment_id, p_actor, p_kind, v_amount, 'EGP', btrim(p_reason));
  RETURN jsonb_build_object(
    'send', true, 'status', 'requested', 'transaction_id', v_payment.paymob_transaction_id,
    'order_id', v_payment.paymob_order_id, 'amount_cents', v_amount,
    'original_amount_cents', v_payment.amount_cents, 'currency', v_payment.currency
  );
END;
$$;

CREATE FUNCTION public.get_platform_paymob_action(p_id uuid, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT (coalesce(public.has_platform_role(p_actor, 'platform_owner'), false) OR EXISTS (
    SELECT 1 FROM platform_finance_private.staff WHERE user_id = p_actor
  )) THEN
    RAISE EXCEPTION 'Finance access required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT jsonb_build_object('status', a.status, 'kind', a.kind, 'amount_cents', a.amount_cents,
      'currency', a.currency, 'provider_action_id', a.provider_action_id, 'transaction_id', t.paymob_transaction_id,
      'order_id', t.paymob_order_id)
    FROM platform_finance_private.paymob_actions a JOIN public.payment_transactions t ON t.id = a.payment_id
    WHERE a.id = p_id
  );
END;
$$;

CREATE FUNCTION public.finish_platform_paymob_action(
  p_id uuid, p_status text, p_provider_action_id text DEFAULT NULL, p_http_status integer DEFAULT NULL
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_status text;
BEGIN
  UPDATE platform_finance_private.paymob_actions SET status = p_status,
    provider_action_id = coalesce(provider_action_id, p_provider_action_id),
    provider_status_code = coalesce(p_http_status, provider_status_code), updated_at = now()
  WHERE id = p_id AND status IN ('requested', 'submitted', 'unknown')
    AND (provider_action_id IS NULL OR p_provider_action_id IS NULL OR provider_action_id = p_provider_action_id)
  RETURNING status INTO v_status;
  IF FOUND THEN RETURN v_status; END IF;
  RETURN (SELECT status FROM platform_finance_private.paymob_actions WHERE id = p_id);
END;
$$;

REVOKE ALL ON FUNCTION platform_finance_private.paymob_permissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_platform_paymob_permissions(), public.list_platform_paymob_staff(),
  public.set_platform_paymob_staff_permissions(text,boolean,boolean),
  public.list_platform_paymob_transactions(text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_paymob_permissions(), public.list_platform_paymob_staff(),
  public.set_platform_paymob_staff_permissions(text,boolean,boolean),
  public.list_platform_paymob_transactions(text,text,integer) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_platform_paymob_action(uuid,uuid,uuid,text,bigint,text),
  public.get_platform_paymob_action(uuid,uuid), public.finish_platform_paymob_action(uuid,text,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_platform_paymob_action(uuid,uuid,uuid,text,bigint,text),
  public.get_platform_paymob_action(uuid,uuid), public.finish_platform_paymob_action(uuid,text,text,integer)
  TO service_role;

COMMIT;
