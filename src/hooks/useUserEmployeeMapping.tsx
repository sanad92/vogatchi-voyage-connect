import { useCurrentEmployeeFetch } from './user-employee-mapping/useCurrentEmployeeFetch';
import { useLinkingOperations } from './user-employee-mapping/useLinkingOperations';
import { useOptimizedAuth } from './useOptimizedAuth';

/**
 * Hook خفيف لاستهلاك بيانات الموظف الحالي + عمليات الربط من نفس المكان.
 * المصدر الموحد: src/hooks/user-employee-mapping/*
 */
export const useUserEmployeeMapping = () => {
  const { user } = useOptimizedAuth();
  const { currentEmployee, isLoading, error, fetchCurrentEmployee } = useCurrentEmployeeFetch();
  const { linkUserToEmployee } = useLinkingOperations(fetchCurrentEmployee);

  const getCurrentEmployeeName = () =>
    currentEmployee?.full_name || user?.email || 'مستخدم غير محدد';
  const getCurrentEmployeeId = () => currentEmployee?.id || null;

  return {
    currentEmployee,
    isLoading,
    error,
    linkUserToEmployee,
    getCurrentEmployeeName,
    getCurrentEmployeeId,
    refetchCurrentEmployee: fetchCurrentEmployee,
  };
};
