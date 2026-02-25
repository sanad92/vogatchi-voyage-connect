
import { useQueryClient } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUnifiedUsersQuery, useUnlinkedEmployeesQuery } from './queries';
import { useLinkingMutations } from './mutations';
import { toast } from 'sonner';

export const useUnifiedData = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const isOwner = isSuperAdmin();

  const {
    data: unifiedUsers,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useUnifiedUsersQuery(isOwner, organizationId);

  const {
    data: unlinkedEmployees,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees
  } = useUnlinkedEmployeesQuery(isOwner);

  const {
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating
  } = useLinkingMutations();

  const hasErrors = usersError || employeesError;
  const isLoading = usersLoading || employeesLoading;

  const refreshAllData = async (): Promise<void> => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['unified-users-employees'] });
      await queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      const [usersResult, employeesResult] = await Promise.allSettled([
        refetchUsers(),
        refetchEmployees()
      ]);
      
      if (usersResult.status === 'fulfilled' && employeesResult.status === 'fulfilled') {
        toast.success('تم تحديث البيانات بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث البيانات');
      throw error;
    }
  };

  const stats = {
    totalUsers: unifiedUsers?.length || 0,
    usersWithEmployees: unifiedUsers?.filter(u => u.employee).length || 0,
    usersWithoutEmployees: unifiedUsers?.filter(u => !u.employee).length || 0,
    unlinkedEmployees: unlinkedEmployees?.length || 0,
    hasData: (unifiedUsers?.length || 0) > 0 || (unlinkedEmployees?.length || 0) > 0
  };

  return {
    unifiedUsers: unifiedUsers || [],
    unlinkedEmployees: unlinkedEmployees || [],
    isLoading,
    usersLoading,
    employeesLoading,
    usersError,
    employeesError,
    hasErrors,
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating,
    refreshAllData,
    stats
  };
};
