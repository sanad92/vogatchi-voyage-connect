
-- ===== whatsapp_automation_rules_v2 =====
CREATE TABLE public.whatsapp_automation_rules_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'message_received', 'message_sent', 'conversation_opened',
    'conversation_closed', 'keyword_match', 'no_reply_timeout',
    'first_message', 'tag_added', 'sla_breach'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_auto_rules_v2_org ON public.whatsapp_automation_rules_v2(organization_id);
CREATE INDEX idx_wa_auto_rules_v2_active ON public.whatsapp_automation_rules_v2(organization_id, is_active, trigger_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_automation_rules_v2 TO authenticated;
GRANT ALL ON public.whatsapp_automation_rules_v2 TO service_role;

ALTER TABLE public.whatsapp_automation_rules_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view automation rules v2"
  ON public.whatsapp_automation_rules_v2 FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members manage automation rules v2"
  ON public.whatsapp_automation_rules_v2 FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_wa_auto_rules_v2_updated
  BEFORE UPDATE ON public.whatsapp_automation_rules_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== whatsapp_automation_executions =====
CREATE TABLE public.whatsapp_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.whatsapp_automation_rules_v2(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  actions_executed JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_auto_exec_org ON public.whatsapp_automation_executions(organization_id, created_at DESC);
CREATE INDEX idx_wa_auto_exec_rule ON public.whatsapp_automation_executions(rule_id, created_at DESC);

GRANT SELECT ON public.whatsapp_automation_executions TO authenticated;
GRANT ALL ON public.whatsapp_automation_executions TO service_role;

ALTER TABLE public.whatsapp_automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view automation executions"
  ON public.whatsapp_automation_executions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_automation_rules_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_automation_executions;
