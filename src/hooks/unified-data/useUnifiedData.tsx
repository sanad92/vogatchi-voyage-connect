
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedUsersQuery, useUnlinkedEmployeesQuery } from './queries';
import { useLinkUserToEmployeeMutation, useUnlinkUserFromEmployeeMutation } from './mutations';

export const useUnifiedData = () => {
  const { isSuperAdmin } = useAuth();
  
  // Queries
  const {
    data: unifiedUsers,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useUnifiedUsersQuery(isSuperAdmin());

  const {
    data: unlinkedEmployees,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees
  } = useUnlinkedEmployeesQuery(isSuperAdmin());

  // Mutations
  const linkMutation = useLinkUserToEmployeeMutation();
  const unlinkMutation = useUnlinkUserFromEmployeeMutation();

  // Helper functions
  const refreshAllData = async () => {
    console.log('🔄 تحديث جميع البيانات الموحدة...');
    await Promise.all([
      refetchUsers(),
      refetchEmployees()
    ]);
    console.log('✅ تم تحديث جميع البيانات الموحدة بنجاح');
  };

  const linkUserToEmployee = (params: { userId: string; employeeId: string }) => {
    console.log('🔗 بدء ربط المستخدم بالموظف من useUnifiedData:', params);
    linkMutation.mutate(params);
  };

  const unlinkUserFromEmployee = (userId: string) => {
    console.log('🔗 بدء إلغاء ربط المستخدم من الموظف من useUnifiedData:', userId);
    unlinkMutation.mutate(userId);
  };

  return {
    // Data
    unifiedUsers,
    unlinkedEmployees,
    
    // Loading states
    isLoading: usersLoading || employeesLoading,
    usersLoading,
    employeesLoading,
    
    // Error states
    usersError,
    employeesError,
    
    // Mutation states
    isLinking: linkMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
    
    // Actions
    linkUserToEmployee,
    unlinkUserFromEmployee,
    refreshAllData,
    
    // Refetch functions
    refetchUsers,
    refetchEmployees,
  };
};
