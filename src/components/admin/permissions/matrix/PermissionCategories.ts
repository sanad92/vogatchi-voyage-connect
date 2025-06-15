
export const PERMISSION_CATEGORIES = [
  {
    key: 'customers',
    name: 'إدارة العملاء',
    icon: '👥',
    color: 'bg-green-100 text-green-800',
    permissions: [
      { key: 'customers_view', name: 'عرض العملاء' },
      { key: 'customers_create', name: 'إضافة عملاء' },
      { key: 'customers_edit', name: 'تعديل العملاء' },
      { key: 'customers_delete', name: 'حذف العملاء' },
      { key: 'customers_export', name: 'تصدير البيانات' },
    ]
  },
  {
    key: 'bookings',
    name: 'إدارة الحجوزات',
    icon: '📅',
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      { key: 'bookings_view', name: 'عرض الحجوزات' },
      { key: 'bookings_create', name: 'إنشاء حجوزات' },
      { key: 'bookings_edit', name: 'تعديل الحجوزات' },
      { key: 'bookings_delete', name: 'حذف الحجوزات' },
      { key: 'bookings_cancel', name: 'إلغاء الحجوزات' },
      { key: 'bookings_confirm', name: 'تأكيد الحجوزات' },
    ]
  },
  {
    key: 'invoices',
    name: 'إدارة الفواتير',
    icon: '📋',
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      { key: 'invoices_view', name: 'عرض الفواتير' },
      { key: 'invoices_create', name: 'إنشاء فواتير' },
      { key: 'invoices_edit', name: 'تعديل الفواتير' },
      { key: 'invoices_delete', name: 'حذف الفواتير' },
      { key: 'invoices_send', name: 'إرسال الفواتير' },
      { key: 'invoices_payment', name: 'إدارة المدفوعات' },
    ]
  },
  {
    key: 'suppliers',
    name: 'إدارة الموردين',
    icon: '🏢',
    color: 'bg-orange-100 text-orange-800',
    permissions: [
      { key: 'suppliers_view', name: 'عرض الموردين' },
      { key: 'suppliers_create', name: 'إضافة موردين' },
      { key: 'suppliers_edit', name: 'تعديل الموردين' },
      { key: 'suppliers_delete', name: 'حذف الموردين' },
      { key: 'suppliers_contracts', name: 'إدارة العقود' },
    ]
  },
  {
    key: 'reports',
    name: 'التقارير والإحصائيات',
    icon: '📊',
    color: 'bg-red-100 text-red-800',
    permissions: [
      { key: 'reports_financial', name: 'التقارير المالية' },
      { key: 'reports_sales', name: 'تقارير المبيعات' },
      { key: 'reports_operational', name: 'التقارير التشغيلية' },
      { key: 'reports_export', name: 'تصدير التقارير' },
      { key: 'reports_advanced', name: 'التحليلات المتقدمة' },
    ]
  },
  {
    key: 'employees',
    name: 'إدارة الموظفين',
    icon: '👨‍💼',
    color: 'bg-yellow-100 text-yellow-800',
    permissions: [
      { key: 'employees_view', name: 'عرض الموظفين' },
      { key: 'employees_create', name: 'إضافة موظفين' },
      { key: 'employees_edit', name: 'تعديل الموظفين' },
      { key: 'employees_delete', name: 'حذف الموظفين' },
      { key: 'employees_salary', name: 'إدارة الرواتب' },
      { key: 'employees_commission', name: 'إدارة العمولات' },
    ]
  },
  {
    key: 'expenses',
    name: 'إدارة المصروفات',
    icon: '💰',
    color: 'bg-pink-100 text-pink-800',
    permissions: [
      { key: 'expenses_view', name: 'عرض المصروفات' },
      { key: 'expenses_create', name: 'إضافة مصروفات' },
      { key: 'expenses_approve', name: 'اعتماد المصروفات' },
      { key: 'expenses_reports', name: 'تقارير المصروفات' },
    ]
  },
  {
    key: 'system',
    name: 'إدارة النظام',
    icon: '⚙️',
    color: 'bg-gray-100 text-gray-800',
    permissions: [
      { key: 'system_users', name: 'إدارة المستخدمين' },
      { key: 'system_settings', name: 'إعدادات النظام' },
      { key: 'system_backup', name: 'النسخ الاحتياطي' },
      { key: 'system_audit', name: 'سجلات المراجعة' },
    ]
  },
  {
    key: 'banking',
    name: 'الحسابات البنكية',
    icon: '🏦',
    color: 'bg-indigo-100 text-indigo-800',
    permissions: [
      { key: 'banking_view', name: 'عرض الحسابات' },
      { key: 'banking_transactions', name: 'المعاملات البنكية' },
      { key: 'banking_transfer', name: 'التحويلات البنكية' },
    ]
  },
];
