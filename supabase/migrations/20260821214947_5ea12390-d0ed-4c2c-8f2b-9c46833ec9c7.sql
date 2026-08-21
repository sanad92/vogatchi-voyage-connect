-- Outbound messages are persisted BEFORE Meta responds, so the provider ID is
-- not known yet. Inbound rows still always carry it, and the partial unique
-- index (org, message_id) WHERE message_id IS NOT NULL keeps webhook dedup intact.

-- Drop the redundant UNIQUE constraint (duplicates the partial unique index).
ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_org_message_id_key;

ALTER TABLE public.whatsapp_messages
  ALTER COLUMN message_id DROP NOT NULL;