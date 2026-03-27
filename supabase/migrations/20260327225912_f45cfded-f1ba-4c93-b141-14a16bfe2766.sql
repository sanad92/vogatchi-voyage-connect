
-- Automation Rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- booking_created, payment_confirmed, before_travel, booking_status_changed
  trigger_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Automation Actions table
CREATE TABLE public.automation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- send_email, send_whatsapp, create_invoice, send_reminder
  action_config jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Automation Execution Log
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id),
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  booking_id uuid,
  booking_type text,
  status text DEFAULT 'pending', -- pending, processing, completed, failed
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_automation_rules_org ON public.automation_rules(organization_id);
CREATE INDEX idx_automation_rules_trigger ON public.automation_rules(trigger_type);
CREATE INDEX idx_automation_rules_active ON public.automation_rules(is_active);
CREATE INDEX idx_automation_actions_rule ON public.automation_actions(rule_id);
CREATE INDEX idx_automation_logs_org ON public.automation_logs(organization_id);
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);

-- RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage automation rules for their org" ON public.automation_rules
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can manage automation actions for their org rules" ON public.automation_actions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND public.user_belongs_to_org(auth.uid(), r.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.automation_rules r WHERE r.id = rule_id AND public.user_belongs_to_org(auth.uid(), r.organization_id)));

CREATE POLICY "Users can view automation logs for their org" ON public.automation_logs
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
