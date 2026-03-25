
-- إضافة الجداول المفقودة لنظام WhatsApp

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

-- إضافة الحقول المفقودة لجدول whatsapp_templates
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- إنشاء جدول whatsapp_quick_replies
CREATE TABLE IF NOT EXISTS public.whatsapp_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_global BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول whatsapp_conversations إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  assigned_to UUID REFERENCES public.employees(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'transferred')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_assigned BOOLEAN DEFAULT false,
  assignment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول whatsapp_messages إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
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
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول whatsapp_sessions للموظفين
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  active_conversations_count INTEGER DEFAULT 0,
  max_conversations INTEGER DEFAULT 5,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات أمنية
CREATE POLICY IF NOT EXISTS "Users can view quick replies" ON public.whatsapp_quick_replies
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage global quick replies" ON public.whatsapp_quick_replies
  FOR ALL USING (
    is_global = true OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view conversations" ON public.whatsapp_conversations
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage assigned conversations" ON public.whatsapp_conversations
  FOR ALL USING (
    assigned_to = (SELECT employee_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view messages" ON public.whatsapp_messages
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can send messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (sent_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Employees can manage their sessions" ON public.whatsapp_sessions
  FOR ALL USING (
    employee_id = (SELECT employee_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_to ON public.whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON public.whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_employee_id ON public.whatsapp_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_quick_replies_created_by ON public.whatsapp_quick_replies(created_by);

-- دالة للتوزيع التلقائي
CREATE OR REPLACE FUNCTION auto_assign_conversation(p_phone_number TEXT, p_message_content TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  assigned_employee UUID;
  customer_record RECORD;
BEGIN
  -- البحث عن محادثة موجودة
  SELECT id INTO conversation_id 
  FROM public.whatsapp_conversations 
  WHERE phone_number = p_phone_number AND status = 'active';
  
  -- إذا وجدت محادثة، إرجاع ID
  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;
  
  -- البحث عن العميل بناءً على رقم الهاتف
  SELECT * INTO customer_record 
  FROM public.customers 
  WHERE phone = p_phone_number;
  
  -- اختيار موظف متاح (مبسط)
  SELECT employee_id INTO assigned_employee
  FROM public.whatsapp_sessions
  WHERE status IN ('available', 'busy')
    AND auto_assignment_enabled = true
    AND active_conversations_count < max_conversations
  ORDER BY active_conversations_count ASC, last_activity ASC
  LIMIT 1;
  
  -- إنشاء محادثة جديدة
  INSERT INTO public.whatsapp_conversations (
    phone_number, 
    customer_id, 
    assigned_to, 
    auto_assigned,
    assignment_reason
  ) VALUES (
    p_phone_number,
    customer_record.id,
    assigned_employee,
    assigned_employee IS NOT NULL,
    CASE WHEN assigned_employee IS NOT NULL THEN 'auto_assigned' ELSE 'no_available_agent' END
  ) RETURNING id INTO conversation_id;
  
  -- تحديث عدد المحادثات النشطة للموظف
  IF assigned_employee IS NOT NULL THEN
    UPDATE public.whatsapp_sessions 
    SET active_conversations_count = active_conversations_count + 1,
        last_activity = now()
    WHERE employee_id = assigned_employee;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث حالة الرسالة
CREATE OR REPLACE FUNCTION update_message_status(p_message_id TEXT, p_status TEXT, p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now())
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.whatsapp_messages 
  SET 
    status = p_status,
    delivered_at = CASE WHEN p_status = 'delivered' THEN p_timestamp ELSE delivered_at END,
    read_at = CASE WHEN p_status = 'read' THEN p_timestamp ELSE read_at END
  WHERE message_id = p_message_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
