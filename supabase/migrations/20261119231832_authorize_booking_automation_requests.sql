-- Existing database triggers and maintenance jobs keep their internal functions.
REVOKE EXECUTE ON FUNCTION public.run_booking_automation(uuid),
  public.retry_booking_automation_step(uuid),
  public.handler_run_booking_automation(public.domain_events)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.run_authorized_booking_automation(p_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  booking_record public.bookings%ROWTYPE;
BEGIN
  SELECT booking.* INTO booking_record
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
    AND public.can_org_write(booking.organization_id)
    AND public.has_org_permission(booking.organization_id, 'bookings_view')
    AND EXISTS (
      SELECT 1
      FROM public._org_permission_state(booking.organization_id, auth.uid(), 'bookings_edit') AS permission
      WHERE permission.granted AND permission.data_scope = 'organization'
    )
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Booking automation requires organization-level booking edit access and an active organization subscription';
  END IF;
  IF booking_record.status IN ('cancelled', 'canceled') OR booking_record.workflow_stage = 'cancelled' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Booking automation is unavailable after cancellation';
  END IF;

  RETURN public.run_booking_automation(p_booking_id);
END;
$$;

CREATE FUNCTION public.retry_authorized_booking_automation_step(p_step_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_booking_id uuid;
BEGIN
  SELECT booking.id INTO target_booking_id
  FROM public.booking_automation_steps AS step
  JOIN public.bookings AS booking ON booking.id = step.booking_id AND booking.organization_id = step.organization_id
  WHERE step.id = p_step_id AND step.status IN ('failed', 'skipped');

  RETURN public.run_authorized_booking_automation(target_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.run_authorized_booking_automation(uuid),
  public.retry_authorized_booking_automation_step(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_authorized_booking_automation(uuid),
  public.retry_authorized_booking_automation_step(uuid) TO authenticated;
