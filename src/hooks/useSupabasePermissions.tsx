import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { supabase } from '@/integrations/supabase/client';
import type { SopDepartment } from '@/lib/sop';
import {
  hasPermissionForRole,
  type PermissionKey,
} from '@/lib/accessControl';

export type { PermissionKey } from '@/lib/accessControl';

export const useSupabasePermissions = () => {
  const { user, userRole } = useOptimizedAuth();
  const orgId = useOrgId();

  const {
    data: departments = [],
    isLoading: departmentsLoading,
  } = useQuery({
    queryKey: ['my-permission-departments', orgId, user?.id],
    queryFn: async (): Promise<SopDepartment[]> => {
      if (!orgId || !user?.id) return [];
      const { data, error } = await supabase
        .from('sop_department_members')
        .select('department')
        .eq('organization_id', orgId)
        .eq('user_id', user.id);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((row) => row.department as SopDepartment)));
    },
    enabled: userRole === 'agent' && Boolean(orgId && user?.id),
    staleTime: 30_000,
  });

  const permissionDepartments = useMemo(
    () => (userRole === 'agent' ? departments : []),
    [departments, userRole],
  );

  const hasPermission = (permission: PermissionKey): boolean =>
    hasPermissionForRole(userRole, permissionDepartments, permission);

  const hasAnyPermission = (permissions: PermissionKey[]): boolean =>
    permissions.some(hasPermission);

  const hasAllPermissions = (permissions: PermissionKey[]): boolean =>
    permissions.every(hasPermission);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userRole,
    departments: permissionDepartments,
    loading: userRole === 'agent' && departmentsLoading,
    canViewCustomers: () => hasPermission('customers_view'),
    canCreateCustomers: () => hasPermission('customers_create'),
    canEditCustomers: () => hasPermission('customers_edit'),
    canDeleteCustomers: () => hasPermission('customers_delete'),
    canViewBookings: () => hasPermission('bookings_view'),
    canCreateBookings: () => hasPermission('bookings_create'),
    canEditBookings: () => hasPermission('bookings_edit'),
    canDeleteBookings: () => hasPermission('bookings_delete'),
    canConfirmBookings: () => hasPermission('bookings_confirm'),
    canCancelBookings: () => hasPermission('bookings_cancel'),
    canViewInvoices: () => hasPermission('invoices_view'),
    canCreateInvoices: () => hasPermission('invoices_create'),
    canEditInvoices: () => hasPermission('invoices_edit'),
    canDeleteInvoices: () => hasPermission('invoices_delete'),
    canSendInvoices: () => hasPermission('invoices_send'),
    canViewReports: () => hasPermission('reports_view'),
    canExportReports: () => hasPermission('reports_export'),
    canViewCRM: () => hasPermission('crm_view'),
    canCreateCRM: () => hasPermission('crm_create'),
    canEditCRM: () => hasPermission('crm_edit'),
    canManageCampaigns: () => hasPermission('crm_campaigns'),
    canManageSegments: () => hasPermission('crm_segments'),
    canViewPayments: () => hasPermission('payments_view'),
    canProcessPayments: () => hasPermission('payments_process'),
    canRefundPayments: () => hasPermission('payments_refund'),
    canViewTeam: () => hasPermission('team_view'),
    canInviteMembers: () => hasPermission('team_invite'),
    canManageRoles: () => hasPermission('team_manage_roles'),
  };
};
