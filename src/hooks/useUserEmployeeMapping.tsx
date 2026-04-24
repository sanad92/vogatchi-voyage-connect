
import { useCurrentEmployeeFetch } from './user-employee-mapping/useCurrentEmployeeFetch';
import { useLinkingOperations } from './user-employee-mapping/useLinkingOperations';
import { useOptimizedAuth } from './useOptimizedAuth';

/**
 * @deprecated للاستهلاك في الواجهات استخدم useCurrentEmployeeEnhanced.
 * لعمليات الربط/التحديث الإداري استخدم useUnifiedUserEmployee.
 */
export const useUserEmployeeMapping = () => {
  const { user } = useOptimizedAuth();
  const {
    currentEmployee,
    isLoading,
    error,
    fetchCurrentEmployee
  } = useCurrentEmployeeFetch();

  const { linkUserToEmployee } = useLinkingOperations(fetchCurrentEmployee);

  // الحصول على اسم الموظف الحالي
  const getCurrentEmployeeName = () => {
    return currentEmployee?.full_name || user?.email || 'مستخدم غير محدد';
  };

  // الحصول على معرف الموظف الحالي
  const getCurrentEmployeeId = () => {
    return currentEmployee?.id || null;
  };

  return {
    currentEmployee,
    isLoading,
    error,
    linkUserToEmployee,
    getCurrentEmployeeName,
    getCurrentEmployeeId,
    refetchCurrentEmployee: fetchCurrentEmployee
  };
};
