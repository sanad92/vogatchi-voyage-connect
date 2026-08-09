REVOKE EXECUTE ON FUNCTION public.sop_validate_transition(uuid, public.sop_lead_stage) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_complete_handover(uuid, public.sop_handover_type, jsonb, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sop_reassign_lead(uuid, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.sop_validate_transition(uuid, public.sop_lead_stage) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sop_publish_pricing(uuid, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sop_complete_handover(uuid, public.sop_handover_type, jsonb, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sop_reassign_lead(uuid, uuid, text) TO authenticated, service_role;