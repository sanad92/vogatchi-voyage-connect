ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS resolution_status text,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;
ALTER TABLE public.whatsapp_conversations DROP CONSTRAINT IF EXISTS whatsapp_conversations_resolution_status_check;
ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT whatsapp_conversations_resolution_status_check
  CHECK (resolution_status IS NULL OR resolution_status IN ('done','follow_up','cancelled','spam','no_response','booked'));
ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT whatsapp_conversations_resolution_notes_len CHECK (resolution_notes IS NULL OR length(resolution_notes) <= 1000);