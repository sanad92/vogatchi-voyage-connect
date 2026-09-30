CREATE INDEX IF NOT EXISTS idx_wa_messages_conv_sent ON public.whatsapp_messages (conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conv_dir_sent ON public.whatsapp_messages (conversation_id, direction, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_org_last_msg ON public.whatsapp_conversations (organization_id, last_message_at DESC);