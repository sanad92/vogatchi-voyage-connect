import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import type { SopDepartment } from '@/lib/sop';
import {
  hasPermissionForRole,
  type PermissionKey,
} from '@/lib/accessControl';
import {
  companyPermissionGranted,
  companyPermissionScope,
  normalizeCompanyPermissionProfile,
  type PermissionDataScope,
  type CompanyPermissionProfile,
} from '@/lib/companyPermissions';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export type { PermissionKey } from '@/lib/accessControl';

export const useSupabasePermissions = () => {
  const { user, userRole } = useOptimizedAuth();
  const orgId = useOrgId();
  const { loading: organizationLoading } = useOrganization();

  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsFailed,
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

  const {
    data: companyPermissionProfile = null,
    isLoading: companyPermissionsLoading,
    isError: companyPermissionsFailed,
    error: companyPermissionsError,
  } = useQuery<CompanyPermissionProfile | null>({
    queryKey: ['my-company-permission-profile', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      const { data, error } = await callUntypedRpc<unknown>('get_org_permission_profile', {
        _org_id: orgId,
      });
      if (error) throw error;
      return normalizeCompanyPermissionProfile(data);
    },
    enabled: Boolean(orgId && user?.id && !organizationLoading),
    staleTime: 30_000,
  });

  const permissionDepartments = useMemo(
    () => (userRole === 'agent' ? departments : []),
    [departments, userRole],
  );

  // During rollout, an older database may not have the new RPC yet. In that
  // narrow case keep the legacy role/department resolver until the migration
  // is applied; all other profile errors fail closed.
  const profileErrorMessage = companyPermissionsError instanceof Error
    ? companyPermissionsError.message
    : typeof companyPermissionsError === 'object' && companyPermissionsError !== null && 'message' in companyPermissionsError
      ? String((companyPermissionsError as { message?: unknown }).message ?? '')
      : '';
  const profileFunctionMissing = companyPermissionsFailed && /42883|does not exist|Could not find the function/i.test(profileErrorMessage);
  const permissionsUnavailable = !user || !orgId || organizationLoading ||
    (userRole === 'agent' && (departmentsLoading || departmentsFailed)) ||
    (companyPermissionsLoading && !profileFunctionMissing) ||
    (companyPermissionsFailed && !profileFunctionMissing);

  const hasPermission = (permission: PermissionKey): boolean => {
    if (permissionsUnavailable) return false;
    const companyDecision = companyPermissionGranted(companyPermissionProfile, permission);
    return companyDecision ?? hasPermissionForRole(userRole, permissionDepartments, permission);
  };

  const getPermissionScope = (permission: PermissionKey): PermissionDataScope => {
    if (companyPermissionProfile) return companyPermissionScope(companyPermissionProfile, permission);
    return hasPermission(permission) ? 'organization' : 'none';
  };

  const hasAnyPermission = (permissions: PermissionKey[]): boolean =>
    permissions.some(hasPermission);

  const hasAllPermissions = (permissions: PermissionKey[]): boolean =>
    permissions.every(hasPermission);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionScope,
    userRole,
    departments: permissionDepartments,
    loading: organizationLoading || (userRole === 'agent' && departmentsLoading),
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
