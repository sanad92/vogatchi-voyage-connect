
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { useUnifiedUsersQuery, useUnlinkedEmployeesQuery } from './queries';
import { 
  useLinkUserToEmployeeMutation, 
  useUnlinkUserFromEmployeeMutation, 
  useUpdateUnifiedDataMutation 
} from './mutations';

export const useUnifiedData = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // استعلامات البيانات
  const { 
    data: unifiedUsers, 
    isLoading: usersLoading, 
    error: usersError, 
    refetch: refetchUsers 
  } = useUnifiedUsersQuery(isSuperAdmin());

  const { 
    data: unlinkedEmployees, 
    isLoading: employeesLoading 
  } = useUnlinkedEmployeesQuery(isSuperAdmin());

  // العمليات
  const linkUserToEmployeeMutation = useLinkUserToEmployeeMutation();
  const unlinkUserFromEmployeeMutation = useUnlinkUserFromEmployeeMutation();
  const updateUnifiedDataMutation = useUpdateUnifiedDataMutation();

  // إعادة تحديث جميع البيانات
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
    queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
    queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  return {
    // البيانات
    unifiedUsers,
    unlinkedEmployees,
    
    // حالات التحميل
    isLoading: usersLoading || employeesLoading,
    usersLoading,
    employeesLoading,
    usersError,
    
    // الإجراءات
    linkUserToEmployee: linkUserToEmployeeMutation.mutate,
    unlinkUserFromEmployee: unlinkUserFromEmployeeMutation.mutate,
    updateUnifiedData: updateUnifiedDataMutation.mutate,
    refreshAllData,
    refetchUsers,
    
    // حالات الإجراءات
    isLinking: linkUserToEmployeeMutation.isPending,
    isUnlinking: unlinkUserFromEmployeeMutation.isPending,
    isUpdating: updateUnifiedDataMutation.isPending,
  };
};
