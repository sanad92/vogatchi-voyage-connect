
-- إنشاء جدول whatsapp_quick_replies المفقود
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

-- تحديث جدول whatsapp_settings لإضافة الحقول المفقودة
ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v18.0',
ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS auto_assignment_enabled BOOLEAN DEFAULT true;

-- إنشاء جدول whatsapp_conversations إذا لم يكن موجوداً
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

-- إنشاء جدول whatsapp_messages إذا لم يكن موجوداً
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

-- إنشاء جدول whatsapp_sessions إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  active_conversations_count INTEGER DEFAULT 0,
  max_conversations INTEGER DEFAULT 5,
  last_activity TIMESTAMPTZ DEFAULT now(),
  auto_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- تفعيل RLS على الجداول
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can view quick replies" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Users can manage global quick replies" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Users can view conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can manage conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Employees can manage their sessions" ON public.whatsapp_sessions;

-- إنشاء سياسات أمنية جديدة
CREATE POLICY "Users can view quick replies" ON public.whatsapp_quick_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can manage global quick replies" ON public.whatsapp_quick_replies
  FOR ALL USING (
    is_global = true OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can view conversations" ON public.whatsapp_conversations
  FOR SELECT USING (true);

CREATE POLICY "Users can manage conversations" ON public.whatsapp_conversations
  FOR ALL USING (
    assigned_to = (SELECT employee_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can view messages" ON public.whatsapp_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can send messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (sent_by = auth.uid());

CREATE POLICY "Employees can manage their sessions" ON public.whatsapp_sessions
  FOR ALL USING (
    employee_id = (SELECT employee_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_whatsapp_quick_replies_category ON public.whatsapp_quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_quick_replies_global ON public.whatsapp_quick_replies(is_global);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned ON public.whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_employee ON public.whatsapp_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON public.whatsapp_sessions(status);

-- إنشاء triggers للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_quick_replies_updated_at ON public.whatsapp_quick_replies;
DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON public.whatsapp_sessions;

CREATE TRIGGER update_whatsapp_quick_replies_updated_at
  BEFORE UPDATE ON public.whatsapp_quick_replies
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
