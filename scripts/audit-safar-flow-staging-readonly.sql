-- Safar Flow release-preflight: SELECT ONLY. No jobs, DML, cron or DDL.
-- Intended for an operator against a STAGING clone AFTER reviewing PRs #17-#24.
-- Does not prove end-to-end authorization or worker health on its own.

-- 1. Required columns compared with the migration-driven code contracts.
WITH required_columns(table_schema,table_name,column_name) AS (
 VALUES
 ('public','bookings','id'),('public','bookings','organization_id'),
 ('public','bookings','status'),('public','bookings','start_date'),
 ('public','booking_tasks','booking_id'),('public','booking_tasks','organization_id'),
 ('public','booking_tasks','status'),('public','booking_tasks','priority'),
 ('public','booking_tasks','source'),('public','booking_tasks','due_at'),
 ('public','domain_events','id'),('public','domain_events','organization_id'),
 ('public','domain_events','aggregate_type'),('public','domain_events','aggregate_id'),
 ('public','domain_events','event_type'),('public','domain_events','occurred_at'),
 ('public','sop_approvals','id'),('public','sop_approvals','organization_id'),
 ('public','sop_approvals','approval_type'),('public','sop_approvals','status'),
 ('public','sop_approvals','requested_by'),('public','sop_approvals','decided_by'),
 ('public','organization_members','organization_id'),
 ('public','organization_members','user_id'),
 ('public','organization_members','is_active'),
 ('public','organization_members','role')
)
SELECT r.table_schema, r.table_name, r.column_name,
  CASE WHEN c.column_name IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS readiness
FROM required_columns r
LEFT JOIN information_schema.columns c
  ON c.table_schema = r.table_schema AND c.table_name = r.table_name
 AND c.column_name = r.column_name
ORDER BY readiness, r.table_name, r.column_name;

-- 2. Functional deployment inventory. Missing is expected before deployment.
WITH required_functions(stage, signature, exposed_to_browser) AS (
 VALUES
 ('V1','public.dispatch_quote_followups()',false),
 ('V2','safar_flow.dispatch_booking_tasks(integer)',false),
 ('V2','safar_flow.process_due_booking_tasks(integer)',false),
 ('V3','public.get_safar_flow_job_health(uuid,integer)',true),
 ('V4','safar_flow.dispatch_failure_alerts(integer,integer)',false),
 ('V4','public.get_safar_flow_alert_health(uuid,integer)',true),
 ('V5','public.sop_decide_approval(uuid,boolean,text)',true),
 ('V6','safar_flow.enqueue_upcoming_pretravel_checklists(integer,integer)',false)
), resolved AS (
 SELECT f.*, to_regprocedure(f.signature) AS oid
 FROM required_functions f
)
SELECT stage, signature,
  CASE WHEN oid IS NULL THEN 'NOT_DEPLOYED' ELSE 'DEPLOYED' END AS availability,
  CASE WHEN oid IS NULL THEN NULL
       ELSE has_function_privilege('authenticated',oid,'EXECUTE')
  END AS browser_can_execute,
  CASE WHEN oid IS NULL THEN NULL
       ELSE has_function_privilege('anon',oid,'EXECUTE')
  END AS anonymous_can_execute,
  exposed_to_browser AS intended_authenticated_access
FROM resolved ORDER BY stage,signature;

-- 3. Confirm private schema usage has not been granted to signed-in users.
SELECT to_regnamespace('safar_flow') IS NOT NULL AS private_schema_exists,
  CASE WHEN to_regnamespace('safar_flow') IS NULL THEN NULL
       ELSE has_schema_privilege('authenticated','safar_flow','USAGE')
  END AS authenticated_can_access_private_schema,
  CASE WHEN to_regnamespace('safar_flow') IS NULL THEN NULL
       ELSE has_schema_privilege('anon','safar_flow','USAGE')
  END AS anonymous_can_access_private_schema;

-- 4. Look for existing job schedulers without running or mutating them.
SELECT to_regclass('cron.job') IS NOT NULL AS pg_cron_job_table_present,
       to_regprocedure('safar_flow.dispatch_booking_tasks(integer)') IS NOT NULL
         AS safar_flow_dispatch_available;

-- 5. Existing SOP direct-write bypass checks (should be false AFTER V5 deployment).
SELECT has_table_privilege('authenticated','public.sop_approvals','INSERT')
           AS authenticated_can_direct_insert_approvals,
       has_table_privilege('authenticated','public.sop_approvals','UPDATE')
           AS authenticated_can_direct_update_approvals,
       has_table_privilege('authenticated','public.sop_approvals','DELETE')
           AS authenticated_can_direct_delete_approvals;
