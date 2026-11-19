CREATE UNIQUE INDEX automation_customer_registration_action_once
ON public.automation_logs (rule_id, (metadata->>'customer_id'), (metadata->>'action_id'))
WHERE trigger_type = 'customer_registered' AND action_type = 'send_email';

CREATE OR REPLACE FUNCTION public.queue_customer_registration_automation(p_org_id uuid, p_customer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_action record;
  v_queued integer := 0;
BEGIN
  IF public.has_org_permission(p_org_id, 'customers_create') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Customer registration automation not available' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_customer FROM public.customers
  WHERE id = p_customer_id AND organization_id = p_org_id
    AND created_by = (SELECT auth.uid()) AND NOT is_demo AND archived_at IS NULL;
  IF NOT FOUND OR nullif(btrim(v_customer.email), '') IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_action IN
    SELECT r.id AS rule_id, a.id AS action_id, a.action_config
    FROM public.automation_rules r JOIN public.automation_actions a ON a.rule_id = r.id
    WHERE r.organization_id = p_org_id AND r.is_active
      AND r.trigger_type = 'customer_registered' AND r.trigger_config = '{"has_email":true}'::jsonb
      AND a.is_active AND a.action_type = 'send_email'
      AND NOT EXISTS (
        SELECT 1 FROM public.automation_actions other
        WHERE other.rule_id = r.id AND other.is_active AND other.action_type <> 'send_email'
      )
    ORDER BY r.id, a.sort_order, a.id
  LOOP
    INSERT INTO public.automation_logs (rule_id, organization_id, trigger_type, action_type, status, metadata)
    VALUES (v_action.rule_id, p_org_id, 'customer_registered', 'send_email', 'queued',
      jsonb_build_object('customer_id', p_customer_id, 'action_id', v_action.action_id))
    ON CONFLICT (rule_id, (metadata->>'customer_id'), (metadata->>'action_id'))
    WHERE trigger_type = 'customer_registered' AND action_type = 'send_email'
    DO NOTHING;
    IF FOUND THEN
      INSERT INTO public.email_queue (organization_id, email_type, recipient_email, recipient_name, subject, template_data)
      VALUES (p_org_id, 'customer_registered', btrim(v_customer.email), v_customer.name,
        nullif(btrim(v_action.action_config->>'subject'), ''), jsonb_build_object('customer_name', v_customer.name));
      v_queued := v_queued + 1;
    END IF;
  END LOOP;

  RETURN v_queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_customer_registration_automation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_customer_registration_automation(uuid, uuid) TO authenticated;
