-- Safar ERP / Trip File 2.0 Sprint 13 — READ-ONLY permission posture.
-- Safe to run in a staging SQL console or on the live schema: reads
-- pg_catalog metadata only. Does NOT read booking/customer rows, migrate,
-- create objects, or prove that a signed-in JWT is accepted by RLS.
-- Gate=PASS for all ten objects is necessary, but not sufficient, for release.
WITH expected(kind, object_name, arguments) AS (
  VALUES
  ('table', 'booking_change_requests', ''),
  ('table', 'booking_change_handoffs', ''),
  ('table', 'booking_change_handoff_events', ''),
  ('table', 'booking_change_source_evidence', ''),
  ('table', 'quote_version_snapshots', ''),
  ('function', 'create_booking_change_request', 'uuid,uuid,text,text,text,text,numeric,numeric,text'),
  ('function', 'decide_booking_change_request', 'uuid,boolean,text'),
  ('function', 'record_booking_change_handoff', 'uuid,text,text,text'),
  ('function', 'link_booking_change_source_evidence', 'uuid,text,uuid'),
  ('function', 'capture_quote_version_snapshot', 'uuid')
),
targets AS (
  SELECT e.*,
    CASE WHEN kind='table'
      THEN to_regclass('public.' || object_name) END AS table_oid,
    CASE WHEN kind='function'
      THEN to_regprocedure('public.' || object_name || '(' || arguments || ')')
    END AS function_oid
  FROM expected e
),
checks AS (
  SELECT t.kind, t.object_name,
    CASE WHEN t.kind='table' THEN t.table_oid IS NOT NULL
      ELSE t.function_oid IS NOT NULL END AS installed,
    CASE WHEN t.kind='table' THEN coalesce(c.relrowsecurity,false)
      ELSE coalesce(p.prosecdef,false) END AS rls_or_security_definer,
    CASE WHEN t.kind='table'
      THEN coalesce(has_table_privilege('authenticated',t.table_oid,'SELECT'),false)
      ELSE coalesce(has_function_privilege('authenticated',t.function_oid,'EXECUTE'),false)
    END AS authenticated_access,
    CASE WHEN t.kind='table' THEN coalesce(NOT (
        has_table_privilege('authenticated',t.table_oid,'INSERT')
        OR has_table_privilege('authenticated',t.table_oid,'UPDATE')
        OR has_table_privilege('authenticated',t.table_oid,'DELETE')
        OR has_table_privilege('authenticated',t.table_oid,'TRUNCATE')
      ),false)
      ELSE coalesce(EXISTS (
        SELECT 1
        FROM unnest(p.proconfig) AS config_setting
        WHERE config_setting IN ('search_path=', 'search_path=""')
      ),false)
    END AS locked_write_or_search_path,
    CASE WHEN t.kind='table' THEN coalesce(NOT (
        has_table_privilege('anon',t.table_oid,'SELECT')
        OR has_table_privilege('anon',t.table_oid,'INSERT')
        OR has_table_privilege('anon',t.table_oid,'UPDATE')
        OR has_table_privilege('anon',t.table_oid,'DELETE')
        OR has_table_privilege('anon',t.table_oid,'TRUNCATE')
      ),false)
      ELSE coalesce(NOT has_function_privilege('anon',t.function_oid,'EXECUTE'),false)
    END AS anonymous_blocked,
    CASE WHEN t.kind='table' THEN
      EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies pol
        WHERE pol.schemaname='public' AND pol.tablename=t.object_name
          AND pol.cmd IN ('SELECT','ALL')
          AND 'authenticated'=ANY(pol.roles)
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies pol
        WHERE pol.schemaname='public' AND pol.tablename=t.object_name
          AND ('anon'=ANY(pol.roles) OR 'public'=ANY(pol.roles))
      )
      ELSE coalesce(p.prosecdef,false)
    END AS guarded_policy_or_function
  FROM targets t
  LEFT JOIN pg_catalog.pg_class c ON c.oid=t.table_oid
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=t.function_oid
)
SELECT kind AS object_type, object_name,
  CASE WHEN installed AND rls_or_security_definer AND authenticated_access
       AND locked_write_or_search_path AND anonymous_blocked
       AND guarded_policy_or_function THEN 'PASS' ELSE 'BLOCK' END AS gate,
  installed, rls_or_security_definer, authenticated_access,
  locked_write_or_search_path, anonymous_blocked,
  guarded_policy_or_function
FROM checks
ORDER BY object_type, object_name;
