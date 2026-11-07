-- Trip File 2.0 / Sprint 4: manual supplier -> finance -> operations handoff.
-- NOT a booking change executor or proof that a supplier action occurred.
-- Staged only; requires deploy-trip-file-amendments.sql on TEST/STAGING first.
BEGIN;

-- Defense in depth: prevent even a privileged integration from attaching a
-- request to a different company/booking ID by accident.
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.booking_change_requests'::regclass
      AND conname='booking_change_requests_id_org_booking_unique'
  ) THEN
    ALTER TABLE public.booking_change_requests
      ADD CONSTRAINT booking_change_requests_id_org_booking_unique
      UNIQUE (id,organization_id,booking_id);
  END IF;
END $;

CREATE TABLE IF NOT EXISTS public.booking_change_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  change_request_id uuid NOT NULL UNIQUE
    REFERENCES public.booking_change_requests(id) ON DELETE RESTRICT,
  CONSTRAINT handoff_parent_company_consistent
    FOREIGN KEY (change_request_id,organization_id,booking_id)
    REFERENCES public.booking_change_requests(id,organization_id,booking_id)
    ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'supplier_pending' CHECK (
    status IN ('supplier_pending','supplier_confirmed',
               'finance_reviewed','execution_reported','blocked')
  ),
  supplier_reference text CHECK (supplier_reference IS NULL OR char_length(supplier_reference) BETWEEN 4 AND 120),
  supplier_confirmed_by uuid,
  supplier_confirmed_at timestamptz,
  finance_reference text CHECK (finance_reference IS NULL OR char_length(finance_reference) BETWEEN 4 AND 120),
  finance_reviewed_by uuid,
  finance_reviewed_at timestamptz,
  execution_reference text CHECK (execution_reference IS NULL OR char_length(execution_reference) BETWEEN 4 AND 120),
  execution_reported_by uuid,
  execution_reported_at timestamptz,
  blocked_by uuid,
  blocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_change_handoffs_by_org
  ON public.booking_change_handoffs(organization_id,booking_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.booking_change_handoff_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  change_request_id uuid NOT NULL REFERENCES public.booking_change_requests(id) ON DELETE RESTRICT,
  CONSTRAINT handoff_event_parent_company_consistent
    FOREIGN KEY (change_request_id,organization_id,booking_id)
    REFERENCES public.booking_change_requests(id,organization_id,booking_id)
    ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('supplier_confirm','finance_verify','report_execution','block')),
  actor_id uuid NOT NULL,
  evidence_reference text CHECK (evidence_reference IS NULL OR char_length(evidence_reference) BETWEEN 4 AND 120),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_change_handoff_event_once UNIQUE(change_request_id,action)
);
CREATE INDEX IF NOT EXISTS booking_change_handoff_events_by_request
 ON public.booking_change_handoff_events(organization_id,change_request_id,occurred_at);

REVOKE ALL ON public.booking_change_handoffs FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.booking_change_handoff_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.booking_change_handoffs, public.booking_change_handoff_events TO authenticated;
GRANT ALL ON public.booking_change_handoffs, public.booking_change_handoff_events TO service_role;

ALTER TABLE public.booking_change_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_change_handoff_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_change_handoffs_finance_read ON public.booking_change_handoffs;
CREATE POLICY booking_change_handoffs_finance_read
  ON public.booking_change_handoffs FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id=booking_change_handoffs.organization_id
        AND m.user_id=auth.uid() AND m.is_active IS TRUE
    )
    AND public.has_org_permission(organization_id,'bookings_view')
    AND public.has_org_permission(organization_id,'financial_view')
  );

DROP POLICY IF EXISTS booking_change_handoff_events_finance_read ON public.booking_change_handoff_events;
CREATE POLICY booking_change_handoff_events_finance_read
  ON public.booking_change_handoff_events FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id=booking_change_handoff_events.organization_id
        AND m.user_id=auth.uid() AND m.is_active IS TRUE
    )
    AND public.has_org_permission(organization_id,'bookings_view')
    AND public.has_org_permission(organization_id,'financial_view')
  );

CREATE OR REPLACE FUNCTION public.record_booking_change_handoff(
  p_request_id uuid,
  p_action text,
  p_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  r public.booking_change_requests%ROWTYPE;
  b public.bookings%ROWTYPE;
  h public.booking_change_handoffs%ROWTYPE;
  v_reference text := NULLIF(btrim(coalesce(p_reference,'')),'');
  v_note text := NULLIF(btrim(coalesce(p_note,'')),'');
  v_next text;
  v_previous text;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR p_request_id IS NULL
     OR p_action IS NULL
     OR p_action NOT IN ('supplier_confirm','finance_verify','report_execution','block')
     OR char_length(coalesce(v_reference,'')) > 120
     OR char_length(coalesce(p_note,'')) > 1000
     OR (p_action <> 'block' AND char_length(coalesce(v_reference,'')) < 4)
     OR (p_action IN ('block','report_execution')
         AND char_length(coalesce(v_note,'')) < 10)
  THEN
    RAISE EXCEPTION 'invalid_handoff_action' USING ERRCODE='22023';
  END IF;

  -- The parent request lock serializes all actions and makes a failed
  -- secondary write abort the status update and its audit row atomically.
  SELECT * INTO r FROM public.booking_change_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'amendment_request_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = r.organization_id AND m.user_id = v_actor
      AND m.is_active IS TRUE
  ) OR NOT coalesce(public.has_org_permission(r.organization_id,'bookings_view'),false)
    OR NOT coalesce(public.has_org_permission(r.organization_id,'financial_view'),false)
  THEN
    RAISE EXCEPTION 'handoff_access_denied' USING ERRCODE='42501';
  END IF;

  IF r.status <> 'approved' THEN
    RAISE EXCEPTION 'amendment_not_approved' USING ERRCODE='22023';
  END IF;

  -- Hold a booking lock until commit to prevent confirming handoffs
  -- concurrently with a status change/cancellation.
  SELECT * INTO b FROM public.bookings
  WHERE id = r.booking_id AND organization_id = r.organization_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'amendment_booking_missing' USING ERRCODE='P0002';
  END IF;
  IF p_action <> 'block'
    AND (b.status::text IN ('cancelled','canceled')
         OR b.workflow_stage::text = 'cancelled')
  THEN
    RAISE EXCEPTION 'cancelled_booking_handoff_denied' USING ERRCODE='22023';
  END IF;

  IF p_action = 'supplier_confirm' THEN
    IF NOT coalesce(public.has_org_permission(r.organization_id,'bookings_edit'),false)
    THEN RAISE EXCEPTION 'supplier_handoff_permission_denied' USING ERRCODE='42501'; END IF;
    INSERT INTO public.booking_change_handoffs
      (organization_id,booking_id,change_request_id)
    VALUES (r.organization_id,r.booking_id,r.id)
    ON CONFLICT (change_request_id) DO NOTHING;
  ELSIF p_action = 'finance_verify' THEN
    IF NOT coalesce(public.has_org_permission(r.organization_id,'financial_edit'),false)
    THEN RAISE EXCEPTION 'finance_handoff_permission_denied' USING ERRCODE='42501'; END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = r.organization_id AND m.user_id = v_actor
        AND m.is_active IS TRUE AND m.role::text IN ('owner','admin','manager')
    ) OR NOT coalesce(public.has_org_permission(r.organization_id,'bookings_confirm'),false)
    THEN RAISE EXCEPTION 'handoff_management_only' USING ERRCODE='42501'; END IF;
  END IF;

  -- Managers may block an approved request even before the supplier step,
  -- for example if a supplier reports no availability.
  IF p_action = 'block' THEN
    INSERT INTO public.booking_change_handoffs
      (organization_id,booking_id,change_request_id)
    VALUES (r.organization_id,r.booking_id,r.id)
    ON CONFLICT (change_request_id) DO NOTHING;
  END IF;

  SELECT * INTO h FROM public.booking_change_handoffs
  WHERE change_request_id=r.id AND organization_id=r.organization_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier_handoff_not_started' USING ERRCODE='22023';
  END IF;

  -- Replay after a timeout may be accepted only for the SAME completed
  -- step and SAME evidence ref. It cannot overwrite later evidence.
  IF p_action = 'supplier_confirm'
    AND h.supplier_reference IS NOT NULL THEN
    IF h.supplier_reference = v_reference THEN
      RETURN jsonb_build_object('id',h.id,'status',h.status,'replayed',true);
    END IF;
    RAISE EXCEPTION 'supplier_reference_already_recorded' USING ERRCODE='22023';
  ELSIF p_action = 'finance_verify'
    AND h.finance_reference IS NOT NULL THEN
    IF h.finance_reference = v_reference THEN
      RETURN jsonb_build_object('id',h.id,'status',h.status,'replayed',true);
    END IF;
    RAISE EXCEPTION 'finance_reference_already_recorded' USING ERRCODE='22023';
  ELSIF p_action = 'report_execution'
    AND h.execution_reference IS NOT NULL THEN
    IF h.execution_reference = v_reference THEN
      RETURN jsonb_build_object('id',h.id,'status',h.status,'replayed',true);
    END IF;
    RAISE EXCEPTION 'execution_reference_already_recorded' USING ERRCODE='22023';
  ELSIF p_action = 'block' AND h.status = 'blocked' THEN
    RETURN jsonb_build_object('id',h.id,'status',h.status,'replayed',true);
  END IF;

  v_previous := h.status;
  IF p_action = 'supplier_confirm' THEN
    IF h.status <> 'supplier_pending' THEN
      RAISE EXCEPTION 'supplier_handoff_out_of_order' USING ERRCODE='22023';
    END IF;
    v_next := 'supplier_confirmed';
    UPDATE public.booking_change_handoffs
      SET status=v_next, supplier_reference=v_reference,
        supplier_confirmed_by=v_actor,supplier_confirmed_at=now(),updated_at=now()
      WHERE id=h.id;
  ELSIF p_action = 'finance_verify' THEN
    IF h.status <> 'supplier_confirmed' THEN
      RAISE EXCEPTION 'finance_handoff_out_of_order' USING ERRCODE='22023';
    END IF;
    IF h.supplier_confirmed_by=v_actor THEN
      RAISE EXCEPTION 'finance_must_be_independently_reviewed' USING ERRCODE='42501';
    END IF;
    v_next := 'finance_reviewed';
    UPDATE public.booking_change_handoffs
      SET status=v_next,finance_reference=v_reference,
        finance_reviewed_by=v_actor,finance_reviewed_at=now(),updated_at=now()
      WHERE id=h.id;
  ELSIF p_action = 'report_execution' THEN
    IF h.status <> 'finance_reviewed' THEN
      RAISE EXCEPTION 'execution_handoff_out_of_order' USING ERRCODE='22023';
    END IF;
    IF h.finance_reviewed_by=v_actor OR r.requested_by=v_actor THEN
      RAISE EXCEPTION 'execution_needs_independent_manager' USING ERRCODE='42501';
    END IF;
    v_next := 'execution_reported';
    UPDATE public.booking_change_handoffs
      SET status=v_next,execution_reference=v_reference,
        execution_reported_by=v_actor,execution_reported_at=now(),updated_at=now()
      WHERE id=h.id;
  ELSE
    IF h.status = 'execution_reported' THEN
      RAISE EXCEPTION 'completed_handoff_cannot_be_blocked' USING ERRCODE='22023';
    END IF;
    v_next := 'blocked';
    UPDATE public.booking_change_handoffs
      SET status=v_next,blocked_by=v_actor,blocked_at=now(),updated_at=now()
      WHERE id=h.id;
  END IF;

  INSERT INTO public.booking_change_handoff_events(
    organization_id,booking_id,change_request_id,
    action,actor_id,evidence_reference,note
  ) VALUES (
    r.organization_id,r.booking_id,r.id,
    p_action,v_actor,v_reference,v_note
  );

  -- Safe, high-level timeline only. Financial and supplier references,
  -- notes and amounts are confined to the finance-gated handoff tables.
  INSERT INTO public.booking_timeline_events(
    organization_id,booking_id,kind,actor_id,summary,payload
  ) VALUES (
    r.organization_id,r.booking_id,'amendment_handoff',v_actor,
    CASE p_action
      WHEN 'supplier_confirm' THEN 'تم تسجيل مرجع تأكيد المورد للتعديل المقترح'
      WHEN 'finance_verify' THEN 'تم تسجيل مراجعة الحسابات للتعديل المقترح'
      WHEN 'report_execution' THEN 'تم تسجيل إقرار تشغيلي باستكمال التعديل'
      ELSE 'تم إيقاف متابعة تعديل الحجز'
    END,
    jsonb_build_object('change_request_id',r.id,'status',v_next,'step',p_action)
  );

  -- IMPORTANT: This call ONLY tracks human attestations/evidence.
  -- It does not confirm an actual supplier amendment, financial settlement,
  -- refund, accounting entry, or update source booking/service data.
  RETURN jsonb_build_object(
    'id',h.id,'status',v_next,'previous_status',v_previous,'replayed',false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_booking_change_handoff(uuid,text,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_booking_change_handoff(uuid,text,text,text)
  TO authenticated;
COMMIT;
