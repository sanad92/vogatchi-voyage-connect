CREATE OR REPLACE FUNCTION public.advance_workflow(p_booking_id uuid, p_to_stage text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from text; v_org uuid;
BEGIN
  SELECT workflow_stage::text, organization_id INTO v_from, v_org
  FROM public.bookings WHERE id=p_booking_id;
  IF v_from IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members m
                WHERE m.organization_id=v_org AND m.user_id=auth.uid())
     AND NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.bookings SET workflow_stage=p_to_stage::booking_workflow_stage, updated_at=now()
  WHERE id=p_booking_id;

  -- Emit event using the canonical name that event_subscriptions listens for.
  PERFORM public.emit_event(
    'booking.stage_changed', 'booking', p_booking_id, v_org,
    jsonb_build_object('from',v_from,'to',p_to_stage,'reason',p_reason,'actor',auth.uid(),'booking_id',p_booking_id),
    'workflow_advance:'||p_booking_id||':'||v_from||'->'||p_to_stage||':'||extract(epoch from now())::bigint
  );

  RETURN jsonb_build_object('ok',true,'from',v_from,'to',p_to_stage);
END; $function$;