DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.create_organization_invitation(uuid,text,public.org_role)'::regprocedure) INTO d;
  d := replace(d, 'v_queue_id := public.queue_organization_invitation_email(v_invite.id);', 'v_queue_id := NULL;');
  d := replace(d, '''email_queued'', true', '''email_queued'', false');
  EXECUTE d;
  SELECT pg_get_functiondef('public.resend_organization_invitation(uuid)'::regprocedure) INTO d;
  d := replace(d, 'v_queue_id := public.queue_organization_invitation_email(v_invite.id);', 'v_queue_id := NULL;');
  d := replace(d, '''email_queued'', true', '''email_queued'', false');
  EXECUTE d;
END $mig$;
DROP FUNCTION IF EXISTS public.queue_organization_invitation_email(uuid);