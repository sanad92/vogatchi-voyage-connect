-- Safar ERP — Hajj/Umrah operational integrity hardening.
-- DRAFT / STAGING ONLY. DO NOT run on production without a verified clone,
-- payment-journal regression, two-tenant RLS test and migration approval.
-- Prerequisites: 0006 + 0010 drizzle pilgrimage migrations, existing
-- auth.uid(), user_belongs_to_org(), can_process_org_payments().
BEGIN;

-- Staff must cancel records rather than erase financial/traveler history.
REVOKE DELETE ON TABLE public.pilgrims, public.pilgrimage_programs
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._pilgrimage_program_integrity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_count bigint;
BEGIN
  IF NEW.name IS NULL OR char_length(btrim(NEW.name)) < 3
    OR NEW.capacity < 0 OR NEW.makkah_nights < 0 OR NEW.madinah_nights < 0
    OR NEW.price_quad < 0 OR NEW.price_triple < 0
    OR NEW.price_double < 0 OR NEW.price_single < 0
    OR (NEW.departure_date IS NOT NULL AND NEW.return_date IS NOT NULL
        AND NEW.return_date < NEW.departure_date)
  THEN
    RAISE EXCEPTION 'invalid_pilgrimage_program' USING ERRCODE='22023';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.program_type IS DISTINCT FROM OLD.program_type
    THEN RAISE EXCEPTION 'immutable_pilgrimage_program_identity'
      USING ERRCODE='42501'; END IF;
    SELECT count(*) INTO v_count FROM public.pilgrims
    WHERE program_id=OLD.id AND organization_id=OLD.organization_id
      AND status <> 'cancelled';
    IF NEW.capacity>0 AND v_count>NEW.capacity THEN
      RAISE EXCEPTION 'capacity_less_than_registered_pilgrims'
        USING ERRCODE='22023'; END IF;
    IF NEW.currency IS DISTINCT FROM OLD.currency AND EXISTS(
      SELECT 1 FROM public.pilgrims g WHERE g.program_id=OLD.id
    ) THEN
      RAISE EXCEPTION 'cannot_change_program_currency_after_registration'
        USING ERRCODE='22023'; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS z_pilgrimage_program_integrity ON public.pilgrimage_programs;
CREATE TRIGGER z_pilgrimage_program_integrity
  BEFORE INSERT OR UPDATE ON public.pilgrimage_programs
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_program_integrity();

CREATE OR REPLACE FUNCTION public._pilgrimage_pilgrim_integrity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  p public.pilgrimage_programs%ROWTYPE;
  v_price numeric;
  v_paid numeric;
  v_active bigint;
BEGIN
  -- Lock the parent: concurrent inserts to the same program serialize.
  SELECT * INTO p FROM public.pilgrimage_programs
  WHERE id=NEW.program_id AND organization_id=NEW.organization_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'program_company_mismatch'
    USING ERRCODE='23503'; END IF;

  IF NEW.customer_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.customers c
    WHERE c.id=NEW.customer_id AND c.organization_id=NEW.organization_id
  ) THEN RAISE EXCEPTION 'pilgrim_customer_company_mismatch'
    USING ERRCODE='23503'; END IF;

  v_price := CASE NEW.room_type
    WHEN 'quad' THEN p.price_quad
    WHEN 'triple' THEN p.price_triple
    WHEN 'double' THEN p.price_double
    WHEN 'single' THEN p.price_single
    ELSE NULL END;
  IF v_price IS NULL THEN RAISE EXCEPTION 'invalid_room_category' USING ERRCODE='22023'; END IF;

  IF TG_OP='INSERT' THEN
    IF p.status <> 'open' OR NEW.status <> 'registered'
    THEN RAISE EXCEPTION 'program_registration_not_open'
      USING ERRCODE='22023'; END IF;
    SELECT count(*) INTO v_active FROM public.pilgrims
    WHERE program_id=NEW.program_id AND status <> 'cancelled';
    IF p.capacity>0 AND v_active>=p.capacity THEN
      RAISE EXCEPTION 'program_capacity_reached' USING ERRCODE='22023'; END IF;
    IF v_price<=0 THEN
      RAISE EXCEPTION 'registration_requires_room_price' USING ERRCODE='22023';
    END IF;
    NEW.total_price:=v_price;
    NEW.paid_amount:=0;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.program_id IS DISTINCT FROM OLD.program_id
    THEN RAISE EXCEPTION 'immutable_pilgrim_company_and_program'
      USING ERRCODE='42501'; END IF;
    IF OLD.status='cancelled' AND NEW.status<>'cancelled' THEN
      RAISE EXCEPTION 'cancelled_pilgrim_must_not_be_reopened'
        USING ERRCODE='22023'; END IF;

    IF NEW.status='cancelled' AND (
      NEW.cancellation_fee < 0 OR NEW.cancellation_fee>OLD.total_price
    ) THEN RAISE EXCEPTION 'invalid_cancellation_fee'
      USING ERRCODE='22023'; END IF;
    IF (NEW.status IS DISTINCT FROM OLD.status) AND NEW.status='cancelled'
      AND auth.uid() IS NOT NULL
      AND public.get_user_org_role(auth.uid(),NEW.organization_id)::text
        NOT IN ('owner','admin','manager')
    THEN RAISE EXCEPTION 'cancellation_requires_manager'
      USING ERRCODE='42501'; END IF;

    SELECT coalesce(sum(amount),0) INTO v_paid
    FROM public.customer_payments
    WHERE pilgrim_id=OLD.id
      AND organization_id=OLD.organization_id
      AND status='completed';
    NEW.paid_amount:=v_paid;

    IF NEW.room_type IS DISTINCT FROM OLD.room_type THEN
      IF v_paid>0 OR NEW.status='cancelled' THEN
        RAISE EXCEPTION 'room_change_requires_finance_review'
          USING ERRCODE='22023'; END IF;
      IF v_price<=0 THEN
        RAISE EXCEPTION 'room_change_requires_price' USING ERRCODE='22023';
      END IF;
      NEW.total_price:=v_price;
    ELSIF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
      RAISE EXCEPTION 'direct_pilgrim_price_edit_forbidden'
        USING ERRCODE='42501';
    END IF;

    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id AND v_paid>0 THEN
      RAISE EXCEPTION 'paid_pilgrim_customer_change_forbidden'
        USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

-- The existing trg_pilgrim_guard runs alphabetically before z_* and
-- handles basic organization guard/timestamps. This trigger adds locks
-- and recalculates financial read-model fields from completed payments.
DROP TRIGGER IF EXISTS z_pilgrimage_pilgrim_integrity ON public.pilgrims;
CREATE TRIGGER z_pilgrimage_pilgrim_integrity
  BEFORE INSERT OR UPDATE ON public.pilgrims
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_pilgrim_integrity();

-- Linking a payment to a pilgrim MUST prove company, customer and currency,
-- and lock the pilgrim before checking the amount for concurrent collections.
CREATE OR REPLACE FUNCTION public._pilgrimage_payment_integrity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  g public.pilgrims%ROWTYPE;
  p public.pilgrimage_programs%ROWTYPE;
  v_paid numeric;
BEGIN
  IF NEW.pilgrim_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO g FROM public.pilgrims
    WHERE id=NEW.pilgrim_id AND organization_id=NEW.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_pilgrim_company_mismatch'
    USING ERRCODE='23503'; END IF;
  SELECT * INTO p FROM public.pilgrimage_programs WHERE id=g.program_id;
  IF NEW.customer_id IS DISTINCT FROM g.customer_id
    OR NEW.currency IS DISTINCT FROM p.currency THEN
    RAISE EXCEPTION 'payment_customer_or_currency_mismatch'
      USING ERRCODE='22023'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.can_process_org_payments(g.organization_id) THEN
    RAISE EXCEPTION 'pilgrimage_payment_not_authorized' USING ERRCODE='42501';
  END IF;
  IF g.status='cancelled' AND NEW.status='completed' THEN
    RAISE EXCEPTION 'cannot_collect_cancelled_pilgrim'
      USING ERRCODE='22023'; END IF;

  IF NEW.status='completed' AND (
    TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed'
    OR NEW.amount IS DISTINCT FROM OLD.amount
  ) THEN
    SELECT coalesce(sum(c.amount),0) INTO v_paid
    FROM public.customer_payments c
    WHERE c.pilgrim_id=g.id AND c.organization_id=g.organization_id
      AND c.status='completed'
      AND (TG_OP='INSERT' OR c.id<>OLD.id);
    IF NEW.amount <= 0 OR NEW.amount > greatest(g.total_price-v_paid,0) THEN
      RAISE EXCEPTION 'pilgrimage_payment_exceeds_balance'
        USING ERRCODE='22023'; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS z_pilgrimage_payment_integrity ON public.customer_payments;
CREATE TRIGGER z_pilgrimage_payment_integrity
  BEFORE INSERT OR UPDATE OF pilgrim_id,organization_id,customer_id,currency,amount,status
  ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_payment_integrity();

CREATE OR REPLACE FUNCTION public._pilgrimage_cost_company_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM public.pilgrimage_programs p
    WHERE p.id=NEW.program_id AND p.organization_id=NEW.organization_id
  ) THEN RAISE EXCEPTION 'cost_program_company_mismatch'
    USING ERRCODE='23503'; END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS z_pilgrimage_cost_company_integrity ON public.pilgrimage_program_costs;
CREATE TRIGGER z_pilgrimage_cost_company_integrity
  BEFORE INSERT OR UPDATE ON public.pilgrimage_program_costs
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_cost_company_integrity();

-- Trigger helpers are not business RPC endpoints.
REVOKE EXECUTE ON FUNCTION public._pilgrimage_program_integrity()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_pilgrim_integrity()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_payment_integrity()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_cost_company_integrity()
  FROM PUBLIC,anon,authenticated;
COMMIT;
