
-- إنشاء دوال RPC للتعامل مع جداول الصلاحيات الجديدة

-- دالة لجلب مجموعات الصلاحيات
CREATE OR REPLACE FUNCTION public.get_permission_groups()
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_ar TEXT,
  description TEXT,
  color TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT pg.id, pg.name, pg.name_ar, pg.description, pg.color, pg.is_active, pg.created_at
  FROM public.permission_groups pg
  WHERE pg.is_active = true
  ORDER BY pg.name_ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لجلب تفاصيل الصلاحيات
CREATE OR REPLACE FUNCTION public.get_detailed_permissions()
RETURNS TABLE (
  id UUID,
  permission_key TEXT,
  permission_name TEXT,
  permission_name_ar TEXT,
  description TEXT,
  group_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT dp.id, dp.permission_key, dp.permission_name, dp.permission_name_ar, 
         dp.description, dp.group_id, dp.is_active, dp.created_at
  FROM public.detailed_permissions dp
  WHERE dp.is_active = true
  ORDER BY dp.permission_name_ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لجلب جميع صلاحيات المستخدمين
CREATE OR REPLACE FUNCTION public.get_all_user_permissions()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN,
  customers_view BOOLEAN,
  customers_create BOOLEAN,
  customers_edit BOOLEAN,
  customers_delete BOOLEAN,
  customers_export BOOLEAN,
  bookings_view BOOLEAN,
  bookings_create BOOLEAN,
  bookings_edit BOOLEAN,
  bookings_delete BOOLEAN,
  bookings_cancel BOOLEAN,
  bookings_confirm BOOLEAN,
  invoices_view BOOLEAN,
  invoices_create BOOLEAN,
  invoices_edit BOOLEAN,
  invoices_delete BOOLEAN,
  invoices_send BOOLEAN,
  invoices_payment BOOLEAN,
  suppliers_view BOOLEAN,
  suppliers_create BOOLEAN,
  suppliers_edit BOOLEAN,
  suppliers_delete BOOLEAN,
  suppliers_contracts BOOLEAN,
  reports_financial BOOLEAN,
  reports_sales BOOLEAN,
  reports_operational BOOLEAN,
  reports_export BOOLEAN,
  reports_advanced BOOLEAN,
  employees_view BOOLEAN,
  employees_create BOOLEAN,
  employees_edit BOOLEAN,
  employees_delete BOOLEAN,
  employees_salary BOOLEAN,
  employees_commission BOOLEAN,
  expenses_view BOOLEAN,
  expenses_create BOOLEAN,
  expenses_approve BOOLEAN,
  expenses_reports BOOLEAN,
  system_users BOOLEAN,
  system_settings BOOLEAN,
  system_backup BOOLEAN,
  system_audit BOOLEAN,
  banking_view BOOLEAN,
  banking_transactions BOOLEAN,
  banking_transfer BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dup.id, dup.user_id, p.email, p.full_name, p.is_active,
    dup.customers_view, dup.customers_create, dup.customers_edit, dup.customers_delete, dup.customers_export,
    dup.bookings_view, dup.bookings_create, dup.bookings_edit, dup.bookings_delete, dup.bookings_cancel, dup.bookings_confirm,
    dup.invoices_view, dup.invoices_create, dup.invoices_edit, dup.invoices_delete, dup.invoices_send, dup.invoices_payment,
    dup.suppliers_view, dup.suppliers_create, dup.suppliers_edit, dup.suppliers_delete, dup.suppliers_contracts,
    dup.reports_financial, dup.reports_sales, dup.reports_operational, dup.reports_export, dup.reports_advanced,
    dup.employees_view, dup.employees_create, dup.employees_edit, dup.employees_delete, dup.employees_salary, dup.employees_commission,
    dup.expenses_view, dup.expenses_create, dup.expenses_approve, dup.expenses_reports,
    dup.system_users, dup.system_settings, dup.system_backup, dup.system_audit,
    dup.banking_view, dup.banking_transactions, dup.banking_transfer,
    dup.created_at, dup.updated_at
  FROM public.detailed_user_permissions dup
  LEFT JOIN public.profiles p ON dup.user_id = p.id
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لجلب صلاحيات مستخدم محدد
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  customers_view BOOLEAN,
  customers_create BOOLEAN,
  customers_edit BOOLEAN,
  customers_delete BOOLEAN,
  customers_export BOOLEAN,
  bookings_view BOOLEAN,
  bookings_create BOOLEAN,
  bookings_edit BOOLEAN,
  bookings_delete BOOLEAN,
  bookings_cancel BOOLEAN,
  bookings_confirm BOOLEAN,
  invoices_view BOOLEAN,
  invoices_create BOOLEAN,
  invoices_edit BOOLEAN,
  invoices_delete BOOLEAN,
  invoices_send BOOLEAN,
  invoices_payment BOOLEAN,
  suppliers_view BOOLEAN,
  suppliers_create BOOLEAN,
  suppliers_edit BOOLEAN,
  suppliers_delete BOOLEAN,
  suppliers_contracts BOOLEAN,
  reports_financial BOOLEAN,
  reports_sales BOOLEAN,
  reports_operational BOOLEAN,
  reports_export BOOLEAN,
  reports_advanced BOOLEAN,
  employees_view BOOLEAN,
  employees_create BOOLEAN,
  employees_edit BOOLEAN,
  employees_delete BOOLEAN,
  employees_salary BOOLEAN,
  employees_commission BOOLEAN,
  expenses_view BOOLEAN,
  expenses_create BOOLEAN,
  expenses_approve BOOLEAN,
  expenses_reports BOOLEAN,
  system_users BOOLEAN,
  system_settings BOOLEAN,
  system_backup BOOLEAN,
  system_audit BOOLEAN,
  banking_view BOOLEAN,
  banking_transactions BOOLEAN,
  banking_transfer BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dup.id, dup.user_id,
    dup.customers_view, dup.customers_create, dup.customers_edit, dup.customers_delete, dup.customers_export,
    dup.bookings_view, dup.bookings_create, dup.bookings_edit, dup.bookings_delete, dup.bookings_cancel, dup.bookings_confirm,
    dup.invoices_view, dup.invoices_create, dup.invoices_edit, dup.invoices_delete, dup.invoices_send, dup.invoices_payment,
    dup.suppliers_view, dup.suppliers_create, dup.suppliers_edit, dup.suppliers_delete, dup.suppliers_contracts,
    dup.reports_financial, dup.reports_sales, dup.reports_operational, dup.reports_export, dup.reports_advanced,
    dup.employees_view, dup.employees_create, dup.employees_edit, dup.employees_delete, dup.employees_salary, dup.employees_commission,
    dup.expenses_view, dup.expenses_create, dup.expenses_approve, dup.expenses_reports,
    dup.system_users, dup.system_settings, dup.system_backup, dup.system_audit,
    dup.banking_view, dup.banking_transactions, dup.banking_transfer,
    dup.created_at, dup.updated_at
  FROM public.detailed_user_permissions dup
  WHERE dup.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث صلاحيات المستخدم
CREATE OR REPLACE FUNCTION public.update_user_permissions(
  p_user_id UUID, 
  p_permissions JSONB
)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
INSERT INTO public.detailed_user_permissions (
    user_id,
    customers_view, customers_create, customers_edit, customers_delete, customers_export,
    bookings_view, bookings_create, bookings_edit, bookings_delete, bookings_cancel, bookings_confirm,
    invoices_view, invoices_create, invoices_edit, invoices_delete, invoices_send, invoices_payment,
    suppliers_view, suppliers_create, suppliers_edit, suppliers_delete, suppliers_contracts,
    reports_financial, reports_sales, reports_operational, reports_export, reports_advanced,
    employees_view, employees_create, employees_edit, employees_delete, employees_salary, employees_commission,
    expenses_view, expenses_create, expenses_approve, expenses_reports,
    system_users, system_settings, system_backup, system_audit,
    banking_view, banking_transactions, banking_transfer,
    updated_at
  ) VALUES (
    p_user_id,
    COALESCE((p_permissions->>'customers_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'customers_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'customers_edit')::BOOLEAN, false),
    COALESCE((p_permissions->>'customers_delete')::BOOLEAN, false),
    COALESCE((p_permissions->>'customers_export')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_edit')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_delete')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_cancel')::BOOLEAN, false),
    COALESCE((p_permissions->>'bookings_confirm')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_edit')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_delete')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_send')::BOOLEAN, false),
    COALESCE((p_permissions->>'invoices_payment')::BOOLEAN, false),
    COALESCE((p_permissions->>'suppliers_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'suppliers_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'suppliers_edit')::BOOLEAN, false),
    COALESCE((p_permissions->>'suppliers_delete')::BOOLEAN, false),
    COALESCE((p_permissions->>'suppliers_contracts')::BOOLEAN, false),
    COALESCE((p_permissions->>'reports_financial')::BOOLEAN, false),
    COALESCE((p_permissions->>'reports_sales')::BOOLEAN, false),
    COALESCE((p_permissions->>'reports_operational')::BOOLEAN, false),
    COALESCE((p_permissions->>'reports_export')::BOOLEAN, false),
    COALESCE((p_permissions->>'reports_advanced')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_edit')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_delete')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_salary')::BOOLEAN, false),
    COALESCE((p_permissions->>'employees_commission')::BOOLEAN, false),
    COALESCE((p_permissions->>'expenses_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'expenses_create')::BOOLEAN, false),
    COALESCE((p_permissions->>'expenses_approve')::BOOLEAN, false),
    COALESCE((p_permissions->>'expenses_reports')::BOOLEAN, false),
    COALESCE((p_permissions->>'system_users')::BOOLEAN, false),
    COALESCE((p_permissions->>'system_settings')::BOOLEAN, false),
    COALESCE((p_permissions->>'system_backup')::BOOLEAN, false),
    COALESCE((p_permissions->>'system_audit')::BOOLEAN, false),
    COALESCE((p_permissions->>'banking_view')::BOOLEAN, false),
    COALESCE((p_permissions->>'banking_transactions')::BOOLEAN, false),
    COALESCE((p_permissions->>'banking_transfer')::BOOLEAN, false),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    customers_view = COALESCE((p_permissions->>'customers_view')::BOOLEAN, detailed_user_permissions.customers_view),
    customers_create = COALESCE((p_permissions->>'customers_create')::BOOLEAN, detailed_user_permissions.customers_create),
    customers_edit = COALESCE((p_permissions->>'customers_edit')::BOOLEAN, detailed_user_permissions.customers_edit),
    customers_delete = COALESCE((p_permissions->>'customers_delete')::BOOLEAN, detailed_user_permissions.customers_delete),
    customers_export = COALESCE((p_permissions->>'customers_export')::BOOLEAN, detailed_user_permissions.customers_export),
    bookings_view = COALESCE((p_permissions->>'bookings_view')::BOOLEAN, detailed_user_permissions.bookings_view),
    bookings_create = COALESCE((p_permissions->>'bookings_create')::BOOLEAN, detailed_user_permissions.bookings_create),
    bookings_edit = COALESCE((p_permissions->>'bookings_edit')::BOOLEAN, detailed_user_permissions.bookings_edit),
    bookings_delete = COALESCE((p_permissions->>'bookings_delete')::BOOLEAN, detailed_user_permissions.bookings_delete),
    bookings_cancel = COALESCE((p_permissions->>'bookings_cancel')::BOOLEAN, detailed_user_permissions.bookings_cancel),
    bookings_confirm = COALESCE((p_permissions->>'bookings_confirm')::BOOLEAN, detailed_user_permissions.bookings_confirm),
    invoices_view = COALESCE((p_permissions->>'invoices_view')::BOOLEAN, detailed_user_permissions.invoices_view),
    invoices_create = COALESCE((p_permissions->>'invoices_create')::BOOLEAN, detailed_user_permissions.invoices_create),
    invoices_edit = COALESCE((p_permissions->>'invoices_edit')::BOOLEAN, detailed_user_permissions.invoices_edit),
    invoices_delete = COALESCE((p_permissions->>'invoices_delete')::BOOLEAN, detailed_user_permissions.invoices_delete),
    invoices_send = COALESCE((p_permissions->>'invoices_send')::BOOLEAN, detailed_user_permissions.invoices_send),
    invoices_payment = COALESCE((p_permissions->>'invoices_payment')::BOOLEAN, detailed_user_permissions.invoices_payment),
    suppliers_view = COALESCE((p_permissions->>'suppliers_view')::BOOLEAN, detailed_user_permissions.suppliers_view),
    suppliers_create = COALESCE((p_permissions->>'suppliers_create')::BOOLEAN, detailed_user_permissions.suppliers_create),
    suppliers_edit = COALESCE((p_permissions->>'suppliers_edit')::BOOLEAN, detailed_user_permissions.suppliers_edit),
    suppliers_delete = COALESCE((p_permissions->>'suppliers_delete')::BOOLEAN, detailed_user_permissions.suppliers_delete),
    suppliers_contracts = COALESCE((p_permissions->>'suppliers_contracts')::BOOLEAN, detailed_user_permissions.suppliers_contracts),
    reports_financial = COALESCE((p_permissions->>'reports_financial')::BOOLEAN, detailed_user_permissions.reports_financial),
    reports_sales = COALESCE((p_permissions->>'reports_sales')::BOOLEAN, detailed_user_permissions.reports_sales),
    reports_operational = COALESCE((p_permissions->>'reports_operational')::BOOLEAN, detailed_user_permissions.reports_operational),
    reports_export = COALESCE((p_permissions->>'reports_export')::BOOLEAN, detailed_user_permissions.reports_export),
    reports_advanced = COALESCE((p_permissions->>'reports_advanced')::BOOLEAN, detailed_user_permissions.reports_advanced),
    employees_view = COALESCE((p_permissions->>'employees_view')::BOOLEAN, detailed_user_permissions.employees_view),
    employees_create = COALESCE((p_permissions->>'employees_create')::BOOLEAN, detailed_user_permissions.employees_create),
    employees_edit = COALESCE((p_permissions->>'employees_edit')::BOOLEAN, detailed_user_permissions.employees_edit),
    employees_delete = COALESCE((p_permissions->>'employees_delete')::BOOLEAN, detailed_user_permissions.employees_delete),
    employees_salary = COALESCE((p_permissions->>'employees_salary')::BOOLEAN, detailed_user_permissions.employees_salary),
    employees_commission = COALESCE((p_permissions->>'employees_commission')::BOOLEAN, detailed_user_permissions.employees_commission),
    expenses_view = COALESCE((p_permissions->>'expenses_view')::BOOLEAN, detailed_user_permissions.expenses_view),
    expenses_create = COALESCE((p_permissions->>'expenses_create')::BOOLEAN, detailed_user_permissions.expenses_create),
    expenses_approve = COALESCE((p_permissions->>'expenses_approve')::BOOLEAN, detailed_user_permissions.expenses_approve),
    expenses_reports = COALESCE((p_permissions->>'expenses_reports')::BOOLEAN, detailed_user_permissions.expenses_reports),
    system_users = COALESCE((p_permissions->>'system_users')::BOOLEAN, detailed_user_permissions.system_users),
    system_settings = COALESCE((p_permissions->>'system_settings')::BOOLEAN, detailed_user_permissions.system_settings),
    system_backup = COALESCE((p_permissions->>'system_backup')::BOOLEAN, detailed_user_permissions.system_backup),
    system_audit = COALESCE((p_permissions->>'system_audit')::BOOLEAN, detailed_user_permissions.system_audit),
    banking_view = COALESCE((p_permissions->>'banking_view')::BOOLEAN, detailed_user_permissions.banking_view),
    banking_transactions = COALESCE((p_permissions->>'banking_transactions')::BOOLEAN, detailed_user_permissions.banking_transactions),
    banking_transfer = COALESCE((p_permissions->>'banking_transfer')::BOOLEAN, detailed_user_permissions.banking_transfer),
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء صلاحيات افتراضية
CREATE OR REPLACE FUNCTION public.create_default_permissions(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
INSERT INTO public.detailed_user_permissions (
    user_id, customers_view, bookings_view, created_at, updated_at
  ) VALUES (
    p_user_id, true, true, now(), now()
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
