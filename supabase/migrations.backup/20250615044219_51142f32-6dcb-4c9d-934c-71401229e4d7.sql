
-- إضافة إعدادات نظام متقدمة وتحسين إدارة الصلاحيات

-- إضافة إعدادات النظام المتقدمة
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
  category TEXT NOT NULL DEFAULT 'general', -- general, security, performance, ui, backup, api
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- هل يمكن للمستخدمين العاديين رؤيتها
  validation_rule TEXT, -- قواعد التحقق (regex أو json schema)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الإعدادات الأساسية
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
-- إعدادات الشركة
('company_name', 'شركة فوكا تشي للسياحة', 'string', 'company', 'اسم الشركة', true),
('company_address', 'الرياض، المملكة العربية السعودية', 'string', 'company', 'عنوان الشركة', true),
('company_phone', '+966-XX-XXX-XXXX', 'string', 'company', 'هاتف الشركة', true),
('company_email', 'info@vogatchitrips.com', 'string', 'company', 'بريد الشركة الإلكتروني', true),
('company_website', 'https://vogatchitrips.com', 'string', 'company', 'موقع الشركة الإلكتروني', true),
('company_logo_url', '', 'string', 'company', 'رابط شعار الشركة', true),

-- الإعدادات المالية
('default_currency', 'SAR', 'string', 'financial', 'العملة الافتراضية', false),
('vat_rate', '15', 'number', 'financial', 'معدل ضريبة القيمة المضافة (%)', false),
('profit_margin_minimum', '10', 'number', 'financial', 'هامش الربح الأدنى (%)', false),
('auto_calculate_profit', 'true', 'boolean', 'financial', 'حساب الربح تلقائياً', false),

-- إعدادات الأمان
('session_timeout_minutes', '480', 'number', 'security', 'انتهاء الجلسة (بالدقائق)', false),
('max_login_attempts', '5', 'number', 'security', 'عدد محاولات تسجيل الدخول القصوى', false),
('password_min_length', '8', 'number', 'security', 'الحد الأدنى لطول كلمة المرور', false),
('require_password_complexity', 'true', 'boolean', 'security', 'طلب تعقيد كلمة المرور', false),
('enable_two_factor_auth', 'false', 'boolean', 'security', 'تفعيل المصادقة الثنائية', false),
('allowed_ip_ranges', '[]', 'json', 'security', 'نطاقات IP المسموحة', false),

-- إعدادات الأداء
('cache_duration_minutes', '60', 'number', 'performance', 'مدة التخزين المؤقت (بالدقائق)', false),
('max_api_requests_per_hour', '1000', 'number', 'performance', 'الحد الأقصى لطلبات API في الساعة', false),
('enable_database_optimization', 'true', 'boolean', 'performance', 'تفعيل تحسين قاعدة البيانات', false),
('auto_cleanup_logs_days', '30', 'number', 'performance', 'تنظيف السجلات تلقائياً (بالأيام)', false),

-- إعدادات واجهة المستخدم
('default_theme', 'light', 'string', 'ui', 'المظهر الافتراضي', true),
('default_language', 'ar', 'string', 'ui', 'اللغة الافتراضية', true),
('enable_dark_mode', 'true', 'boolean', 'ui', 'تفعيل الوضع المظلم', true),
('items_per_page', '20', 'number', 'ui', 'عدد العناصر في الصفحة', false),
('enable_notifications', 'true', 'boolean', 'ui', 'تفعيل الإشعارات', true),

-- إعدادات النسخ الاحتياطي
('auto_backup_enabled', 'true', 'boolean', 'backup', 'تفعيل النسخ الاحتياطي التلقائي', false),
('backup_frequency_hours', '24', 'number', 'backup', 'تكرار النسخ الاحتياطي (بالساعات)', false),
('backup_retention_days', '30', 'number', 'backup', 'مدة الاحتفاظ بالنسخ الاحتياطية (بالأيام)', false),
('backup_compression_enabled', 'true', 'boolean', 'backup', 'تفعيل ضغط النسخ الاحتياطية', false),

-- إعدادات الحجوزات
('booking_confirmation_auto_send', 'true', 'boolean', 'booking', 'إرسال تأكيد الحجز تلقائياً', false),
('payment_reminder_days', '3', 'number', 'booking', 'تذكير الدفع (بالأيام)', false),
('auto_generate_invoices', 'true', 'boolean', 'booking', 'إنشاء الفواتير تلقائياً', false),

-- إعدادات الأتمتة
('auto_follow_up_enabled', 'true', 'boolean', 'automation', 'تفعيل المتابعة التلقائية', false),
('satisfaction_survey_auto_send', 'true', 'boolean', 'automation', 'إرسال استطلاع الرضا تلقائياً', false),
('loyalty_points_auto_calculate', 'true', 'boolean', 'automation', 'حساب نقاط الولاء تلقائياً', false)

ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- إنشاء مجموعات الصلاحيات
CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#blue-500',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج مجموعات الصلاحيات الأساسية
INSERT INTO public.permission_groups (name, name_ar, description, color) VALUES
('financial_management', 'الإدارة المالية', 'صلاحيات إدارة الأموال والفواتير والمدفوعات', '#green-600'),
('booking_management', 'إدارة الحجوزات', 'صلاحيات إدارة جميع أنواع الحجوزات', '#blue-600'),
('customer_service', 'خدمة العملاء', 'صلاحيات التعامل مع العملاء والدعم', '#purple-600'),
('system_administration', 'إدارة النظام', 'صلاحيات إدارة النظام والإعدادات', '#red-600'),
('reporting_analytics', 'التقارير والتحليلات', 'صلاحيات عرض التقارير والإحصائيات', '#orange-600'),
('user_management', 'إدارة المستخدمين', 'صلاحيات إدارة المستخدمين والأدوار', '#indigo-600')
ON CONFLICT DO NOTHING;

-- إنشاء جدول الصلاحيات التفصيلية
CREATE TABLE IF NOT EXISTS public.detailed_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_key TEXT UNIQUE NOT NULL,
  permission_name TEXT NOT NULL,
  permission_name_ar TEXT NOT NULL,
  description TEXT,
  group_id UUID REFERENCES public.permission_groups(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إدراج الصلاحيات التفصيلية
INSERT INTO public.detailed_permissions (permission_key, permission_name, permission_name_ar, description, group_id) VALUES
-- الإدارة المالية
('view_financial_reports', 'View Financial Reports', 'عرض التقارير المالية', 'إمكانية عرض جميع التقارير المالية', (SELECT id FROM permission_groups WHERE name = 'financial_management')),
('manage_invoices', 'Manage Invoices', 'إدارة الفواتير', 'إنشاء وتعديل وحذف الفواتير', (SELECT id FROM permission_groups WHERE name = 'financial_management')),
('manage_payments', 'Manage Payments', 'إدارة المدفوعات', 'إدارة جميع المدفوعات والتحويلات', (SELECT id FROM permission_groups WHERE name = 'financial_management')),
('manage_exchange_rates', 'Manage Exchange Rates', 'إدارة أسعار الصرف', 'تحديث وإدارة أسعار صرف العملات', (SELECT id FROM permission_groups WHERE name = 'financial_management')),

-- إدارة الحجوزات
('create_hotel_bookings', 'Create Hotel Bookings', 'إنشاء حجوزات الفنادق', 'إنشاء حجوزات فندقية جديدة', (SELECT id FROM permission_groups WHERE name = 'booking_management')),
('edit_hotel_bookings', 'Edit Hotel Bookings', 'تعديل حجوزات الفنادق', 'تعديل الحجوزات الفندقية الموجودة', (SELECT id FROM permission_groups WHERE name = 'booking_management')),
('create_flight_bookings', 'Create Flight Bookings', 'إنشاء حجوزات الطيران', 'إنشاء حجوزات طيران جديدة', (SELECT id FROM permission_groups WHERE name = 'booking_management')),
('edit_flight_bookings', 'Edit Flight Bookings', 'تعديل حجوزات الطيران', 'تعديل حجوزات الطيران الموجودة', (SELECT id FROM permission_groups WHERE name = 'booking_management')),
('cancel_bookings', 'Cancel Bookings', 'إلغاء الحجوزات', 'إلغاء أي نوع من الحجوزات', (SELECT id FROM permission_groups WHERE name = 'booking_management')),

-- خدمة العملاء
('manage_customers', 'Manage Customers', 'إدارة العملاء', 'إضافة وتعديل بيانات العملاء', (SELECT id FROM permission_groups WHERE name = 'customer_service')),
('view_customer_history', 'View Customer History', 'عرض تاريخ العملاء', 'عرض تاريخ تعاملات العملاء', (SELECT id FROM permission_groups WHERE name = 'customer_service')),
('manage_follow_ups', 'Manage Follow-ups', 'إدارة المتابعات', 'إدارة متابعات العملاء', (SELECT id FROM permission_groups WHERE name = 'customer_service')),
('handle_complaints', 'Handle Complaints', 'معالجة الشكاوى', 'التعامل مع شكاوى العملاء', (SELECT id FROM permission_groups WHERE name = 'customer_service')),

-- إدارة النظام
('manage_system_settings', 'Manage System Settings', 'إدارة إعدادات النظام', 'تعديل جميع إعدادات النظام', (SELECT id FROM permission_groups WHERE name = 'system_administration')),
('view_audit_logs', 'View Audit Logs', 'عرض سجلات التدقيق', 'عرض جميع سجلات العمليات', (SELECT id FROM permission_groups WHERE name = 'system_administration')),
('manage_backups', 'Manage Backups', 'إدارة النسخ الاحتياطية', 'إنشاء واستعادة النسخ الاحتياطية', (SELECT id FROM permission_groups WHERE name = 'system_administration')),

-- التقارير والتحليلات
('view_all_reports', 'View All Reports', 'عرض جميع التقارير', 'الوصول لجميع أنواع التقارير', (SELECT id FROM permission_groups WHERE name = 'reporting_analytics')),
('export_data', 'Export Data', 'تصدير البيانات', 'تصدير البيانات بصيغ مختلفة', (SELECT id FROM permission_groups WHERE name = 'reporting_analytics')),

-- إدارة المستخدمين
('create_users', 'Create Users', 'إنشاء مستخدمين', 'إنشاء حسابات مستخدمين جديدة', (SELECT id FROM permission_groups WHERE name = 'user_management')),
('edit_users', 'Edit Users', 'تعديل المستخدمين', 'تعديل بيانات المستخدمين', (SELECT id FROM permission_groups WHERE name = 'user_management')),
('manage_user_roles', 'Manage User Roles', 'إدارة أدوار المستخدمين', 'تعديل صلاحيات وأدوار المستخدمين', (SELECT id FROM permission_groups WHERE name = 'user_management')),
('impersonate_users', 'Impersonate Users', 'تسجيل دخول كمستخدم', 'تسجيل الدخول باسم مستخدمين آخرين', (SELECT id FROM permission_groups WHERE name = 'user_management'))

ON CONFLICT (permission_key) DO NOTHING;

-- إنشاء جدول ربط الأدوار بالصلاحيات التفصيلية
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.detailed_permissions(permission_key),
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_name, permission_key)
);

-- تعيين الصلاحيات للأدوار الحالية
INSERT INTO public.role_permissions (role_name, permission_key, granted) VALUES
-- السوبر أدمن - جميع الصلاحيات
('super_admin', 'view_financial_reports', true),
('super_admin', 'manage_invoices', true),
('super_admin', 'manage_payments', true),
('super_admin', 'manage_exchange_rates', true),
('super_admin', 'create_hotel_bookings', true),
('super_admin', 'edit_hotel_bookings', true),
('super_admin', 'create_flight_bookings', true),
('super_admin', 'edit_flight_bookings', true),
('super_admin', 'cancel_bookings', true),
('super_admin', 'manage_customers', true),
('super_admin', 'view_customer_history', true),
('super_admin', 'manage_follow_ups', true),
('super_admin', 'handle_complaints', true),
('super_admin', 'manage_system_settings', true),
('super_admin', 'view_audit_logs', true),
('super_admin', 'manage_backups', true),
('super_admin', 'view_all_reports', true),
('super_admin', 'export_data', true),
('super_admin', 'create_users', true),
('super_admin', 'edit_users', true),
('super_admin', 'manage_user_roles', true),
('super_admin', 'impersonate_users', true),

-- الأدمن - معظم الصلاحيات
('admin', 'view_financial_reports', true),
('admin', 'manage_invoices', true),
('admin', 'manage_payments', true),
('admin', 'create_hotel_bookings', true),
('admin', 'edit_hotel_bookings', true),
('admin', 'create_flight_bookings', true),
('admin', 'edit_flight_bookings', true),
('admin', 'cancel_bookings', true),
('admin', 'manage_customers', true),
('admin', 'view_customer_history', true),
('admin', 'manage_follow_ups', true),
('admin', 'handle_complaints', true),
('admin', 'view_all_reports', true),
('admin', 'export_data', true),
('admin', 'create_users', true),
('admin', 'edit_users', true),

-- المدير
('manager', 'view_financial_reports', true),
('manager', 'manage_invoices', true),
('manager', 'create_hotel_bookings', true),
('manager', 'edit_hotel_bookings', true),
('manager', 'create_flight_bookings', true),
('manager', 'edit_flight_bookings', true),
('manager', 'manage_customers', true),
('manager', 'view_customer_history', true),
('manager', 'manage_follow_ups', true),
('manager', 'view_all_reports', true),

-- موظف المبيعات
('sales_agent', 'create_hotel_bookings', true),
('sales_agent', 'edit_hotel_bookings', true),
('sales_agent', 'create_flight_bookings', true),
('sales_agent', 'edit_flight_bookings', true),
('sales_agent', 'manage_customers', true),
('sales_agent', 'view_customer_history', true),

-- المحاسب
('accountant', 'view_financial_reports', true),
('accountant', 'manage_invoices', true),
('accountant', 'manage_payments', true),
('accountant', 'manage_exchange_rates', true),

-- المشاهد
('viewer', 'view_customer_history', true)

ON CONFLICT (role_name, permission_key) DO NOTHING;

-- إنشاء دالة للتحقق من الصلاحيات
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_permission_key TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_roles TEXT[];
  has_permission BOOLEAN := false;
BEGIN
  -- الحصول على أدوار المستخدم
  SELECT ARRAY_AGG(role) INTO user_roles
  FROM public.user_roles 
  WHERE user_id = p_user_id;
  
  -- إذا لم يكن للمستخدم أدوار
  IF user_roles IS NULL THEN
    RETURN false;
  END IF;
  
  -- التحقق من وجود الصلاحية
  SELECT EXISTS(
    SELECT 1 
    FROM public.role_permissions rp
    WHERE rp.role_name = ANY(user_roles)
    AND rp.permission_key = p_permission_key
    AND rp.granted = true
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- إنشاء دالة لتحديث إعداد النظام
CREATE OR REPLACE FUNCTION public.update_system_setting(
  setting_key_param TEXT,
  setting_value_param TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.system_settings 
  SET setting_value = setting_value_param,
      updated_at = now()
  WHERE setting_key = setting_key_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Setting key % not found', setting_key_param;
  END IF;
END;
$$;

-- إنشاء دالة للحصول على قيمة إعداد النظام
CREATE OR REPLACE FUNCTION public.get_system_setting(
  setting_key_param TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT s.setting_value INTO setting_value
  FROM public.system_settings s
  WHERE s.setting_key = setting_key_param
  AND s.is_public = true;
  
  RETURN setting_value;
END;
$$;

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Enable all access for system_settings" ON public.system_settings FOR ALL USING (true);
CREATE POLICY "Enable all access for permission_groups" ON public.permission_groups FOR ALL USING (true);
CREATE POLICY "Enable all access for detailed_permissions" ON public.detailed_permissions FOR ALL USING (true);
CREATE POLICY "Enable all access for role_permissions" ON public.role_permissions FOR ALL USING (true);

-- إنشاء triggers لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_permission_groups_updated_at 
    BEFORE UPDATE ON public.permission_groups 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
