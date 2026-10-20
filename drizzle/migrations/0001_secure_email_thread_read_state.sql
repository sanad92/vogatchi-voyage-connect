CREATE OR REPLACE FUNCTION public.set_email_thread_read_state(_organization uuid, _thread uuid, _marked_unread boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.email_threads%ROWTYPE;
  affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _marked_unread IS NULL THEN
    RAISE EXCEPTION 'Read state is required' USING ERRCODE = '22004';
  END IF;
  SELECT * INTO r FROM public.email_threads
  WHERE id = _thread AND organization_id = _organization FOR UPDATE;
  IF NOT FOUND OR NOT public.can_see_email_thread(r.organization_id, r.assigned_to) THEN
    RAISE EXCEPTION 'Email thread not found or not accessible' USING ERRCODE = '42501';
  END IF;
  UPDATE public.email_threads
  SET marked_unread = _marked_unread,
      last_read_at = CASE WHEN _marked_unread THEN last_read_at ELSE now() END
  WHERE id = r.id AND organization_id = _organization;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Email read state was not saved';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_email_thread_read_state(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_email_thread_read_state(uuid, uuid, boolean) TO authenticated;
COMMENT ON FUNCTION public.set_email_thread_read_state(uuid, uuid, boolean) IS 'Updates only shared read/unread state for visible email threads, including the queue; preserves assignment and workflow update permissions.';