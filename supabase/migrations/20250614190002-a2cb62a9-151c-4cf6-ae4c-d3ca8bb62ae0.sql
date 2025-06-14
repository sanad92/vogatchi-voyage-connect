
-- إنشاء جدول إعدادات النظام العامة
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT NOT NULL DEFAULT 'text', -- text, number, boolean, json
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false, -- true = يمكن للجميع رؤيتها، false = السوبر أدمن فقط
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- إنشاء جدول طلبات إنشاء المستخدمين الجدد (موجود مسبقاً لكن نضيف تحسينات)
-- تحديث جدول user_creation_requests ليكون أكثر شمولية
ALTER TABLE public.user_creation_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS temporary_password TEXT,
ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;

-- إنشاء جدول سجل العمليات للسوبر أدمن
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL, -- user_created, user_activated, user_deactivated, settings_changed, etc.
  target_table TEXT,
  target_id UUID,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الأدوار المخصصة (لتوسيع نظام الأدوار)
CREATE TABLE public.custom_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  permission_key TEXT NOT NULL, -- مثل 'can_view_customers', 'can_edit_bookings'
  permission_value BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_key)
);

-- إدراج الإعدادات الافتراضية للنظام
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('company_name', 'Vogatchi Travel', 'text', 'company', 'اسم الشركة', true),
('company_phone', '+20 100 123 4567', 'text', 'company', 'هاتف الشركة', true),
('company_email', 'info@vogatchi.com', 'text', 'company', 'إيميل الشركة', true),
('company_address', 'القاهرة، مصر', 'text', 'company', 'عنوان الشركة', true),
('default_currency', 'EGP', 'text', 'financial', 'العملة الافتراضية', true),
('vat_rate', '14', 'number', 'financial', 'نسبة ضريبة القيمة المضافة', false),
('booking_prefix', 'VTB', 'text', 'booking', 'بادئة رقم الحجز', false),
('invoice_prefix', 'INV', 'text', 'financial', 'بادئة رقم الفاتورة', false),
('auto_follow_up', 'true', 'boolean', 'automation', 'تفعيل المتابعة التلقائية', false),
('notification_email', 'admin@vogatchi.com', 'text', 'notifications', 'إيميل الإشعارات', false),
('system_timezone', 'Africa/Cairo', 'text', 'general', 'المنطقة الزمنية للنظام', false),
('max_login_attempts', '5', 'number', 'security', 'عدد محاولات تسجيل الدخول القصوى', false),
('session_timeout', '24', 'number', 'security', 'انتهاء صلاحية الجلسة (ساعات)', false);

-- إدراج الصلاحيات الافتراضية للأدوار
INSERT INTO public.custom_permissions (role_name, permission_key, permission_value) VALUES
-- صلاحيات السوبر أدمن
('super_admin', 'can_manage_users', true),
('super_admin', 'can_manage_settings', true),
('super_admin', 'can_view_audit_logs', true),
('super_admin', 'can_manage_roles', true),
('super_admin', 'can_access_all_data', true),

-- صلاحيات الأدمن
('admin', 'can_manage_users', true),
('admin', 'can_view_reports', true),
('admin', 'can_manage_customers', true),
('admin', 'can_manage_bookings', true),
('admin', 'can_manage_suppliers', true),

-- صلاحيات المدير
('manager', 'can_view_reports', true),
('manager', 'can_manage_customers', true),
('manager', 'can_manage_bookings', true),
('manager', 'can_approve_invoices', true),

-- صلاحيات مندوب المبيعات
('sales_agent', 'can_manage_customers', true),
('sales_agent', 'can_create_bookings', true),
('sales_agent', 'can_view_own_data', true),

-- صلاحيات المحاسب
('accountant', 'can_manage_invoices', true),
('accountant', 'can_manage_payments', true),
('accountant', 'can_view_financial_reports', true),

-- صلاحيات المشاهد
('viewer', 'can_view_customers', true),
('viewer', 'can_view_bookings', true);

-- تفعيل Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للإعدادات
CREATE POLICY "Super admins can manage all settings" 
  ON public.system_settings 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view public settings" 
  ON public.system_settings 
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- سياسات الأمان لسجل العمليات
CREATE POLICY "Super admins can view audit logs" 
  ON public.admin_audit_log 
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- سياسات الأمان للصلاحيات المخصصة
CREATE POLICY "Super admins can manage permissions" 
  ON public.custom_permissions 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- دالة لتسجيل العمليات في سجل المراجعة
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_target_table TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_id,
    action_type,
    target_table,
    target_id,
    old_values,
    new_values,
    description
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_table,
    p_target_id,
    p_old_values,
    p_new_values,
    p_description
  );
END;
$$;

-- دالة للحصول على إعداد النظام
CREATE OR REPLACE FUNCTION public.get_system_setting(setting_key_param TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT setting_value 
  FROM public.system_settings 
  WHERE setting_key = setting_key_param
  LIMIT 1;
$$;

-- دالة لتحديث إعداد النظام
CREATE OR REPLACE FUNCTION public.update_system_setting(
  setting_key_param TEXT,
  setting_value_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_value TEXT;
BEGIN
  -- التحقق من أن المستخدم سوبر أدمن
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'غير مسموح: السوبر أدمن فقط يمكنه تحديث الإعدادات';
  END IF;

  -- الحصول على القيمة القديمة
  SELECT setting_value INTO old_value
  FROM public.system_settings
  WHERE setting_key = setting_key_param;

  -- تحديث الإعداد
  UPDATE public.system_settings
  SET setting_value = setting_value_param,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE setting_key = setting_key_param;

  -- تسجيل العملية
  PERFORM public.log_admin_action(
    'setting_updated',
    'system_settings',
    NULL,
    jsonb_build_object('old_value', old_value),
    jsonb_build_object('new_value', setting_value_param),
    'تحديث إعداد النظام: ' || setting_key_param
  );
END;
$$;
