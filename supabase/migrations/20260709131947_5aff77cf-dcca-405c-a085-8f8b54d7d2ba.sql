
-- Add media download tracking columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_download_status text
    CHECK (media_download_status IS NULL OR media_download_status IN ('pending','success','failed'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS media_download_error text,
  ADD COLUMN IF NOT EXISTS media_download_attempts int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS media_last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_messages_media_status
  ON public.whatsapp_messages(organization_id, media_download_status)
  WHERE media_download_status IS NOT NULL;
