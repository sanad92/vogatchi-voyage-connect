-- Safar ERP pilgrimage: internal group-seat holds/allocations (stage-only).
-- MUST NOT run on a production/hosted database without staging, RLS and
-- payment/inventory concurrency review. No financial postings or supplier calls.
-- Depends on PR #41 guardrails and PR #42 sales/quotes.
BEGIN;

CREATE TABLE public.pilgrimage_seat_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sale_id uuid NOT NULL UNIQUE,
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id) ON DELETE RESTRICT,
  seat_count int NOT NULL CHECK (seat_count BETWEEN 1 AND 10000),
  status text NOT NULL CHECK (status IN ('held','allocated','released')),
  hold_expires_at timestamptz,
  allocated_at timestamptz,
  released_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id,id),
  FOREIGN KEY (organization_id,sale_id)
    REFERENCES public.pilgrimage_sales(organization_id,id) ON DELETE RESTRICT,
  CHECK (
    (status='held' AND hold_expires_at IS NOT NULL AND allocated_at IS NULL AND released_at IS NULL)
    OR (status='allocated' AND allocated_at IS NOT NULL AND released_at IS NULL)
    OR (status='released' AND released_at IS NOT NULL)
  )
);
CREATE INDEX pilgrimage_seat_allocations_active_idx
  ON public.pilgrimage_seat_allocations(program_id,status,hold_expires_at)
  WHERE status IN ('held','allocated');

CREATE TABLE public.pilgrimage_seat_allocation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  allocation_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('held','allocated','released','reheld')),
  actor_id uuid NOT NULL,
  seat_count int NOT NULL CHECK (seat_count>0),
  event_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,allocation_id)
    REFERENCES public.pilgrimage_seat_allocations(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX pilgrimage_allocation_events_allocation_idx
  ON public.pilgrimage_seat_allocation_events(allocation_id,event_at DESC);

-- Browser reads allowed within the tenant, never direct inserts or updates:
-- only the explicitly authorized transactional RPC changes seat inventory.
REVOKE ALL ON TABLE public.pilgrimage_seat_allocations,
  public.pilgrimage_seat_allocation_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.pilgrimage_seat_allocations,
  public.pilgrimage_seat_allocation_events TO authenticated;
GRANT ALL ON TABLE public.pilgrimage_seat_allocations,
  public.pilgrimage_seat_allocation_events TO service_role;

ALTER TABLE public.pilgrimage_seat_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilgrimage_seat_allocation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org can read internal seat allocation state"
  ON public.pilgrimage_seat_allocations FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));
CREATE POLICY "org can read internal allocation audit"
  ON public.pilgrimage_seat_allocation_events FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(),organization_id));

CREATE OR REPLACE FUNCTION public.transition_pilgrimage_seat_allocation(
  _sale_id uuid, _action text, _hold_minutes int DEFAULT 120
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  actor uuid := auth.uid();
  s public.pilgrimage_sales%ROWTYPE;
  p public.pilgrimage_programs%ROWTYPE;
  a public.pilgrimage_seat_allocations%ROWTYPE;
  v_registered bigint;
  v_other_allocated bigint;
  v_event text;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF actor IS NULL OR _sale_id IS NULL THEN
    RAISE EXCEPTION 'authenticated_manager_required' USING ERRCODE='42501'; END IF;
  IF _action NOT IN ('hold','allocate','release') OR _action IS NULL THEN
    RAISE EXCEPTION 'invalid_seat_action' USING ERRCODE='22023'; END IF;
  IF _action='hold' AND (_hold_minutes IS NULL OR _hold_minutes<5 OR _hold_minutes>1440) THEN
    RAISE EXCEPTION 'hold_must_be_5_to_1440_minutes' USING ERRCODE='22023'; END IF;

  -- Read quote and check current tenant membership BEFORE privileged inventory reads.
  -- Lock the tenant-authorized quote BEFORE program inventory. A concurrent
  -- cancellation must wait and then see the newly created active allocation.
  SELECT * INTO s FROM public.pilgrimage_sales
    WHERE id=_sale_id AND public.user_belongs_to_org(actor,organization_id)
    FOR UPDATE;
  IF NOT FOUND OR public.get_user_org_role(actor,s.organization_id)::text
      NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'quote_not_found_or_not_authorized' USING ERRCODE='42501';
  END IF;
  IF s.program_id IS NULL OR s.sale_model NOT IN ('group_seat','b2b_group') THEN
    RAISE EXCEPTION 'only_linked_group_quotes_can_hold_seats' USING ERRCODE='22023'; END IF;

  -- All changes to a given program are serialized by a single program row lock.
  -- PR #41 pilgrim INSERT guard locks this same row.
  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id=s.program_id AND organization_id=s.organization_id FOR UPDATE;
  IF NOT FOUND OR p.program_type<>s.program_type OR p.currency<>s.currency THEN
    RAISE EXCEPTION 'quote_program_mismatch' USING ERRCODE='23503'; END IF;

  SELECT * INTO a FROM public.pilgrimage_seat_allocations
    WHERE sale_id=s.id AND organization_id=s.organization_id FOR UPDATE;
  -- Take current time only after waiting on both serialization locks.
  v_now:=clock_timestamp();

  IF _action='release' THEN
    IF NOT FOUND THEN RAISE EXCEPTION 'no_allocation_to_release' USING ERRCODE='22023'; END IF;
    IF a.status='released' THEN RETURN a.id; END IF;
    UPDATE public.pilgrimage_seat_allocations
      SET status='released',hold_expires_at=NULL,allocated_at=NULL,
        released_at=v_now,updated_at=v_now,updated_by=actor
      WHERE id=a.id;
    v_event:='released';
  ELSIF _action='allocate' THEN
    IF s.status<>'quoted' OR p.status<>'open' THEN
      RAISE EXCEPTION 'issued_quote_and_open_program_required' USING ERRCODE='22023'; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'active_hold_required' USING ERRCODE='22023'; END IF;
    IF a.status='allocated' THEN RETURN a.id; END IF;
    IF a.status<>'held' OR a.hold_expires_at<=v_now THEN
      RAISE EXCEPTION 'active_unexpired_hold_required' USING ERRCODE='22023'; END IF;
    UPDATE public.pilgrimage_seat_allocations
      SET status='allocated',hold_expires_at=NULL,allocated_at=v_now,
        updated_at=v_now,updated_by=actor WHERE id=a.id;
    v_event:='allocated';
  ELSE
    IF s.status<>'quoted' OR p.status<>'open' THEN
      RAISE EXCEPTION 'issued_quote_and_open_program_required' USING ERRCODE='22023'; END IF;

    -- Count linked registered pilgrims as already occupying inventory.
    -- This rollout intentionally disallows *new* holds for such quotes, to
    -- avoid double counting a traveler against both a sale and a pilgrim.
    IF EXISTS (
      SELECT 1 FROM public.pilgrimage_sale_travelers t
      JOIN public.pilgrims g ON g.id=t.pilgrim_id
      WHERE t.sale_id=s.id AND g.organization_id=s.organization_id
        AND g.program_id=s.program_id AND g.status<>'cancelled'
    ) THEN
      RAISE EXCEPTION 'existing_pilgrims_require_manual_reconciliation'
        USING ERRCODE='22023'; END IF;

    IF a.id IS NOT NULL AND a.status='allocated' THEN RETURN a.id; END IF;
    IF a.id IS NOT NULL AND a.status='held' AND a.hold_expires_at>v_now THEN
      RETURN a.id; END IF;
    SELECT count(*) INTO v_registered FROM public.pilgrims g
      WHERE g.program_id=p.id AND g.organization_id=p.organization_id
        AND g.status<>'cancelled';
    SELECT coalesce(sum(x.seat_count),0) INTO v_other_allocated
      FROM public.pilgrimage_seat_allocations x
      WHERE x.program_id=p.id AND x.organization_id=p.organization_id
        AND x.sale_id<>s.id
        AND (x.status='allocated' OR
          (x.status='held' AND x.hold_expires_at>v_now));
    IF p.capacity>0 AND v_registered+v_other_allocated+s.party_size>p.capacity THEN
      RAISE EXCEPTION 'insufficient_unallocated_program_seats'
        USING ERRCODE='22023'; END IF;

    IF a.id IS NULL THEN
      INSERT INTO public.pilgrimage_seat_allocations (
        organization_id,sale_id,program_id,seat_count,status,hold_expires_at,
        created_by,updated_by
      ) VALUES (
        s.organization_id,s.id,p.id,s.party_size,'held',
        v_now+make_interval(mins=>_hold_minutes),actor,actor
      ) RETURNING * INTO a;
      v_event:='held';
    ELSE
      UPDATE public.pilgrimage_seat_allocations
        SET status='held',seat_count=s.party_size,
          hold_expires_at=v_now+make_interval(mins=>_hold_minutes),
          allocated_at=NULL,released_at=NULL,updated_at=v_now,updated_by=actor
        WHERE id=a.id;
      v_event:='reheld';
    END IF;
  END IF;
  INSERT INTO public.pilgrimage_seat_allocation_events(
    organization_id,allocation_id,action,actor_id,seat_count
  ) VALUES (
    s.organization_id,a.id,v_event,actor,s.party_size
  );
  RETURN a.id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.transition_pilgrimage_seat_allocation(uuid,text,int)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_pilgrimage_seat_allocation(uuid,text,int)
  TO authenticated;

-- Protect existing registration and program-capacity edits from consuming
-- seats currently held/allocated in the same internal program inventory.
-- Existing PR #41 trigger enforces base program and paid-price rules.
CREATE OR REPLACE FUNCTION public._pilgrimage_held_inventory_registration_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  p public.pilgrimage_programs%ROWTYPE;
  v_registered bigint;
  v_allocated bigint;
BEGIN
  IF NEW.status='cancelled' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'cancelled' THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO p FROM public.pilgrimage_programs
    WHERE id=NEW.program_id AND organization_id=NEW.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'program_not_found' USING ERRCODE='23503'; END IF;
  IF p.capacity=0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_registered FROM public.pilgrims g
    WHERE g.program_id=p.id AND g.organization_id=p.organization_id AND
      g.status<>'cancelled';
  SELECT coalesce(sum(x.seat_count),0) INTO v_allocated
  FROM public.pilgrimage_seat_allocations x
  WHERE x.program_id=p.id AND x.organization_id=p.organization_id AND
    (x.status='allocated' OR (x.status='held' AND x.hold_expires_at>clock_timestamp()));
  IF v_registered+v_allocated>=p.capacity THEN
    RAISE EXCEPTION 'program_capacity_reserved_by_existing_allocations'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS zz_pilgrimage_held_inventory_guard ON public.pilgrims;
CREATE TRIGGER zz_pilgrimage_held_inventory_guard
  BEFORE INSERT OR UPDATE OF status ON public.pilgrims
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_held_inventory_registration_guard();

CREATE OR REPLACE FUNCTION public._pilgrimage_held_inventory_program_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
  v_registered bigint;
  v_allocated bigint;
BEGIN
  IF NEW.capacity>0 AND NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    SELECT count(*) INTO v_registered FROM public.pilgrims g
      WHERE g.program_id=OLD.id AND g.organization_id=OLD.organization_id AND g.status<>'cancelled';
    SELECT coalesce(sum(x.seat_count),0) INTO v_allocated
      FROM public.pilgrimage_seat_allocations x
      WHERE x.program_id=OLD.id AND x.organization_id=OLD.organization_id
        AND (x.status='allocated' OR
          (x.status='held' AND x.hold_expires_at>clock_timestamp()));
    IF v_registered+v_allocated>NEW.capacity THEN
      RAISE EXCEPTION 'capacity_cannot_shrink_below_reserved_seats'
        USING ERRCODE='22023'; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS zz_pilgrimage_held_program_guard ON public.pilgrimage_programs;
CREATE TRIGGER zz_pilgrimage_held_program_guard
  BEFORE UPDATE OF capacity ON public.pilgrimage_programs
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_held_inventory_program_guard();

CREATE OR REPLACE FUNCTION public._pilgrimage_held_sale_cancel_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
  IF NEW.status='cancelled' AND OLD.status<>'cancelled' AND EXISTS(
    SELECT 1 FROM public.pilgrimage_seat_allocations a
    WHERE a.sale_id=OLD.id AND a.organization_id=OLD.organization_id
    AND (a.status='allocated' OR
      (a.status='held' AND a.hold_expires_at>clock_timestamp()))
  ) THEN RAISE EXCEPTION 'release_internal_seat_allocation_before_cancellation'
    USING ERRCODE='22023'; END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS zz_pilgrimage_held_sale_cancel_guard ON public.pilgrimage_sales;
CREATE TRIGGER zz_pilgrimage_held_sale_cancel_guard
  BEFORE UPDATE OF status ON public.pilgrimage_sales
  FOR EACH ROW EXECUTE FUNCTION public._pilgrimage_held_sale_cancel_guard();

REVOKE EXECUTE ON FUNCTION public._pilgrimage_held_inventory_registration_guard()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_held_inventory_program_guard()
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public._pilgrimage_held_sale_cancel_guard()
  FROM PUBLIC,anon,authenticated;
COMMIT;
