REVOKE ALL ON FUNCTION public.can_see_email_thread(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_email_thread(uuid, uuid) TO authenticated;