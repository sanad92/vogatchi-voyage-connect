-- 1. Fix all callers to use the correct argument order first
DO $do$
DECLARE r record; newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) ~ 'user_belongs_to_org\([^,()]+, auth\.uid\(\)\)'
  LOOP
    newdef := regexp_replace(r.def, 'user_belongs_to_org\(([^,()]+), auth\.uid\(\)\)', 'user_belongs_to_org(auth.uid(), \1)', 'g');
    EXECUTE newdef;
  END LOOP;
END
$do$;

-- 2. Remove the reversed-argument branch
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.organization_id = _org_id
  );
$function$;

-- 3. Fix mutable search_path on internal email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = '';
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = '';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = '';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = '';

-- 4. Revoke anon/public EXECUTE on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM anon, public;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM anon, public;
REVOKE ALL ON FUNCTION public.trg_sop_auto_assign() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;

-- 5. Restrict journey_step_runs inserts to the user's own organization
DROP POLICY IF EXISTS journey_runs_write ON public.journey_step_runs;
CREATE POLICY journey_runs_write ON public.journey_step_runs
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.journey_enrollments e
  WHERE e.id = journey_step_runs.enrollment_id
    AND public.user_belongs_to_org(auth.uid(), e.organization_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.journey_enrollments e
  WHERE e.id = journey_step_runs.enrollment_id
    AND public.user_belongs_to_org(auth.uid(), e.organization_id)
));