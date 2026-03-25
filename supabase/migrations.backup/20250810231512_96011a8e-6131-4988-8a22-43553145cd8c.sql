-- تحديث إعدادات الشركة في قاعدة البيانات
UPDATE public.system_settings 
SET setting_value = 'ops@vogatchitrips.com', updated_at = now()
WHERE setting_key = 'company_email';

UPDATE public.system_settings 
SET setting_value = '01103442881', updated_at = now()
WHERE setting_key = 'company_phone';

-- إضافة إعدادات جديدة إن لم تكن موجودة
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_public)
VALUES ('phone_number', '01103442881', 'text', 'company', 'رقم الهاتف الرئيسي', true)
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, updated_at = now();

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_public)
VALUES ('email', 'ops@vogatchitrips.com', 'text', 'company', 'البريد الإلكتروني الرئيسي', true)
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, updated_at = now();