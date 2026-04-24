-- Add Meta Embedded Signup columns + unique constraint per organization
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS business_account_id text,
  ADD COLUMN IF NOT EXISTS meta_user_id text,
  ADD COLUMN IF NOT EXISTS connection_method text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS display_phone_number text;

-- One settings row per organization (deduplicate first if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname='public' AND indexname='whatsapp_settings_org_unique'
  ) THEN
    -- Delete duplicates keeping latest
    DELETE FROM public.whatsapp_settings a
    USING public.whatsapp_settings b
    WHERE a.organization_id = b.organization_id
      AND a.organization_id IS NOT NULL
      AND a.created_at < b.created_at;
    
    CREATE UNIQUE INDEX whatsapp_settings_org_unique 
      ON public.whatsapp_settings(organization_id) 
      WHERE organization_id IS NOT NULL;
  END IF;
END $$;

-- Lookup index for webhook routing by phone_number_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_phone_id 
  ON public.whatsapp_settings(phone_number_id) 
  WHERE phone_number_id IS NOT NULL;