
-- إنشاء جداول نظام WhatsApp Business Cloud API

-- جدول إعدادات WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  business_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول المحادثات
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  assigned_to UUID REFERENCES employees(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'transferred')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  auto_assigned BOOLEAN DEFAULT false,
  assignment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT, -- WhatsApp message ID
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
  sent_by UUID REFERENCES employees(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول قوالب الرسائل
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  header_type TEXT CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول قواعد التوزيع التلقائي
CREATE TABLE IF NOT EXISTS auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL, -- شروط التوزيع
  assignment_type TEXT DEFAULT 'round_robin' CHECK (assignment_type IN ('round_robin', 'load_balance', 'skill_based', 'specific_agent')),
  target_employees UUID[], -- مجموعة الموظفين المستهدفين
  working_hours_start TIME,
  working_hours_end TIME,
  working_days INTEGER[], -- أيام الأسبوع (0=الأحد، 6=السبت)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول جلسات WhatsApp للموظفين
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'offline')),
  active_conversations_count INTEGER DEFAULT 0,
  max_conversations INTEGER DEFAULT 5,
  last_activity TIMESTAMPTZ DEFAULT now(),
  auto_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول الردود السريعة
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول إحصائيات WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  employee_id UUID REFERENCES employees(id),
  total_conversations INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  average_response_time INTERVAL,
  conversations_closed INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_to ON whatsapp_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_employee_id ON whatsapp_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_date ON whatsapp_analytics(date);

-- إضافة تحديث timestamps تلقائياً
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_conversations_updated_at') THEN
    CREATE TRIGGER update_whatsapp_conversations_updated_at
      BEFORE UPDATE ON whatsapp_conversations
      FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_templates_updated_at') THEN
    CREATE TRIGGER update_whatsapp_templates_updated_at
      BEFORE UPDATE ON whatsapp_templates
      FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_auto_assignment_rules_updated_at') THEN
    CREATE TRIGGER update_auto_assignment_rules_updated_at
      BEFORE UPDATE ON auto_assignment_rules
      FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_sessions_updated_at') THEN
    CREATE TRIGGER update_whatsapp_sessions_updated_at
      BEFORE UPDATE ON whatsapp_sessions
      FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();
  END IF;
END $$;

-- دالة للتوزيع التلقائي للمحادثات
CREATE OR REPLACE FUNCTION auto_assign_conversation(p_phone_number TEXT, p_message_content TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  assigned_employee UUID;
  rule RECORD;
  eligible_employees UUID[];
  employee_workload RECORD;
  customer_record RECORD;
BEGIN
  -- البحث عن محادثة موجودة
  SELECT id INTO conversation_id 
  FROM whatsapp_conversations 
  WHERE phone_number = p_phone_number AND status = 'active';
  
  -- إذا وجدت محادثة، إرجاع ID
  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;
  
  -- البحث عن العميل بناءً على رقم الهاتف
  SELECT * INTO customer_record 
  FROM customers 
  WHERE phone = p_phone_number;
  
  -- تطبيق قواعد التوزيع التلقائي
  FOR rule IN 
    SELECT * FROM auto_assignment_rules 
    WHERE is_active = true 
    ORDER BY priority ASC
  LOOP
    -- فحص شروط القاعدة (ساعات العمل، أيام الأسبوع، إلخ)
    IF (rule.working_hours_start IS NULL OR CURRENT_TIME >= rule.working_hours_start) AND
       (rule.working_hours_end IS NULL OR CURRENT_TIME <= rule.working_hours_end) AND
       (rule.working_days IS NULL OR EXTRACT(dow FROM CURRENT_DATE)::INTEGER = ANY(rule.working_days)) THEN
      
      -- الحصول على الموظفين المؤهلين
      SELECT ARRAY_AGG(employee_id) INTO eligible_employees
      FROM whatsapp_sessions ws
      WHERE ws.employee_id = ANY(rule.target_employees)
        AND ws.status IN ('available', 'busy')
        AND ws.auto_assignment_enabled = true
        AND ws.active_conversations_count < ws.max_conversations;
      
      -- اختيار موظف بناءً على نوع التوزيع
      IF rule.assignment_type = 'load_balance' THEN
        SELECT employee_id INTO assigned_employee
        FROM whatsapp_sessions
        WHERE employee_id = ANY(eligible_employees)
        ORDER BY active_conversations_count ASC, last_activity ASC
        LIMIT 1;
      ELSIF rule.assignment_type = 'round_robin' THEN
        -- تطبيق Round Robin (مبسط)
        SELECT employee_id INTO assigned_employee
        FROM whatsapp_sessions
        WHERE employee_id = ANY(eligible_employees)
        ORDER BY last_activity ASC
        LIMIT 1;
      END IF;
      
      -- إنهاء البحث إذا تم العثور على موظف
      IF assigned_employee IS NOT NULL THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- إنشاء محادثة جديدة
-- INSERT INTO whatsapp_conversations (
--     phone_number, 
--     customer_id, 
--     assigned_to, 
--     auto_assigned,
--     assignment_reason
--   ) VALUES (
--     p_phone_number,
--     customer_record.id,
--     assigned_employee,
--     assigned_employee IS NOT NULL,
--     CASE WHEN assigned_employee IS NOT NULL THEN 'auto_assigned' ELSE 'no_available_agent' END
--   ) RETURNING id INTO conversation_id;
  
  -- تحديث عدد المحادثات النشطة للموظف
  IF assigned_employee IS NOT NULL THEN
    UPDATE whatsapp_sessions 
    SET active_conversations_count = active_conversations_count + 1,
        last_activity = now()
    WHERE employee_id = assigned_employee;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث حالة الرسالة
CREATE OR REPLACE FUNCTION update_message_status(p_message_id TEXT, p_status TEXT, p_timestamp TIMESTAMPTZ DEFAULT now())
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE whatsapp_messages 
  SET 
    status = p_status,
    delivered_at = CASE WHEN p_status = 'delivered' THEN p_timestamp ELSE delivered_at END,
    read_at = CASE WHEN p_status = 'read' THEN p_timestamp ELSE read_at END
  WHERE message_id = p_message_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- إدراج بيانات أولية
-- INSERT INTO whatsapp_settings (phone_number_id, access_token, webhook_verify_token) 
-- VALUES ('YOUR_PHONE_NUMBER_ID', 'YOUR_ACCESS_TOKEN', 'YOUR_VERIFY_TOKEN');
-- INSERT INTO auto_assignment_rules (rule_name, conditions, assignment_type, priority) VALUES
-- ('قاعدة افتراضية', '{"type": "default"}', 'round_robin', 1),
-- ('عملاء VIP', '{"customer_segment": "vip"}', 'specific_agent', 0);
-- INSERT INTO quick_replies (title, content, is_global) VALUES
-- ('ترحيب', 'أهلاً وسهلاً بك في شركة فيزيت تورز! كيف يمكنني مساعدتك اليوم؟', true),
-- ('انتظار', 'شكراً لك، سأتحقق من طلبك وأعود إليك في أقرب وقت ممكن.', true),
-- ('شكر', 'شكراً لتواصلك معنا! نحن سعداء لخدمتك دائماً.', true);
