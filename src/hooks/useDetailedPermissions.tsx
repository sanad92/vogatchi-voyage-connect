
import { usePermissionsData } from './usePermissionsData';
import { useUserPermissionsManagement } from './useUserPermissionsManagement';
import { usePermissionTemplates } from './usePermissionTemplates';

export type {
  DetailedUserPermissions,
  AllUserPermissions,
} from './useUserPermissionsManagement';

export type {
  PermissionGroup,
  PermissionDetail,
} from './usePermissionsData';

export const useDetailedPermissions = () => {
  const { permissionGroups, permissionDetails } = usePermissionsData();
  const {
    allUserPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions,
    createPermissions,
    isUpdating,
    isCreating,
  } = useUserPermissionsManagement();

  const { applyPermissionTemplate } = usePermissionTemplates(updatePermissions);

  // إنشاء صلاحيات افتراضية محسنة للمستخدمين الجدد
  const createDefaultPermissions = async (userId: string, role: string = 'viewer') => {
    let defaultPermissions = {};
    
    switch (role) {
      case 'super_admin':
        // السوبر أدمن له كل الصلاحيات
        defaultPermissions = {
          customers_view: true, customers_create: true, customers_edit: true, customers_delete: true, customers_export: true,
          bookings_view: true, bookings_create: true, bookings_edit: true, bookings_delete: true, bookings_cancel: true, bookings_confirm: true,
          invoices_view: true, invoices_create: true, invoices_edit: true, invoices_delete: true, invoices_send: true, invoices_payment: true,
          suppliers_view: true, suppliers_create: true, suppliers_edit: true, suppliers_delete: true, suppliers_contracts: true,
          reports_financial: true, reports_sales: true, reports_operational: true, reports_export: true, reports_advanced: true,
          employees_view: true, employees_create: true, employees_edit: true, employees_delete: true, employees_salary: true, employees_commission: true,
          expenses_view: true, expenses_create: true, expenses_approve: true, expenses_reports: true,
          system_users: true, system_settings: true, system_backup: true, system_audit: true,
          banking_view: true, banking_transactions: true, banking_transfer: true
        };
        break;
      case 'admin':
        defaultPermissions = {
          customers_view: true, customers_create: true, customers_edit: true, customers_delete: true, customers_export: true,
          bookings_view: true, bookings_create: true, bookings_edit: true, bookings_delete: false, bookings_cancel: true, bookings_confirm: true,
          invoices_view: true, invoices_create: true, invoices_edit: true, invoices_delete: false, invoices_send: true, invoices_payment: true,
          suppliers_view: true, suppliers_create: true, suppliers_edit: true, suppliers_delete: false, suppliers_contracts: true,
          reports_financial: true, reports_sales: true, reports_operational: true, reports_export: true, reports_advanced: false,
          employees_view: true, employees_create: true, employees_edit: true, employees_delete: false, employees_salary: true, employees_commission: true,
          expenses_view: true, expenses_create: true, expenses_approve: true, expenses_reports: true,
          system_users: true, system_settings: false, system_backup: false, system_audit: false,
          banking_view: true, banking_transactions: true, banking_transfer: false
        };
        break;
      case 'manager':
        defaultPermissions = {
          customers_view: true, customers_create: true, customers_edit: true, customers_delete: false, customers_export: true,
          bookings_view: true, bookings_create: true, bookings_edit: true, bookings_delete: false, bookings_cancel: true, bookings_confirm: true,
          invoices_view: true, invoices_create: true, invoices_edit: true, invoices_delete: false, invoices_send: true, invoices_payment: false,
          suppliers_view: true, suppliers_create: false, suppliers_edit: false, suppliers_delete: false, suppliers_contracts: false,
          reports_financial: true, reports_sales: true, reports_operational: true, reports_export: true, reports_advanced: false,
          employees_view: true, employees_create: false, employees_edit: false, employees_delete: false, employees_salary: false, employees_commission: false,
          expenses_view: true, expenses_create: true, expenses_approve: false, expenses_reports: true,
          system_users: false, system_settings: false, system_backup: false, system_audit: false,
          banking_view: true, banking_transactions: false, banking_transfer: false
        };
        break;
      case 'sales_agent':
        defaultPermissions = {
          customers_view: true, customers_create: true, customers_edit: true, customers_delete: false, customers_export: false,
          bookings_view: true, bookings_create: true, bookings_edit: true, bookings_delete: false, bookings_cancel: false, bookings_confirm: true,
          invoices_view: true, invoices_create: true, invoices_edit: false, invoices_delete: false, invoices_send: true, invoices_payment: false,
          suppliers_view: true, suppliers_create: false, suppliers_edit: false, suppliers_delete: false, suppliers_contracts: false,
          reports_financial: false, reports_sales: true, reports_operational: false, reports_export: false, reports_advanced: false,
          employees_view: false, employees_create: false, employees_edit: false, employees_delete: false, employees_salary: false, employees_commission: false,
          expenses_view: false, expenses_create: false, expenses_approve: false, expenses_reports: false,
          system_users: false, system_settings: false, system_backup: false, system_audit: false,
          banking_view: false, banking_transactions: false, banking_transfer: false
        };
        break;
      case 'accountant':
        defaultPermissions = {
          customers_view: true, customers_create: false, customers_edit: false, customers_delete: false, customers_export: true,
          bookings_view: true, bookings_create: false, bookings_edit: false, bookings_delete: false, bookings_cancel: false, bookings_confirm: false,
          invoices_view: true, invoices_create: true, invoices_edit: true, invoices_delete: false, invoices_send: true, invoices_payment: true,
          suppliers_view: true, suppliers_create: false, suppliers_edit: false, suppliers_delete: false, suppliers_contracts: false,
          reports_financial: true, reports_sales: true, reports_operational: false, reports_export: true, reports_advanced: false,
          employees_view: true, employees_create: false, employees_edit: false, employees_delete: false, employees_salary: true, employees_commission: true,
          expenses_view: true, expenses_create: true, expenses_approve: false, expenses_reports: true,
          system_users: false, system_settings: false, system_backup: false, system_audit: false,
          banking_view: true, banking_transactions: true, banking_transfer: false
        };
        break;
      default: // viewer
        defaultPermissions = {
          customers_view: true, customers_create: false, customers_edit: false, customers_delete: false, customers_export: false,
          bookings_view: true, bookings_create: false, bookings_edit: false, bookings_delete: false, bookings_cancel: false, bookings_confirm: false,
          invoices_view: true, invoices_create: false, invoices_edit: false, invoices_delete: false, invoices_send: false, invoices_payment: false,
          suppliers_view: true, suppliers_create: false, suppliers_edit: false, suppliers_delete: false, suppliers_contracts: false,
          reports_financial: false, reports_sales: false, reports_operational: false, reports_export: false, reports_advanced: false,
          employees_view: false, employees_create: false, employees_edit: false, employees_delete: false, employees_salary: false, employees_commission: false,
          expenses_view: false, expenses_create: false, expenses_approve: false, expenses_reports: false,
          system_users: false, system_settings: false, system_backup: false, system_audit: false,
          banking_view: false, banking_transactions: false, banking_transfer: false
        };
    }

    await updatePermissions({ userId, permissions: defaultPermissions });
  };

  return {
    permissionGroups,
    permissionDetails,
    allUserPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions,
    createPermissions,
    createDefaultPermissions,
    applyPermissionTemplate,
    isUpdating,
    isCreating,
  };
};
