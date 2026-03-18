
-- إنشاء جدول معلومات الموظفين
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء enum للأدوار
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'sales_agent', 'accountant', 'viewer');

-- إنشاء جدول الأدوار
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- تفعيل Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- إنشاء function للتحقق من الأدوار (لتجنب الـ infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$;

-- إنشاء function للتحقق من صلاحية معينة
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = $2
  );
$$;

-- سياسات أمان للـ profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- سياسات أمان للـ user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- تحديث سياسات الأمان للجداول الموجودة لتعمل مع نظام الأدوار

-- إزالة السياسات المؤقتة القديمة
DROP POLICY IF EXISTS "Enable all access for now" ON public.customers;
DROP POLICY IF EXISTS "Enable all access for now" ON public.suppliers;
DROP POLICY IF EXISTS "Enable all access for now" ON public.services;
DROP POLICY IF EXISTS "Enable all access for now" ON public.bookings;
DROP POLICY IF EXISTS "Enable all access for now" ON public.invoices;
DROP POLICY IF EXISTS "Enable all access for now" ON public.supplier_payments;
DROP POLICY IF EXISTS "Enable all access for now" ON public.conversations;
DROP POLICY IF EXISTS "Enable all access for now" ON public.messages;

-- سياسات جديدة للعملاء
CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sales and above can manage customers" ON public.customers
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'sales_agent')
  );

-- سياسات للموردين
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage suppliers" ON public.suppliers
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- سياسات للخدمات
CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers and admins can manage services" ON public.services
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- سياسات للحجوزات
CREATE POLICY "Authenticated users can view bookings" ON public.bookings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sales and above can manage bookings" ON public.bookings
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'sales_agent')
  );

-- سياسات للفواتير
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Accountants and above can manage invoices" ON public.invoices
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'accountant')
  );

-- سياسات لمدفوعات الموردين
CREATE POLICY "Authenticated users can view supplier payments" ON public.supplier_payments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Accountants and above can manage payments" ON public.supplier_payments
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'accountant')
  );

-- سياسات للمحادثات
CREATE POLICY "Authenticated users can view conversations" ON public.conversations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sales and above can manage conversations" ON public.conversations
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'sales_agent')
  );

-- سياسات للرسائل
CREATE POLICY "Authenticated users can view messages" ON public.messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sales and above can manage messages" ON public.messages
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'sales_agent')
  );

-- إنشاء trigger لإنشاء profile تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- إعطاء دور viewer افتراضياً للمستخدمين الجدد
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- ربط الـ trigger بجدول المستخدمين
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إدراج بيانات تجريبية (admin user سيحتاج لإنشاءه يدوياً)
-- يمكن للمطور إنشاء حساب admin من خلال واجهة التسجيل ثم تحديث دوره يدوياً
