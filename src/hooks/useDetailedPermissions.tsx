
import { usePermissionsData } from './usePermissionsData';
import { useUserPermissionsManagement } from './useUserPermissionsManagement';
import { usePermissionTemplates } from './usePermissionTemplates';

export type {
  DetailedUserPermissions,
  AllUserPermissions,
  PermissionGroup,
  PermissionDetail,
} from './useUserPermissionsManagement';

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

  return {
    permissionGroups,
    permissionDetails,
    allUserPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions,
    createPermissions,
    applyPermissionTemplate,
    isUpdating,
    isCreating,
  };
};
