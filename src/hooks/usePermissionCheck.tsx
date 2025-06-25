
import { useUserPermissions } from './useUserPermissions';
import { useOptimizedAuth } from './useOptimizedAuth';

type PermissionKey = keyof Omit<import('./useUserPermissionsManagement').DetailedUserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const usePermissionCheck = () => {
  const { permissions } = useUserPermissions();
  const { isSuperAdmin } = useOptimizedAuth();

  const hasPermission = (permission: PermissionKey): boolean => {
    // السوبر أدمن له صلاحية على كل شيء
    if (isSuperAdmin()) return true;
    
    // إذا لم تحمل الصلاحيات بعد، منع الوصول
    if (!permissions) return false;
    
    return permissions[permission] === true;
  };

  const hasAnyPermission = (permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  };

  const hasAllPermissions = (permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  };
};
