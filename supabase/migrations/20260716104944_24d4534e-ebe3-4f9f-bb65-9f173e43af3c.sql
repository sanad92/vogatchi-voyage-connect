
-- Phase 1: Workflow spine — stages, tasks, timeline events

-- 1. Workflow stage enum
DO $$ BEGIN
  CREATE TYPE public.booking_workflow_stage AS ENUM (
    'lead','qualified','quoted','confirmed','paid','operations','traveling','completed','post_travel','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS workflow_stage public.booking_workflow_stage NOT NULL DEFAULT 'lead';

CREATE INDEX IF NOT EXISTS idx_bookings_workflow_stage ON public.bookings(organization_id, workflow_stage);

-- 2. Booking tasks
CREATE TABLE IF NOT EXISTS public.booking_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',       -- open | in_progress | done | cancelled
  priority text NOT NULL DEFAULT 'normal',   -- low | normal | high | urgent
  assignee_id uuid,
  source text,                               -- manual | automation | stage_change | whatsapp
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_tasks TO authenticated;
GRANT ALL ON public.booking_tasks TO service_role;

ALTER TABLE public.booking_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_tasks org read" ON public.booking_tasks
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "booking_tasks org write" ON public.booking_tasks
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "booking_tasks org update" ON public.booking_tasks
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "booking_tasks org delete" ON public.booking_tasks
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking ON public.booking_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_org_status ON public.booking_tasks(organization_id, status, due_at);

-- 3. Booking timeline events (append-only)
CREATE TABLE IF NOT EXISTS public.booking_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL,        -- stage_changed | note_added | whatsapp_message | invoice_created | payment_recorded | task_created | task_completed | document_uploaded | automation_triggered | manual
  actor_id uuid,
  actor_label text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.booking_timeline_events TO authenticated;
GRANT ALL ON public.booking_timeline_events TO service_role;

ALTER TABLE public.booking_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_timeline read" ON public.booking_timeline_events
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "booking_timeline insert" ON public.booking_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_booking_timeline_booking_occurred ON public.booking_timeline_events(booking_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_timeline_org_kind ON public.booking_timeline_events(organization_id, kind, occurred_at DESC);

-- 4. updated_at trigger reuse
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $fn$
  BEGIN NEW.updated_at = now(); RETURN NEW; END;
  $fn$;
EXCEPTION WHEN others THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_booking_tasks_updated ON public.booking_tasks;
CREATE TRIGGER trg_booking_tasks_updated
  BEFORE UPDATE ON public.booking_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Timeline emitter: stage change
CREATE OR REPLACE FUNCTION public.bookings_emit_stage_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
    INSERT INTO public.booking_timeline_events(organization_id, booking_id, kind, actor_id, summary, payload)
    VALUES (NEW.organization_id, NEW.id, 'stage_changed', auth.uid(),
            format('Stage: %s → %s', OLD.workflow_stage, NEW.workflow_stage),
            jsonb_build_object('from', OLD.workflow_stage, 'to', NEW.workflow_stage));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bookings_stage_timeline ON public.bookings;
CREATE TRIGGER trg_bookings_stage_timeline
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_emit_stage_timeline();

-- 6. Timeline emitter: task lifecycle
CREATE OR REPLACE FUNCTION public.booking_tasks_emit_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_timeline_events(organization_id, booking_id, kind, actor_id, summary, payload)
    VALUES (NEW.organization_id, NEW.booking_id, 'task_created', auth.uid(), NEW.title,
            jsonb_build_object('task_id', NEW.id, 'due_at', NEW.due_at, 'priority', NEW.priority));
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status <> 'done' THEN
    INSERT INTO public.booking_timeline_events(organization_id, booking_id, kind, actor_id, summary, payload)
    VALUES (NEW.organization_id, NEW.booking_id, 'task_completed', auth.uid(), NEW.title,
            jsonb_build_object('task_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_booking_tasks_timeline ON public.booking_tasks;
CREATE TRIGGER trg_booking_tasks_timeline
  AFTER INSERT OR UPDATE ON public.booking_tasks
  FOR EACH ROW EXECUTE FUNCTION public.booking_tasks_emit_timeline();

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_timeline_events;
