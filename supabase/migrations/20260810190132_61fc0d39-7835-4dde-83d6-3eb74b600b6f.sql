-- 1. Customers opt-out
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out_at timestamptz;

-- 2. Follow-ups: make them sendable
ALTER TABLE public.whatsapp_followups
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'reminder',
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS message_body text,
  ADD COLUMN IF NOT EXISTS sent_message_id uuid,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE public.whatsapp_followups DROP CONSTRAINT IF EXISTS whatsapp_followups_status_check;
ALTER TABLE public.whatsapp_followups ADD CONSTRAINT whatsapp_followups_status_check
  CHECK (status = ANY (ARRAY['pending','done','cancelled','snoozed','sending','sent','failed']));

ALTER TABLE public.whatsapp_followups DROP CONSTRAINT IF EXISTS whatsapp_followups_mode_check;
ALTER TABLE public.whatsapp_followups ADD CONSTRAINT whatsapp_followups_mode_check
  CHECK (mode = ANY (ARRAY['reminder','auto_send']));

CREATE INDEX IF NOT EXISTS idx_wa_followups_due
  ON public.whatsapp_followups (remind_at)
  WHERE status = 'pending' AND mode = 'auto_send';

-- 3. Broadcasts
ALTER TABLE public.whatsapp_broadcasts
  ADD COLUMN IF NOT EXISTS template_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- 4. Messages: idempotency + provenance
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS broadcast_id uuid,
  ADD COLUMN IF NOT EXISTS followup_id uuid,
  ADD COLUMN IF NOT EXISTS error_details jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_idem_uidx
  ON public.whatsapp_messages (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 5. Templates: store Meta components + variable counts
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS components jsonb,
  ADD COLUMN IF NOT EXISTS body_variable_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS header_variable_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS header_format text;

-- 6. Service-window helper
CREATE OR REPLACE FUNCTION public.whatsapp_window_open(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.whatsapp_messages m
    WHERE m.conversation_id = _conversation_id
      AND m.direction = 'inbound'
      AND m.sent_at > now() - interval '24 hours'
  );
$$;

REVOKE ALL ON FUNCTION public.whatsapp_window_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_window_open(uuid) TO authenticated, service_role;
