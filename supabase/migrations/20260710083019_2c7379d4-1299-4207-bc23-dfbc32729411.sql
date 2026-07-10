-- AI Assistant threads and messages for admins/CFO/managers
CREATE TABLE public.ai_assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistant_threads TO authenticated;
GRANT ALL ON public.ai_assistant_threads TO service_role;
ALTER TABLE public.ai_assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_threads_user ON public.ai_assistant_threads(organization_id, user_id, updated_at DESC);

CREATE POLICY "ai_threads_owner_select" ON public.ai_assistant_threads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin','manager')
    )
  );

CREATE POLICY "ai_threads_owner_insert" ON public.ai_assistant_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin','manager')
    )
  );

CREATE POLICY "ai_threads_owner_update" ON public.ai_assistant_threads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_threads_owner_delete" ON public.ai_assistant_threads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_assistant_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT,
  tool_calls JSONB,
  tool_name TEXT,
  tool_call_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistant_messages TO authenticated;
GRANT ALL ON public.ai_assistant_messages TO service_role;
ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_messages_thread ON public.ai_assistant_messages(thread_id, created_at);

CREATE POLICY "ai_messages_via_thread_select" ON public.ai_assistant_messages
  FOR SELECT TO authenticated
  USING (thread_id IN (SELECT id FROM public.ai_assistant_threads WHERE user_id = auth.uid()));

CREATE POLICY "ai_messages_via_thread_insert" ON public.ai_assistant_messages
  FOR INSERT TO authenticated
  WITH CHECK (thread_id IN (SELECT id FROM public.ai_assistant_threads WHERE user_id = auth.uid()));

CREATE POLICY "ai_messages_via_thread_delete" ON public.ai_assistant_messages
  FOR DELETE TO authenticated
  USING (thread_id IN (SELECT id FROM public.ai_assistant_threads WHERE user_id = auth.uid()));

-- Actions audit trail (for Phase C write-tools; created now to avoid a later migration)
CREATE TABLE public.ai_assistant_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.ai_assistant_threads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'executed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_assistant_actions_log TO authenticated;
GRANT ALL ON public.ai_assistant_actions_log TO service_role;
ALTER TABLE public.ai_assistant_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_actions_org_admin_select" ON public.ai_assistant_actions_log
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
        AND role IN ('owner','admin','manager')
    )
  );

CREATE POLICY "ai_actions_own_insert" ON public.ai_assistant_actions_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at on threads
CREATE OR REPLACE FUNCTION public.ai_threads_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_ai_threads_touch
  BEFORE UPDATE ON public.ai_assistant_threads
  FOR EACH ROW EXECUTE FUNCTION public.ai_threads_touch();