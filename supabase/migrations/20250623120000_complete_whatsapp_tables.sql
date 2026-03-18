
-- Complete WhatsApp Business tables migration

-- WhatsApp Settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  webhook_url TEXT,
  business_description TEXT,
  business_website TEXT,
  business_email TEXT,
  api_version TEXT DEFAULT 'v18.0',
  rate_limit_per_minute INTEGER DEFAULT 80,
  auto_assignment_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Conversations table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  assigned_to UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed', 'transferred')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  auto_assigned BOOLEAN DEFAULT false,
  assignment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template')),
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  template_name TEXT,
  template_language TEXT,
  template_parameters JSONB,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  error_code TEXT,
  error_message TEXT,
  sent_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication')),
  language TEXT NOT NULL DEFAULT 'ar',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  header_type TEXT CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  variables JSONB,
  template_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Quick Replies table
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_global BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Sessions table
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  active_conversations_count INTEGER DEFAULT 0,
  max_conversations INTEGER DEFAULT 5,
  last_activity TIMESTAMPTZ DEFAULT now(),
  auto_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned ON public.whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_employee ON public.whatsapp_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allowing authenticated users to access)
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp settings" ON public.whatsapp_settings;
CREATE POLICY "Authenticated users can manage WhatsApp settings" ON public.whatsapp_settings FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp conversations" ON public.whatsapp_conversations;
CREATE POLICY "Authenticated users can manage WhatsApp conversations" ON public.whatsapp_conversations FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp messages" ON public.whatsapp_messages;
CREATE POLICY "Authenticated users can manage WhatsApp messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp templates" ON public.whatsapp_templates;
CREATE POLICY "Authenticated users can manage WhatsApp templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp quick replies" ON public.whatsapp_quick_replies;
CREATE POLICY "Authenticated users can manage WhatsApp quick replies" ON public.whatsapp_quick_replies FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage WhatsApp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Authenticated users can manage WhatsApp sessions" ON public.whatsapp_sessions FOR ALL TO authenticated USING (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_settings_updated_at ON public.whatsapp_settings;
CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_quick_replies_updated_at ON public.whatsapp_quick_replies;
CREATE TRIGGER update_whatsapp_quick_replies_updated_at
  BEFORE UPDATE ON public.whatsapp_quick_replies
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON public.whatsapp_sessions;
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
