import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLinkingMutations } from './mutations';
import { useUnifiedUsersQuery, useUnlinkedEmployeesQuery } from './queries';

export const useUnifiedData = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const canManageUnifiedData = isSuperAdmin();

  const {
    data: unifiedUsers,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useUnifiedUsersQuery(canManageUnifiedData, organizationId);

  const {
    data: unlinkedEmployees,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useUnlinkedEmployeesQuery(canManageUnifiedData, organizationId);

  const {
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating,
  } = useLinkingMutations();

  const hasErrors = usersError || employeesError;
  const isLoading = usersLoading || employeesLoading;

  const refreshAllData = async (): Promise<void> => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['unified-users-employees'] });
      await queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });

      const [usersResult, employeesResult] = await Promise.allSettled([
        refetchUsers(),
        refetchEmployees(),
      ]);

      if (usersResult.status === 'fulfilled' && employeesResult.status === 'fulfilled') {
        toast.success('تم تحديث البيانات بنجاح');
      }
    } catch (refreshError) {
      toast.error('حدث خطأ أثناء تحديث البيانات');
      throw refreshError;
    }
  };

  const safeUnifiedUsers = unifiedUsers ?? [];
  const safeUnlinkedEmployees = unlinkedEmployees ?? [];

  const stats = {
    totalUsers: safeUnifiedUsers.length,
    usersWithEmployees: safeUnifiedUsers.filter((user) => user.employee).length,
    usersWithoutEmployees: safeUnifiedUsers.filter((user) => !user.employee).length,
    unlinkedEmployees: safeUnlinkedEmployees.length,
    hasData: safeUnifiedUsers.length > 0 || safeUnlinkedEmployees.length > 0,
  };

  return {
    unifiedUsers: safeUnifiedUsers,
    unlinkedEmployees: safeUnlinkedEmployees,
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
    stats,
  };
};
