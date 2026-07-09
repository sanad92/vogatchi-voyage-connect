
CREATE TABLE IF NOT EXISTS public.whatsapp_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled','snoozed')),
  assigned_to uuid,
  created_by uuid NOT NULL,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_followups_conv ON public.whatsapp_followups(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_followups_pending ON public.whatsapp_followups(organization_id, status, remind_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_followups TO authenticated;
GRANT ALL ON public.whatsapp_followups TO service_role;

ALTER TABLE public.whatsapp_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_followups_select" ON public.whatsapp_followups
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "wa_followups_insert" ON public.whatsapp_followups
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    AND created_by = auth.uid());

CREATE POLICY "wa_followups_update" ON public.whatsapp_followups
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "wa_followups_delete" ON public.whatsapp_followups
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_wa_followups_updated_at
  BEFORE UPDATE ON public.whatsapp_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_followups;
