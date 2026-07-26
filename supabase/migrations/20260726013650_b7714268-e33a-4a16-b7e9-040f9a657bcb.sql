
REVOKE EXECUTE ON FUNCTION public.get_workflow_progress(text, uuid)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_workflow(uuid, text, text)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ops_command_center(date)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_business_health_kpis(date, date)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.retry_workflow_rule_run(uuid, uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handler_workflow_rules(public.domain_events) FROM PUBLIC, anon;
