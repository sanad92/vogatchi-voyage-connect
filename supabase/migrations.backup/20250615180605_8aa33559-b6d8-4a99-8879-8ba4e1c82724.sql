
-- إنشاء جدول detailed_user_permissions مع جميع الصلاحيات المطلوبة
CREATE TABLE IF NOT EXISTS public.detailed_user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- صلاحيات العملاء
  customers_view BOOLEAN NOT NULL DEFAULT false,
  customers_create BOOLEAN NOT NULL DEFAULT false,
  customers_edit BOOLEAN NOT NULL DEFAULT false,
  customers_delete BOOLEAN NOT NULL DEFAULT false,
  customers_export BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات الحجوزات
  bookings_view BOOLEAN NOT NULL DEFAULT false,
  bookings_create BOOLEAN NOT NULL DEFAULT false,
  bookings_edit BOOLEAN NOT NULL DEFAULT false,
  bookings_delete BOOLEAN NOT NULL DEFAULT false,
  bookings_cancel BOOLEAN NOT NULL DEFAULT false,
  bookings_confirm BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات الفواتير
  invoices_view BOOLEAN NOT NULL DEFAULT false,
  invoices_create BOOLEAN NOT NULL DEFAULT false,
  invoices_edit BOOLEAN NOT NULL DEFAULT false,
  invoices_delete BOOLEAN NOT NULL DEFAULT false,
  invoices_send BOOLEAN NOT NULL DEFAULT false,
  invoices_payment BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات الموردين
  suppliers_view BOOLEAN NOT NULL DEFAULT false,
  suppliers_create BOOLEAN NOT NULL DEFAULT false,
  suppliers_edit BOOLEAN NOT NULL DEFAULT false,
  suppliers_delete BOOLEAN NOT NULL DEFAULT false,
  suppliers_contracts BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات التقارير
  reports_financial BOOLEAN NOT NULL DEFAULT false,
  reports_sales BOOLEAN NOT NULL DEFAULT false,
  reports_operational BOOLEAN NOT NULL DEFAULT false,
  reports_export BOOLEAN NOT NULL DEFAULT false,
  reports_advanced BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات الموظفين
  employees_view BOOLEAN NOT NULL DEFAULT false,
  employees_create BOOLEAN NOT NULL DEFAULT false,
  employees_edit BOOLEAN NOT NULL DEFAULT false,
  employees_delete BOOLEAN NOT NULL DEFAULT false,
  employees_salary BOOLEAN NOT NULL DEFAULT false,
  employees_commission BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات المصروفات
  expenses_view BOOLEAN NOT NULL DEFAULT false,
  expenses_create BOOLEAN NOT NULL DEFAULT false,
  expenses_approve BOOLEAN NOT NULL DEFAULT false,
  expenses_reports BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات إدارة النظام
  system_users BOOLEAN NOT NULL DEFAULT false,
  system_settings BOOLEAN NOT NULL DEFAULT false,
  system_backup BOOLEAN NOT NULL DEFAULT false,
  system_audit BOOLEAN NOT NULL DEFAULT false,
  -- صلاحيات الحسابات البنكية
  banking_view BOOLEAN NOT NULL DEFAULT false,
  banking_transactions BOOLEAN NOT NULL DEFAULT false,
  banking_transfer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- تفعيل RLS
ALTER TABLE public.detailed_user_permissions ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للسوبر أدمن فقط
CREATE POLICY "Super admin can manage all permissions" 
  ON public.detailed_user_permissions 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  ) 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_detailed_user_permissions_updated_at
  BEFORE UPDATE ON public.detailed_user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء صلاحيات افتراضية لجميع المستخدمين الموجودين
INSERT INTO public.detailed_user_permissions (
    user_id, 
    customers_view, 
    bookings_view,
    invoices_view,
    suppliers_view
)
SELECT 
    p.id,
    true,
    true, 
    true,
    true
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- إنشاء trigger لإنشاء صلاحيات افتراضية للمستخدمين الجدد
CREATE OR REPLACE FUNCTION public.create_default_detailed_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.detailed_user_permissions (
    user_id, 
    customers_view, 
    bookings_view
  )
  VALUES (
    NEW.id, 
    true, 
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ربط الـ trigger بجدول profiles
DROP TRIGGER IF EXISTS create_default_detailed_permissions_trigger ON public.profiles;
CREATE TRIGGER create_default_detailed_permissions_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_detailed_permissions();
