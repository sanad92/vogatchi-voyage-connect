-- Safar ERP — Trip File & Booking Operations 2.0 / Sprint 1
-- STAGED ONLY. This script is NOT automatically deployed or run in Lovable Cloud.
-- Adds proposed booking amendments with review and audit, never books/changes/charges.
-- Requires existing bookings, organization_members, booking_timeline_events,
-- auth.uid() and company-scoped permission helper has_org_permission(uuid,text).
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  request_key uuid NOT NULL,
  change_kind text NOT NULL CHECK (
    change_kind IN ('dates','travellers','room','service','cancellation','other')
  ),
  service_kind text CHECK (service_kind IN ('hotel','flight','transport','car')),
  service_reference text CHECK (service_reference IS NULL OR char_length(service_reference) <= 80),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  proposed_selling_delta numeric(16,2),
  proposed_cost_delta numeric(16,2),
  estimate_currency text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  CONSTRAINT booking_change_requests_estimate_currency CHECK (
    (proposed_selling_delta IS NULL AND proposed_cost_delta IS NULL AND estimate_currency IS NULL)
    OR (estimate_currency ~ '^[A-Z]{3}$'
        AND (proposed_selling_delta IS NOT NULL OR proposed_cost_delta IS NOT NULL))
  ),
  CONSTRAINT booking_change_requests_estimate_bounds CHECK (
    (proposed_selling_delta IS NULL OR abs(proposed_selling_delta) <= 1000000000000)
    AND (proposed_cost_delta IS NULL OR abs(proposed_cost_delta) <= 1000000000000)
  ),
  CONSTRAINT booking_change_requests_review_consistency CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT booking_change_requests_org_key_unique UNIQUE (organization_id, request_key)
);
CREATE INDEX IF NOT EXISTS booking_change_requests_by_booking
  ON public.booking_change_requests (organization_id, booking_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS booking_change_requests_pending
  ON public.booking_change_requests (organization_id, requested_at)
  WHERE status = 'pending';

-- All mutation paths go through server-validated, auditable RPCs. Do not give
-- direct INSERT/UPDATE/DELETE privileges to browser roles.
REVOKE ALL ON TABLE public.booking_change_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_change_requests TO authenticated;
GRANT ALL ON public.booking_change_requests TO service_role;
ALTER TABLE public.booking_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_change_requests_org_read ON public.booking_change_requests;
CREATE POLICY booking_change_requests_org_read
  ON public.booking_change_requests FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.organization_id = booking_change_requests.organization_id
        AND m.is_active IS TRUE
    )
    AND public.has_org_permission(organization_id, 'bookings_view')
  );

CREATE OR REPLACE FUNCTION public.create_booking_change_request(
  p_booking_id uuid,
  p_request_key uuid,
  p_change_kind text,
  p_description text,
  p_service_kind text DEFAULT NULL,
  p_service_reference text DEFAULT NULL,
  p_selling_delta numeric DEFAULT NULL,
  p_cost_delta numeric DEFAULT NULL,
  p_currency text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  old_request public.booking_change_requests%ROWTYPE;
  v_id uuid;
  v_currency text := NULLIF(upper(btrim(coalesce(p_currency,''))),'');
  v_reference text := NULLIF(btrim(coalesce(p_service_reference,'')),'');
  v_description text := btrim(coalesce(p_description,''));
BEGIN
  IF auth.uid() IS NULL OR p_booking_id IS NULL OR p_request_key IS NULL
     OR p_change_kind IS NULL
     OR p_change_kind NOT IN ('dates','travellers','room','service','cancellation','other')
     OR char_length(v_description) NOT BETWEEN 10 AND 2000
     OR (p_service_kind IS NOT NULL AND p_service_kind NOT IN ('hotel','flight','transport','car'))
     OR char_length(coalesce(v_reference,'')) > 80
     OR (p_selling_delta IS NOT NULL AND (abs(p_selling_delta)>1000000000000 OR scale(p_selling_delta)>2))
     OR (p_cost_delta IS NOT NULL AND (abs(p_cost_delta)>1000000000000 OR scale(p_cost_delta)>2))
     OR (
       (p_selling_delta IS NOT NULL OR p_cost_delta IS NOT NULL)
       AND (v_currency IS NULL OR v_currency !~ '^[A-Z]{3}$')
     )
     OR (
       p_selling_delta IS NULL AND p_cost_delta IS NULL AND v_currency IS NOT NULL
     )
  THEN
    RAISE EXCEPTION 'invalid_change_request' USING ERRCODE='22023';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR b.organization_id IS NULL THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = b.organization_id
      AND m.user_id = auth.uid() AND m.is_active IS TRUE
  ) OR NOT coalesce(public.has_org_permission(b.organization_id,'bookings_edit'),false)
  THEN
    RAISE EXCEPTION 'booking_change_permission_denied' USING ERRCODE='42501';
  END IF;

  IF b.status::text IN ('cancelled','canceled')
     OR b.workflow_stage::text = 'cancelled' THEN
    RAISE EXCEPTION 'cancelled_booking_cannot_be_amended' USING ERRCODE='22023';
  END IF;

  -- The request key is generated once per form submission, so a retried
  -- network call cannot produce duplicate proposals/timeline entries.
  SELECT * INTO old_request
  FROM public.booking_change_requests
  WHERE organization_id=b.organization_id AND request_key=p_request_key
  FOR UPDATE;
  IF FOUND THEN
    IF old_request.booking_id <> p_booking_id
       OR old_request.requested_by <> auth.uid()
       OR old_request.change_kind <> p_change_kind
       OR old_request.description <> v_description
       OR old_request.service_kind IS DISTINCT FROM p_service_kind
       OR old_request.service_reference IS DISTINCT FROM v_reference
       OR old_request.proposed_selling_delta IS DISTINCT FROM p_selling_delta
       OR old_request.proposed_cost_delta IS DISTINCT FROM p_cost_delta
       OR old_request.estimate_currency IS DISTINCT FROM v_currency
    THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('id',old_request.id,'status',old_request.status,'replayed',true);
  END IF;

  -- Another concurrent insertion with the same request_key may win. Do not
  -- return its ID without validating that it belongs to this user and payload.
  INSERT INTO public.booking_change_requests (
    organization_id, booking_id, request_key, change_kind,
    service_kind, service_reference, description,
    proposed_selling_delta, proposed_cost_delta, estimate_currency, requested_by
  ) VALUES (
    b.organization_id, b.id, p_request_key, p_change_kind,
    p_service_kind, v_reference, v_description,
    p_selling_delta, p_cost_delta, v_currency, auth.uid()
  ) ON CONFLICT ON CONSTRAINT booking_change_requests_org_key_unique DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT * INTO old_request
    FROM public.booking_change_requests
    WHERE organization_id=b.organization_id AND request_key=p_request_key;
    IF old_request.id IS NULL OR old_request.booking_id <> p_booking_id
       OR old_request.requested_by <> auth.uid()
       OR old_request.change_kind <> p_change_kind
       OR old_request.description <> v_description
       OR old_request.service_kind IS DISTINCT FROM p_service_kind
       OR old_request.service_reference IS DISTINCT FROM v_reference
       OR old_request.proposed_selling_delta IS DISTINCT FROM p_selling_delta
       OR old_request.proposed_cost_delta IS DISTINCT FROM p_cost_delta
       OR old_request.estimate_currency IS DISTINCT FROM v_currency
    THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('id',old_request.id,'status',old_request.status,'replayed',true);
  END IF;

  INSERT INTO public.booking_timeline_events(
    organization_id, booking_id, kind, actor_id, summary, payload
  ) VALUES (
    b.organization_id, b.id,'amendment_requested',auth.uid(),
    'تم تسجيل طلب تعديل حجز للمراجعة',
    jsonb_build_object('change_request_id',v_id,'kind',p_change_kind)
  );

  RETURN jsonb_build_object('id',v_id,'status','pending','replayed',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_booking_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.booking_change_requests%ROWTYPE;
  v_note text := NULLIF(btrim(coalesce(p_note,'')),'');
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR p_request_id IS NULL OR p_approve IS NULL
     OR char_length(coalesce(p_note,''))>1000
     OR (NOT p_approve AND char_length(coalesce(v_note,'')) < 3) THEN
    RAISE EXCEPTION 'invalid_change_decision' USING ERRCODE='22023';
  END IF;

  SELECT * INTO r FROM public.booking_change_requests
  WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'change_request_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = r.organization_id
      AND m.user_id = auth.uid() AND m.is_active IS TRUE
      AND m.role::text IN ('owner','admin','manager')
  ) OR NOT coalesce(public.has_org_permission(r.organization_id,'bookings_confirm'),false) THEN
    RAISE EXCEPTION 'change_decision_permission_denied' USING ERRCODE='42501';
  END IF;
  IF r.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'self_review_forbidden' USING ERRCODE='42501';
  END IF;
  IF r.status <> 'pending' THEN
    RETURN jsonb_build_object('id',r.id,'status',r.status,'already_decided',true);
  END IF;

  v_status := CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
  UPDATE public.booking_change_requests
  SET status=v_status, reviewed_by=auth.uid(),
      reviewed_at=now(), review_note=v_note
  WHERE id=r.id AND status='pending';

  INSERT INTO public.booking_timeline_events(
    organization_id,booking_id,kind,actor_id,summary,payload
  ) VALUES(
    r.organization_id,r.booking_id,'amendment_reviewed',auth.uid(),
    CASE WHEN p_approve THEN 'تمت الموافقة الإدارية على مقترح التعديل'
         ELSE 'تم رفض مقترح التعديل' END,
    jsonb_build_object('change_request_id',r.id,'status',v_status)
  );

  -- NOTE: The decision NEVER updates bookings/services/invoices/payments.
  -- Existing SOP approval and operational steps still apply to execution.
  RETURN jsonb_build_object('id',r.id,'status',v_status,'already_decided',false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_change_request(
  uuid,uuid,text,text,text,text,numeric,numeric,text
) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.decide_booking_change_request(uuid,boolean,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_booking_change_request(
  uuid,uuid,text,text,text,text,numeric,numeric,text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_booking_change_request(uuid,boolean,text)
  TO authenticated;
COMMIT;
