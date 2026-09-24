DROP INDEX IF EXISTS public.whatsapp_conversations_org_phone_uidx;

CREATE UNIQUE INDEX whatsapp_conversations_org_inbox_phone_uidx
  ON public.whatsapp_conversations (organization_id, whatsapp_settings_id, phone_number);

COMMENT ON INDEX public.whatsapp_conversations_org_inbox_phone_uidx IS
  'One conversation per organization, WhatsApp inbox, and customer phone number.';