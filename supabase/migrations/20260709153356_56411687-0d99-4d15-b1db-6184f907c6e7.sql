
CREATE TABLE public.whatsapp_chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  bot_name TEXT NOT NULL DEFAULT 'مساعد Vogatchi',
  system_prompt TEXT NOT NULL DEFAULT 'أنت مساعد ذكي لوكالة سفر Vogatchi. رد بلطف واحترافية على أسئلة العملاء حول الوجهات والحجوزات والأسعار. إذا كان السؤال معقّدًا أو يحتاج تدخل بشري، اقترح تحويل المحادثة لموظف.',
  welcome_message TEXT DEFAULT 'مرحبًا! أنا مساعدك الذكي. كيف أستطيع مساعدتك؟',
  handoff_keywords JSONB NOT NULL DEFAULT '["موظف", "بشري", "شخص حقيقي", "agent", "human"]'::jsonb,
  max_bot_replies INTEGER NOT NULL DEFAULT 5,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  respond_only_outside_hours BOOLEAN NOT NULL DEFAULT false,
  auto_handoff_on_error BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_chatbot_settings TO authenticated;
GRANT ALL ON public.whatsapp_chatbot_settings TO service_role;
ALTER TABLE public.whatsapp_chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage chatbot settings"
  ON public.whatsapp_chatbot_settings FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_wa_chatbot_settings_updated
  BEFORE UPDATE ON public.whatsapp_chatbot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_chatbot_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  user_message TEXT,
  bot_reply TEXT,
  was_handed_off BOOLEAN NOT NULL DEFAULT false,
  handoff_reason TEXT,
  model_used TEXT,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_bot_int_org ON public.whatsapp_chatbot_interactions(organization_id, created_at DESC);
CREATE INDEX idx_wa_bot_int_conv ON public.whatsapp_chatbot_interactions(conversation_id, created_at DESC);

GRANT SELECT ON public.whatsapp_chatbot_interactions TO authenticated;
GRANT ALL ON public.whatsapp_chatbot_interactions TO service_role;
ALTER TABLE public.whatsapp_chatbot_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view chatbot interactions"
  ON public.whatsapp_chatbot_interactions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chatbot_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chatbot_interactions;
