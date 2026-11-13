BEGIN;

ALTER TABLE public.refund_requests ADD COLUMN follow_up_on date;
ALTER TABLE public.supplier_refund_claims ADD COLUMN follow_up_on date;

CREATE FUNCTION refund_balance_private.schedule_follow_up(_org uuid, _refund uuid, _claim uuid, _date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_claim public.supplier_refund_claims%ROWTYPE;
BEGIN
  IF NOT coalesce(refund_balance_private.can_operate(_org), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF num_nonnulls(_refund, _claim) <> 1
     OR (_date IS NOT NULL AND _date NOT BETWEEN date '0001-01-01' AND date '9999-12-31') THEN
    RAISE EXCEPTION 'Invalid refund or follow-up date' USING ERRCODE = '22023';
  END IF;

  IF _refund IS NOT NULL THEN
    UPDATE public.refund_requests SET follow_up_on = _date
    WHERE id = _refund AND organization_id = _org AND status IN ('requested', 'approved')
      AND pilgrimage_b2b_cancellation_id IS NULL
    RETURNING id INTO v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Open refund not found' USING ERRCODE = '22023'; END IF;
    RETURN v_id;
  END IF;

  -- Serialize changes with claim review and settlement, which lock this row.
  SELECT * INTO v_claim FROM public.supplier_refund_claims
  WHERE id = _claim AND organization_id = _org FOR UPDATE;
  IF NOT FOUND OR v_claim.rejected_at IS NOT NULL OR v_claim.amount <= (
    SELECT coalesce(sum(amount), 0) FROM public.refund_balance_settlements
    WHERE supplier_claim_id = _claim AND organization_id = _org
  ) THEN
    RAISE EXCEPTION 'Open refund not found' USING ERRCODE = '22023';
  END IF;

  UPDATE public.supplier_refund_claims SET follow_up_on = _date WHERE id = v_claim.id;
  RETURN v_claim.id;
END;
$$;

CREATE FUNCTION public.schedule_refund_follow_up(_org uuid, _refund uuid, _claim uuid, _date date)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT refund_balance_private.schedule_follow_up(_org, _refund, _claim, _date) $$;

REVOKE ALL ON FUNCTION refund_balance_private.schedule_follow_up(uuid,uuid,uuid,date),
  public.schedule_refund_follow_up(uuid,uuid,uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_balance_private.schedule_follow_up(uuid,uuid,uuid,date),
  public.schedule_refund_follow_up(uuid,uuid,uuid,date) TO authenticated;

COMMIT;
