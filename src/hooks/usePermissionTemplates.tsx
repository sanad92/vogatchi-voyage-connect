
import { toast } from 'sonner';
import { DetailedUserPermissions } from './useUserPermissionsManagement';

export const usePermissionTemplates = (updatePermissions: (params: { userId: string; permissions: Partial<DetailedUserPermissions> }) => void) => {
  const templates = {
    'customer_service': {
      customers_view: true,
      customers_create: true,
      customers_edit: true,
      bookings_view: true,
      invoices_view: true,
    },
    'sales_agent': {
      customers_view: true,
      customers_create: true,
      customers_edit: true,
      bookings_view: true,
      bookings_create: true,
      bookings_edit: true,
      invoices_view: true,
      suppliers_view: true,
    },
    'reservations_agent': {
      customers_view: true,
      bookings_view: true,
      bookings_create: true,
      bookings_edit: true,
      bookings_cancel: true,
      bookings_confirm: true,
      invoices_view: true,
      suppliers_view: true,
    },
    'accountant': {
      customers_view: true,
      bookings_view: true,
      invoices_view: true,
      invoices_create: true,
      invoices_edit: true,
      invoices_payment: true,
      reports_financial: true,
      expenses_view: true,
      expenses_approve: true,
      banking_view: true,
      banking_transactions: true,
    },
    'finance_manager': {
      customers_view: true,
      customers_export: true,
      bookings_view: true,
      invoices_view: true,
      invoices_create: true,
      invoices_edit: true,
      invoices_send: true,
      invoices_payment: true,
      suppliers_view: true,
      reports_financial: true,
      reports_sales: true,
      reports_operational: true,
      reports_export: true,
      reports_advanced: true,
      employees_view: true,
      employees_salary: true,
      employees_commission: true,
      expenses_view: true,
      expenses_create: true,
      expenses_approve: true,
      expenses_reports: true,
      banking_view: true,
      banking_transactions: true,
      banking_transfer: true,
    },
    'manager': {
      customers_view: true,
      customers_create: true,
      customers_edit: true,
      customers_delete: true,
      bookings_view: true,
      bookings_create: true,
      bookings_edit: true,
      bookings_delete: true,
      invoices_view: true,
      invoices_create: true,
      invoices_edit: true,
      suppliers_view: true,
      suppliers_create: true,
      suppliers_edit: true,
      reports_financial: true,
      reports_sales: true,
      reports_operational: true,
      employees_view: true,
      employees_edit: true,
      expenses_view: true,
      expenses_approve: true,
    },
    'viewer': {
      customers_view: true,
      bookings_view: true,
      invoices_view: true,
      suppliers_view: true,
      reports_financial: true,
      reports_sales: true,
      employees_view: true,
      expenses_view: true,
    },
    'auditor': {
      customers_view: true,
      customers_export: true,
      bookings_view: true,
      invoices_view: true,
      suppliers_view: true,
      reports_financial: true,
      reports_sales: true,
      reports_operational: true,
      reports_export: true,
      reports_advanced: true,
      employees_view: true,
      expenses_view: true,
      expenses_reports: true,
      system_audit: true,
      banking_view: true,
      banking_transactions: true,
    }
  };

  const applyPermissionTemplate = async (userId: string, templateName: string) => {
    const templatePermissions = templates[templateName as keyof typeof templates];
    if (templatePermissions) {
      updatePermissions({ userId, permissions: templatePermissions });
      toast.success(`تم تطبيق قالب ${templateName} بنجاح`);
    }
  };

  return {
    applyPermissionTemplate,
    templates,
  };
};
