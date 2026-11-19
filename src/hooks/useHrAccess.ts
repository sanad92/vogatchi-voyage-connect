import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import type { PermissionKey } from '@/lib/accessControl';

export function useHrAccess() {
  const { getPermissionScope, hasPermission, loading } = useSupabasePermissions();
  const can = (permission: PermissionKey) => hasPermission(permission) && getPermissionScope(permission) === 'organization';

  return {
    loading,
    canViewFiles: can('employees_view'),
    canCreateFiles: can('employees_create'),
    canEditFiles: can('employees_edit'),
    canDeleteFiles: can('employees_delete'),
    canViewAttendance: can('employees_attendance_view'),
    canEditAttendance: can('employees_attendance_edit'),
    canManagePayroll: can('employees_salary'),
    canManageCommissions: can('employees_commission'),
  };
}
