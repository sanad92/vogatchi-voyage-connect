import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Permission system based on organization_members.role
// Role hierarchy: owner > admin > manager > agent > viewer
type PermissionCategory = 
  | 'customers' 
  | 'bookings' 
  | 'invoices' 
  | 'suppliers' 
  | 'reports' 
  | 'employees' 
  | 'expenses' 
  | 'system' 
  | 'banking'
  | 'crm'
  | 'payments'
  | 'team';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'advanced';

type PermissionKey = `${PermissionCategory}_${PermissionAction}` | 'invoices_send' | 'invoices_payment' | 'bookings_cancel' | 'bookings_confirm' | 'suppliers_contracts' | 'employees_salary' | 'employees_commission' | 'expenses_approve' | 'system_users' | 'system_settings' | 'system_backup' | 'system_audit' | 'banking_transactions' | 'banking_transfer' | 'crm_follow_ups' | 'crm_campaigns' | 'crm_segments' | 'payments_refund' | 'payments_process' | 'team_invite' | 'team_manage_roles';

export const useSupabasePermissions = () => {
  const { userRole, hasRole } = useOptimizedAuth();

  const rolePermissions: Record<string, PermissionKey[]> = {
    owner: [], // owner has all permissions (handled by hasPermission)
    admin: [
      'customers_view', 'customers_create', 'customers_edit', 'customers_delete', 'customers_export',
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_delete', 'bookings_cancel', 'bookings_confirm',
      'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_delete', 'invoices_send', 'invoices_payment',
      'suppliers_view', 'suppliers_create', 'suppliers_edit', 'suppliers_delete', 'suppliers_contracts',
      'reports_view', 'reports_export', 'reports_advanced',
      'employees_view', 'employees_create', 'employees_edit', 'employees_salary', 'employees_commission',
      'expenses_view', 'expenses_create', 'expenses_approve',
      'banking_view', 'banking_transactions', 'banking_transfer',
      'system_users', 'system_settings', 'system_backup', 'system_audit',
      'crm_view', 'crm_create', 'crm_edit', 'crm_delete', 'crm_follow_ups', 'crm_campaigns', 'crm_segments',
      'payments_view', 'payments_create', 'payments_edit', 'payments_process', 'payments_refund',
      'team_view', 'team_invite', 'team_manage_roles',
    ],
    manager: [
      'customers_view', 'customers_create', 'customers_edit', 'customers_export',
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel', 'bookings_confirm',
      'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_send', 'invoices_payment',
      'suppliers_view', 'suppliers_create', 'suppliers_edit',
      'reports_view', 'reports_export',
      'employees_view', 'employees_edit', 'employees_commission',
      'expenses_view', 'expenses_create', 'expenses_approve',
      'banking_view', 'banking_transactions',
      'crm_view', 'crm_create', 'crm_edit', 'crm_follow_ups', 'crm_campaigns',
      'payments_view', 'payments_create', 'payments_process',
      'team_view',
    ],
    agent: [
      'customers_view', 'customers_create', 'customers_edit',
      'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_confirm',
      'invoices_view', 'invoices_create', 'invoices_send',
      'suppliers_view',
      'reports_view',
      'crm_view', 'crm_create', 'crm_follow_ups',
      'payments_view', 'payments_create',
    ],
    viewer: [
      'customers_view',
      'bookings_view',
      'invoices_view',
      'suppliers_view',
      'crm_view',
      'payments_view',
    ],
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!userRole) return false;
    if (userRole === 'owner') return true;
    const perms = rolePermissions[userRole] || [];
    return perms.includes(permission);
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: PermissionKey[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Customers
    canViewCustomers: () => hasPermission('customers_view'),
    canCreateCustomers: () => hasPermission('customers_create'),
    canEditCustomers: () => hasPermission('customers_edit'),
    canDeleteCustomers: () => hasPermission('customers_delete'),
    // Bookings
    canViewBookings: () => hasPermission('bookings_view'),
    canCreateBookings: () => hasPermission('bookings_create'),
    canEditBookings: () => hasPermission('bookings_edit'),
    canDeleteBookings: () => hasPermission('bookings_delete'),
    canConfirmBookings: () => hasPermission('bookings_confirm'),
    canCancelBookings: () => hasPermission('bookings_cancel'),
    // Invoices
    canViewInvoices: () => hasPermission('invoices_view'),
    canCreateInvoices: () => hasPermission('invoices_create'),
    canEditInvoices: () => hasPermission('invoices_edit'),
    canDeleteInvoices: () => hasPermission('invoices_delete'),
    canSendInvoices: () => hasPermission('invoices_send'),
    // Reports
    canViewReports: () => hasPermission('reports_view'),
    canExportReports: () => hasPermission('reports_export'),
    // CRM
    canViewCRM: () => hasPermission('crm_view'),
    canCreateCRM: () => hasPermission('crm_create'),
    canEditCRM: () => hasPermission('crm_edit'),
    canManageCampaigns: () => hasPermission('crm_campaigns'),
    canManageSegments: () => hasPermission('crm_segments'),
    // Payments
    canViewPayments: () => hasPermission('payments_view'),
    canProcessPayments: () => hasPermission('payments_process'),
    canRefundPayments: () => hasPermission('payments_refund'),
    // Team
    canViewTeam: () => hasPermission('team_view'),
    canInviteMembers: () => hasPermission('team_invite'),
    canManageRoles: () => hasPermission('team_manage_roles'),
  };
};
