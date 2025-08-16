import { useSimpleAuth } from './useSimpleAuth';

// نظام صلاحيات مبسط يعتمد على الأدوار
type PermissionCategory = 
  | 'customers' 
  | 'bookings' 
  | 'invoices' 
  | 'suppliers' 
  | 'reports' 
  | 'employees' 
  | 'expenses' 
  | 'system' 
  | 'banking';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'advanced';

type PermissionKey = `${PermissionCategory}_${PermissionAction}` | 'invoices_send' | 'invoices_payment' | 'bookings_cancel' | 'bookings_confirm' | 'suppliers_contracts' | 'employees_salary' | 'employees_commission' | 'expenses_approve' | 'system_users' | 'system_settings' | 'system_backup' | 'system_audit' | 'banking_transactions' | 'banking_transfer';

export const useSimplePermissions = () => {
  const { user, isSuperAdmin, hasRole } = useSimpleAuth();

  // تعريف الصلاحيات حسب الدور
  const rolePermissions: Record<string, PermissionKey[]> = {
    super_admin: [], // السوبر أدمن له كل الصلاحيات
    admin: [
      // العملاء
      'customers_view', 'customers_create', 'customers_edit', 'customers_delete', 'customers_export',
      // الحجوزات
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_delete', 'bookings_cancel', 'bookings_confirm',
      // الفواتير
      'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_delete', 'invoices_send', 'invoices_payment',
      // الموردين
      'suppliers_view', 'suppliers_create', 'suppliers_edit', 'suppliers_delete', 'suppliers_contracts',
      // التقارير
      'reports_view', 'reports_export', 'reports_advanced',
      // الموظفين
      'employees_view', 'employees_create', 'employees_edit', 'employees_salary', 'employees_commission',
      // المصروفات
      'expenses_view', 'expenses_create', 'expenses_approve',
      // البنكية
      'banking_view', 'banking_transactions', 'banking_transfer'
    ],
    manager: [
      // العملاء
      'customers_view', 'customers_create', 'customers_edit', 'customers_export',
      // الحجوزات
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel', 'bookings_confirm',
      // الفواتير
      'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_send', 'invoices_payment',
      // الموردين
      'suppliers_view', 'suppliers_create', 'suppliers_edit',
      // التقارير
      'reports_view', 'reports_export',
      // الموظفين
      'employees_view', 'employees_edit', 'employees_commission',
      // المصروفات
      'expenses_view', 'expenses_create', 'expenses_approve',
      // البنكية
      'banking_view', 'banking_transactions'
    ],
    sales_agent: [
      // العملاء
      'customers_view', 'customers_create', 'customers_edit',
      // الحجوزات
      'bookings_view', 'bookings_create', 'bookings_edit',
      // الفواتير
      'invoices_view', 'invoices_create', 'invoices_send',
      // الموردين
      'suppliers_view',
      // التقارير
      'reports_view'
    ],
    customer_service: [
      // العملاء
      'customers_view', 'customers_edit',
      // الحجوزات
      'bookings_view', 'bookings_edit', 'bookings_cancel',
      // الفواتير
      'invoices_view',
      // الموردين
      'suppliers_view'
    ],
    booking_agent: [
      // العملاء
      'customers_view', 'customers_create', 'customers_edit',
      // الحجوزات
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_confirm',
      // الفواتير
      'invoices_view', 'invoices_create',
      // الموردين
      'suppliers_view'
    ],
    accountant: [
      // العملاء
      'customers_view',
      // الحجوزات
      'bookings_view',
      // الفواتير
      'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_send', 'invoices_payment',
      // المصروفات
      'expenses_view', 'expenses_create', 'expenses_approve',
      // التقارير
      'reports_view', 'reports_export',
      // البنكية
      'banking_view', 'banking_transactions', 'banking_transfer'
    ],
    viewer: [
      // العملاء
      'customers_view',
      // الحجوزات
      'bookings_view',
      // الفواتير
      'invoices_view',
      // الموردين
      'suppliers_view'
    ]
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    // السوبر أدمن له كل الصلاحيات
    if (isSuperAdmin()) return true;
    
    // إذا لم يكن هناك مستخدم مسجل، منع الوصول
    if (!user?.role) return false;
    
    // التحقق من الصلاحيات حسب الدور
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // صلاحيات مبسطة للعمليات الشائعة
  const canViewCustomers = () => hasPermission('customers_view');
  const canCreateCustomers = () => hasPermission('customers_create');
  const canEditCustomers = () => hasPermission('customers_edit');
  const canDeleteCustomers = () => hasPermission('customers_delete');

  const canViewBookings = () => hasPermission('bookings_view');
  const canCreateBookings = () => hasPermission('bookings_create');
  const canEditBookings = () => hasPermission('bookings_edit');
  const canDeleteBookings = () => hasPermission('bookings_delete');
  const canConfirmBookings = () => hasPermission('bookings_confirm');
  const canCancelBookings = () => hasPermission('bookings_cancel');

  const canViewInvoices = () => hasPermission('invoices_view');
  const canCreateInvoices = () => hasPermission('invoices_create');
  const canEditInvoices = () => hasPermission('invoices_edit');
  const canDeleteInvoices = () => hasPermission('invoices_delete');
  const canSendInvoices = () => hasPermission('invoices_send');

  const canViewReports = () => hasPermission('reports_view');
  const canExportReports = () => hasPermission('reports_export');

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // العملاء
    canViewCustomers,
    canCreateCustomers,
    canEditCustomers,
    canDeleteCustomers,
    // الحجوزات
    canViewBookings,
    canCreateBookings,
    canEditBookings,
    canDeleteBookings,
    canConfirmBookings,
    canCancelBookings,
    // الفواتير
    canViewInvoices,
    canCreateInvoices,
    canEditInvoices,
    canDeleteInvoices,
    canSendInvoices,
    // التقارير
    canViewReports,
    canExportReports,
  };
};