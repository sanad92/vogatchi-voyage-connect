
import { useImpersonation } from "./useImpersonation";
import { useUserManagement } from "./useUserManagement";

export const useSuperAdminActions = () => {
  console.log('🔄 useSuperAdminActions: تحميل المكون');
  
  const impersonation = useImpersonation();
  const userManagement = useUserManagement();

  console.log('📊 useSuperAdminActions: حالة المكونات:', {
    impersonationLoading: impersonation.isLoading,
    userManagementLoading: userManagement.isLoading,
    loginAsUser: typeof impersonation.loginAsUser,
    endImpersonation: typeof impersonation.endImpersonation,
    resetUserPassword: typeof userManagement.resetUserPassword,
    createUser: typeof userManagement.createUser,
    updateUserProfile: typeof userManagement.updateUserProfile
  });

  const actions = {
    loginAsUser: impersonation.loginAsUser,
    endImpersonation: impersonation.endImpersonation,
    resetUserPassword: userManagement.resetUserPassword,
    createUser: userManagement.createUser,
    updateUserProfile: userManagement.updateUserProfile,
    isLoading: impersonation.isLoading || userManagement.isLoading
  };

  console.log('✅ useSuperAdminActions: الإجراءات النهائية:', {
    actionsCount: Object.keys(actions).length,
    isLoading: actions.isLoading,
    allFunctionsAvailable: Object.entries(actions)
      .filter(([key]) => key !== 'isLoading')
      .every(([, value]) => typeof value === 'function')
  });

  return actions;
};
