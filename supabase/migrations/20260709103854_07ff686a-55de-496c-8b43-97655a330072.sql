-- Replace partial unique index with a full unique constraint so
-- upsert(onConflict: 'organization_id,message_id') works from the webhook.

-- 1) Fill any NULL message_id with a synthetic value to satisfy uniqueness
UPDATE public.whatsapp_messages
SET message_id = 'local-' || id::text
WHERE message_id IS NULL;

-- 2) Drop the old partial index if present
DROP INDEX IF EXISTS public.whatsapp_messages_org_msg_uniq;
DROP INDEX IF EXISTS public.uq_whatsapp_messages_org_message_id;

-- 3) Add a full unique constraint (usable by ON CONFLICT)
ALTER TABLE public.whatsapp_messages
  ALTER COLUMN message_id SET NOT NULL;

ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_org_message_id_key;

ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_org_message_id_key
  UNIQUE (organization_id, message_id);