-- Prevent empty or unknown workflow stages from reaching the enum cast.
-- Existing invalid automation rules are disabled so they cannot break booking events.

UPDATE public.workflow_rules
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND (
    (
      action ->> 'type' IN ('advance_stage', 'advance_workflow')
      AND btrim(coalesce(action ->> 'to', action #>> '{params,to_stage}', '')) = ''
    )
    OR (
      jsonb_typeof(action -> 'steps') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(action -> 'steps') AS step
        WHERE step ->> 'type' IN ('advance_stage', 'advance_workflow')
          AND btrim(coalesce(step ->> 'to', step #>> '{params,to_stage}', '')) = ''
      )
    )
  );

CREATE OR REPLACE FUNCTION public.advance_workflow(
  p_booking_id uuid,
  p_to_stage text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text;
  v_org uuid;
  v_target text := btrim(coalesce(p_to_stage, ''));
BEGIN
  IF v_target = '' OR NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'booking_workflow_stage'
      AND e.enumlabel = v_target
  ) THEN
    RAISE EXCEPTION 'invalid booking workflow stage: %', coalesce(nullif(v_target, ''), '(empty)')
      USING ERRCODE = '22023';
  END IF;

  SELECT workflow_stage::text, organization_id
  INTO v_from, v_org
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'booking not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = v_org
      AND m.user_id = auth.uid()
  ) AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.bookings
  SET workflow_stage = v_target::public.booking_workflow_stage,
      updated_at = now()
  WHERE id = p_booking_id;

  PERFORM public.emit_event(
    'booking.stage_changed',
    'booking',
    p_booking_id,
    v_org,
    jsonb_build_object(
      'from', v_from,
      'to', v_target,
      'reason', p_reason,
      'actor', auth.uid(),
      'booking_id', p_booking_id
    ),
    'workflow_advance:' || p_booking_id || ':' || v_from || '->' || v_target || ':' ||
      extract(epoch from now())::bigint
  );

  RETURN jsonb_build_object('ok', true, 'from', v_from, 'to', v_target);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.advance_workflow(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_workflow(uuid, text, text) TO authenticated;
