
-- إنشاء فئات المصروفات
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#blue-500',
  budget_limit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول الموظفين
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary_scale_level INTEGER DEFAULT 1,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bank_account_number TEXT,
  bank_name TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء سلم الرواتب
CREATE TABLE IF NOT EXISTS public.salary_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position TEXT NOT NULL,
  level INTEGER NOT NULL,
  min_salary NUMERIC NOT NULL,
  max_salary NUMERIC NOT NULL,
  annual_increment NUMERIC DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(position, level)
);

-- إنشاء عقود الإيجارات
CREATE TABLE IF NOT EXISTS public.rent_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  property_type TEXT NOT NULL, -- office, warehouse, shop
  property_address TEXT NOT NULL,
  landlord_name TEXT NOT NULL,
  landlord_phone TEXT,
  monthly_rent NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_period_months INTEGER DEFAULT 12,
  annual_increase_percentage NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  contract_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء الرواتب الشهرية
CREATE TABLE IF NOT EXISTS public.monthly_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_month DATE NOT NULL, -- أول يوم في الشهر
  base_salary NUMERIC NOT NULL,
  allowances NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  overtime_rate NUMERIC DEFAULT 0,
  overtime_amount NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  gross_salary NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  insurance_deduction NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  payment_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  status TEXT DEFAULT 'pending', -- pending, paid, cancelled
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, salary_month)
);

-- إنشاء دفعات الإيجارات
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.rent_contracts(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL, -- أول يوم في الشهر
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
  late_fee NUMERIC DEFAULT 0,
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id, payment_month)
);

-- إنشاء معاملات المصروفات العامة
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL DEFAULT ('EXP-' || EXTRACT(year FROM now()) || '-' || LPAD(nextval('booking_sequence')::TEXT, 6, '0')),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash', -- cash, bank_transfer, credit_card, check
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  vendor_name TEXT,
  vendor_phone TEXT,
  invoice_number TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, paid, rejected
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء تخصيصات الميزانية
CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  budget_year INTEGER NOT NULL,
  budget_month INTEGER, -- NULL للميزانية السنوية، رقم الشهر للميزانية الشهرية
  allocated_amount NUMERIC NOT NULL,
  spent_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, budget_year, budget_month)
);

-- إدراج فئات المصروفات الأساسية
-- INSERT INTO public.expense_categories (name, name_ar, description, color) VALUES
-- ('Salaries', 'المرتبات', 'رواتب الموظفين والمكافآت', '#green-600'),
-- ('Rent', 'الإيجارات', 'إيجار المكاتب والمستودعات', '#blue-600'),
-- ('Utilities', 'المرافق', 'كهرباء، مياه، إنترنت، هاتف', '#yellow-600'),
-- ('Office Supplies', 'اللوازم المكتبية', 'قرطاسية، أدوات مكتبية', '#purple-600'),
-- ('Marketing', 'التسويق', 'إعلانات، مواد تسويقية', '#pink-600'),
-- ('Transportation', 'المواصلات', 'وقود، صيانة المركبات', '#orange-600'),
-- ('Maintenance', 'الصيانة', 'صيانة المعدات والمكاتب', '#red-600'),
-- ('Insurance', 'التأمين', 'تأمين المكاتب والموظفين', '#indigo-600'),
-- ('Professional Services', 'الخدمات المهنية', 'محاسب، محامي، استشارات', '#gray-600'),
-- ('Training', 'التدريب', 'دورات تدريبية للموظفين', '#teal-600');

-- إنشاء triggers للتحديث التلقائي
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق triggers على جميع الجداول
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_scales_updated_at BEFORE UPDATE ON public.salary_scales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_contracts_updated_at BEFORE UPDATE ON public.rent_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monthly_salaries_updated_at BEFORE UPDATE ON public.monthly_salaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_transactions_updated_at BEFORE UPDATE ON public.expense_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_allocations_updated_at BEFORE UPDATE ON public.budget_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء trigger لحساب الراتب الصافي تلقائياً
CREATE OR REPLACE FUNCTION public.calculate_net_salary()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب مبلغ الساعات الإضافية
  NEW.overtime_amount = NEW.overtime_hours * NEW.overtime_rate;
  
  -- حساب الراتب الإجمالي
  NEW.gross_salary = NEW.base_salary + NEW.allowances + NEW.overtime_amount + NEW.bonus;
  
  -- حساب الراتب الصافي
  NEW.net_salary = NEW.gross_salary - NEW.deductions - NEW.tax_amount - NEW.insurance_deduction;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_salary_before_insert_update 
  BEFORE INSERT OR UPDATE ON public.monthly_salaries 
  FOR EACH ROW EXECUTE FUNCTION public.calculate_net_salary();

-- إنشاء trigger لتحديث المبلغ المتبقي في الميزانية
CREATE OR REPLACE FUNCTION public.update_budget_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount = NEW.allocated_amount - NEW.spent_amount;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budget_remaining_trigger 
  BEFORE INSERT OR UPDATE ON public.budget_allocations 
  FOR EACH ROW EXECUTE FUNCTION public.update_budget_remaining();

-- تمكين Row Level Security
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان الأساسية (يمكن للمدراء والسوبر أدمن الوصول لجميع البيانات)
CREATE POLICY "Managers can access all expense data" ON public.expense_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access all employee data" ON public.employees FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access salary scales" ON public.salary_scales FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access rent contracts" ON public.rent_contracts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access salary data" ON public.monthly_salaries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access rent payments" ON public.rent_payments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access expense transactions" ON public.expense_transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);

CREATE POLICY "Managers can access budget allocations" ON public.budget_allocations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'accountant')
  )
);
