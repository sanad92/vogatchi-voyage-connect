
ALTER TABLE public.whatsapp_broadcast_recipients
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_details jsonb;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_provider_msg
  ON public.whatsapp_broadcast_recipients (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_broadcast_recipients REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_broadcast_recipients'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcast_recipients';
  END IF;
END $$;
