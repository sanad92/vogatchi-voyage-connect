import type { SopDepartment } from '@/lib/sop';

export type OrgRole = 'owner' | 'admin' | 'manager' | 'agent' | 'viewer';

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
  | 'team'
  | 'financial'
  | 'customer_service'
  | 'customer_portal'
  | 'whatsapp'
  | 'admin'
  | 'automation'
  | 'audit'
  | 'documents'
  | 'quotes'
  | 'marketing';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'advanced';

export type PermissionKey = `${PermissionCategory}_${PermissionAction}`
  | 'invoices_send' | 'invoices_payment'
  | 'bookings_cancel' | 'bookings_confirm'
  | 'suppliers_contracts'
  | 'employees_salary' | 'employees_commission'
  | 'expenses_approve'
  | 'system_users' | 'system_settings' | 'system_backup' | 'system_audit'
  | 'banking_transactions' | 'banking_transfer'
  | 'crm_follow_ups' | 'crm_campaigns' | 'crm_segments'
  | 'payments_refund' | 'payments_process'
  | 'team_invite' | 'team_manage_roles'
  | 'financial_view' | 'financial_edit'
  | 'customer_service_view' | 'customer_service_edit'
  | 'customer_portal_view'
  | 'whatsapp_view' | 'whatsapp_admin'
  | 'admin_settings'
  | 'automation_view' | 'automation_edit'
  | 'audit_view'
  | 'documents_view' | 'documents_create'
  | 'quotes_view' | 'quotes_create' | 'quotes_edit' | 'quotes_delete'
  | 'marketing_view' | 'marketing_edit';

const MANAGER_PERMISSIONS: PermissionKey[] = [
  'customers_view', 'customers_create', 'customers_edit', 'customers_export',
  'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_cancel', 'bookings_confirm',
  'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_send', 'invoices_payment',
  'suppliers_view', 'suppliers_create', 'suppliers_edit',
  'reports_view', 'reports_export',
  'employees_view', 'employees_edit', 'employees_commission',
  'expenses_view', 'expenses_create', 'expenses_approve',
  'banking_view', 'banking_transactions',
  'crm_view', 'crm_create', 'crm_edit', 'crm_follow_ups', 'crm_campaigns', 'crm_segments',
  'payments_view', 'payments_create', 'payments_process',
  'team_view',
  'financial_view',
  'customer_service_view', 'customer_service_edit',
  'customer_portal_view',
  'whatsapp_view',
  'marketing_view', 'marketing_edit',
  'documents_view', 'documents_create',
  'quotes_view', 'quotes_create', 'quotes_edit',
];

const VIEWER_PERMISSIONS: PermissionKey[] = [
  'customers_view',
  'bookings_view',
  'invoices_view',
  'suppliers_view',
  'crm_view',
  'payments_view',
  'documents_view',
  'quotes_view',
];

const AGENT_BASE_PERMISSIONS: PermissionKey[] = [
  'team_view',
  'documents_view',
];

// Agents that have not been assigned to any department keep a read-only
// baseline so they are never fully locked out of the workspace.
const AGENT_UNASSIGNED_PERMISSIONS: PermissionKey[] = [
  'customers_view',
  'bookings_view',
  'crm_view',
  'quotes_view',
  'invoices_view',
];


export const DEPARTMENT_PERMISSIONS: Record<SopDepartment, PermissionKey[]> = {
  customer_service: [
    'customers_view', 'customers_create', 'customers_edit',
    'crm_view', 'crm_create', 'crm_edit', 'crm_follow_ups',
    'customer_service_view', 'customer_service_edit',
    'whatsapp_view',
    'bookings_view',
    'quotes_view',
    'documents_create',
  ],
  sales: [
    'customers_view', 'customers_create', 'customers_edit',
    'crm_view', 'crm_create', 'crm_edit', 'crm_follow_ups',
    'quotes_view', 'quotes_create', 'quotes_edit',
    'bookings_view',
    'invoices_view',
    'payments_view',
    'documents_create',
  ],
  reservations: [
    'customers_view',
    'crm_view',
    'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_confirm', 'bookings_cancel',
    'suppliers_view', 'suppliers_create', 'suppliers_edit', 'suppliers_contracts',
    'quotes_view', 'quotes_create', 'quotes_edit',
    'invoices_view',
    'payments_view',
    'documents_create',
  ],
  operations: [
    'customers_view',
    'bookings_view', 'bookings_edit', 'bookings_confirm',
    'suppliers_view',
    'reports_view',
    'documents_create',
  ],
  finance: [
    'customers_view',
    'bookings_view',
    'invoices_view', 'invoices_create', 'invoices_edit', 'invoices_send', 'invoices_payment',
    'payments_view', 'payments_create', 'payments_edit', 'payments_process', 'payments_refund',
    'expenses_view', 'expenses_create', 'expenses_approve',
    'banking_view', 'banking_transactions', 'banking_transfer',
    'financial_view', 'financial_edit',
    'reports_view', 'reports_export', 'reports_advanced',
    'suppliers_view',
    'documents_create',
  ],
  marketing: [
    'customers_view',
    'crm_view', 'crm_create', 'crm_edit', 'crm_campaigns', 'crm_segments',
    'marketing_view', 'marketing_edit',
    'reports_view', 'reports_export',
    'documents_create',
  ],
  management: MANAGER_PERMISSIONS,
};

export function permissionsFor(role: string | null, departments: SopDepartment[] = []): ReadonlySet<PermissionKey> {
  if (role === 'owner' || role === 'admin') {
    // Owner/admin are handled as an explicit bypass in hasPermissionForRole.
    return new Set<PermissionKey>();
  }
  if (role === 'manager') return new Set(MANAGER_PERMISSIONS);
  if (role === 'viewer') return new Set(VIEWER_PERMISSIONS);
  if (role !== 'agent') return new Set<PermissionKey>();

  const permissions = new Set<PermissionKey>(AGENT_BASE_PERMISSIONS);
  if (departments.length === 0) {
    for (const permission of AGENT_UNASSIGNED_PERMISSIONS) permissions.add(permission);
  }
  for (const department of departments) {
    for (const permission of DEPARTMENT_PERMISSIONS[department] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
}

export function hasPermissionForRole(
  role: string | null,
  departments: SopDepartment[],
  permission: PermissionKey,
): boolean {
  if (role === 'owner' || role === 'admin') return true;
  return permissionsFor(role, departments).has(permission);
}

