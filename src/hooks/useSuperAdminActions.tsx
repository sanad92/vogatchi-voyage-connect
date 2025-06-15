
import { useImpersonation } from "./useImpersonation";
import { useUserManagement } from "./useUserManagement";

export const useSuperAdminActions = () => {
  const impersonation = useImpersonation();
  const userManagement = useUserManagement();

  return {
    loginAsUser: impersonation.loginAsUser,
    endImpersonation: impersonation.endImpersonation,
    resetUserPassword: userManagement.resetUserPassword,
    createUser: userManagement.createUser,
    updateUserProfile: userManagement.updateUserProfile,
    isLoading: impersonation.isLoading || userManagement.isLoading
  };
};
