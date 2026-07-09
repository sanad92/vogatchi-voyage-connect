
-- 1) Extend whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS last_note_preview TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

-- Drop old status CHECK if exists and expand allowed statuses
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.whatsapp_conversations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.whatsapp_conversations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.whatsapp_conversations
  ADD CONSTRAINT whatsapp_conversations_status_check
  CHECK (status IN ('open','pending','active','resolved','closed','transferred','archived'));

CREATE INDEX IF NOT EXISTS idx_wa_conv_org_status ON public.whatsapp_conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org_assigned ON public.whatsapp_conversations(organization_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_conv_last_activity ON public.whatsapp_conversations(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_starred ON public.whatsapp_conversations(is_starred) WHERE is_starred = true;

-- 2) conversation_tags
CREATE TABLE IF NOT EXISTS public.conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_tags TO authenticated;
GRANT ALL ON public.conversation_tags TO service_role;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view tags" ON public.conversation_tags
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members manage tags" ON public.conversation_tags
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3) conversation_tag_assignments
CREATE TABLE IF NOT EXISTS public.conversation_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.conversation_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_tag_assignments TO authenticated;
GRANT ALL ON public.conversation_tag_assignments TO service_role;
ALTER TABLE public.conversation_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view tag assignments" ON public.conversation_tag_assignments
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members manage tag assignments" ON public.conversation_tag_assignments
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_conv_tag_assign_conv ON public.conversation_tag_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_tag_assign_tag ON public.conversation_tag_assignments(tag_id);

-- 4) conversation_internal_notes
CREATE TABLE IF NOT EXISTS public.conversation_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_internal_notes TO authenticated;
GRANT ALL ON public.conversation_internal_notes TO service_role;
ALTER TABLE public.conversation_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view internal notes" ON public.conversation_internal_notes
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members create internal notes" ON public.conversation_internal_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "Authors update own notes" ON public.conversation_internal_notes
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete own notes" ON public.conversation_internal_notes
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_conv_notes_conv ON public.conversation_internal_notes(conversation_id, created_at DESC);

-- 5) conversation_assignments_history
CREATE TABLE IF NOT EXISTS public.conversation_assignments_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  from_user_id UUID,
  to_user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('assigned','reassigned','transferred','unassigned','status_changed','priority_changed','tagged','starred','archived','resolved','reopened','closed')),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.conversation_assignments_history TO authenticated;
GRANT ALL ON public.conversation_assignments_history TO service_role;
ALTER TABLE public.conversation_assignments_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view history" ON public.conversation_assignments_history
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members insert history" ON public.conversation_assignments_history
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_conv_hist_conv ON public.conversation_assignments_history(conversation_id, created_at DESC);

-- 6) Trigger to update last_activity_at on new messages
CREATE OR REPLACE FUNCTION public.update_conversation_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET last_activity_at = now(),
      last_message_at = now(),
      first_response_at = CASE
        WHEN first_response_at IS NULL AND NEW.direction = 'outbound' THEN now()
        ELSE first_response_at
      END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_msg_activity ON public.whatsapp_messages;
CREATE TRIGGER trg_wa_msg_activity
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_activity();

-- 7) updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tags_updated ON public.conversation_tags;
CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.conversation_tags
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated ON public.conversation_internal_notes;
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.conversation_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 8) Enable realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_tags;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_tag_assignments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_internal_notes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_assignments_history;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
