DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'sop\_%'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

DO $$
DECLARE r record; expr text := 'public.user_belongs_to_org(auth.uid(), organization_id)';
BEGIN
  FOR r IN
    SELECT p.polname, p.polrelid::regclass::text AS tbl, p.polcmd,
           pg_get_expr(p.polqual, p.polrelid) AS q,
           pg_get_expr(p.polwithcheck, p.polrelid) AS wc
    FROM pg_policy p
    WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%user\_belongs\_to\_org(organization\_id%'
       OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%user\_belongs\_to\_org(organization\_id%'
  LOOP
    IF r.q IS NOT NULL AND r.wc IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %s USING (%s) WITH CHECK (%s)', r.polname, r.tbl, expr, expr);
    ELSIF r.q IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %s USING (%s)', r.polname, r.tbl, expr);
    ELSE
      EXECUTE format('ALTER POLICY %I ON %s WITH CHECK (%s)', r.polname, r.tbl, expr);
    END IF;
  END LOOP;
END $$;