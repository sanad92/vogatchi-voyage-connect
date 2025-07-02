
import { useQueryClient } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useUnifiedUsersQuery, useUnlinkedEmployeesQuery } from './queries';
import { useLinkingMutations } from './mutations';
import { toast } from 'sonner';

export const useUnifiedData = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const isSuperAdminUser = isSuperAdmin();

  // الـ queries الأساسية
  const {
    data: unifiedUsers,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useUnifiedUsersQuery(isSuperAdminUser);

  const {
    data: unlinkedEmployees,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees
  } = useUnlinkedEmployeesQuery(isSuperAdminUser);

  // الـ mutations
  const {
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating
  } = useLinkingMutations();

  // التحقق من الأخطاء وعرض رسائل مفيدة
  const hasErrors = usersError || employeesError;
  const isLoading = usersLoading || employeesLoading;

  // دالة تحديث شاملة محسنة
  const refreshAllData = async (): Promise<void> => {
    try {
      console.log('🔄 بدء تحديث جميع البيانات...');
      
      // إنعاش الـ cache أولاً
      await queryClient.invalidateQueries({ 
        queryKey: ['unified-users-employees-all'] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['unlinked-employees-all'] 
      });
      
      // إعادة جلب البيانات
      const [usersResult, employeesResult] = await Promise.allSettled([
        refetchUsers(),
        refetchEmployees()
      ]);
      
      // التحقق من النتائج
      if (usersResult.status === 'rejected') {
        console.error('❌ فشل في تحديث بيانات المستخدمين:', usersResult.reason);
        toast.error('فشل في تحديث بيانات المستخدمين');
      }
      
      if (employeesResult.status === 'rejected') {
        console.error('❌ فشل في تحديث بيانات الموظفين:', employeesResult.reason);
        toast.error('فشل في تحديث بيانات الموظفين');
      }
      
      if (usersResult.status === 'fulfilled' && employeesResult.status === 'fulfilled') {
        console.log('✅ تم تحديث جميع البيانات بنجاح');
        toast.success('تم تحديث البيانات بنجاح');
      }
      
    } catch (error) {
      console.error('❌ خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
      throw error;
    }
  };

  // تحسين معالجة الأخطاء مع تفاصيل أكثر
  if (hasErrors) {
    console.log('⚠️ تفاصيل الأخطاء:', {
      usersError: usersError?.message || usersError,
      employeesError: employeesError?.message || employeesError,
      isSuperAdmin: isSuperAdminUser
    });
  }

  // إحصائيات محسنة
  const stats = {
    totalUsers: unifiedUsers?.length || 0,
    usersWithEmployees: unifiedUsers?.filter(u => u.employee).length || 0,
    usersWithoutEmployees: unifiedUsers?.filter(u => !u.employee).length || 0,
    unlinkedEmployees: unlinkedEmployees?.length || 0,
    hasData: (unifiedUsers?.length || 0) > 0 || (unlinkedEmployees?.length || 0) > 0
  };

  // طباعة معلومات تشخيصية
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 إحصائيات البيانات الموحدة:', {
      ...stats,
      isLoading,
      hasErrors,
      isSuperAdmin: isSuperAdminUser
    });
  }

  return {
    // البيانات
    unifiedUsers: unifiedUsers || [],
    unlinkedEmployees: unlinkedEmployees || [],
    
    // حالات التحميل
    isLoading,
    usersLoading,
    employeesLoading,
    
    // الأخطاء
    usersError,
    employeesError,
    hasErrors,
    
    // العمليات
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating,
    refreshAllData,
    
    // الإحصائيات
    stats
  };
};
