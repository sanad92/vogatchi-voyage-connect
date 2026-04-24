import { useState, useEffect } from 'react';
import { useCurrentEmployeeFetch } from './user-employee-mapping/useCurrentEmployeeFetch';
import { useOptimizedAuth } from './useOptimizedAuth';

interface EnhancedCurrentEmployee {
  id: string;
  full_name: string;
  employee_code: string;
  email?: string;
  position?: string;
  is_active: boolean;
  isRealEmployee: boolean;
}

/**
 * Source of truth للموظف الحالي في الواجهات (booking forms, etc).
 * يوفر fallback للمستخدم العادي ومنطق shouldSaveBookingAgentId/getBookingAgentId.
 */
export const useCurrentEmployeeEnhanced = () => {
  const { user } = useOptimizedAuth();
  const { currentEmployee, isLoading, error } = useCurrentEmployeeFetch();
  const [enhancedEmployee, setEnhancedEmployee] = useState<EnhancedCurrentEmployee | null>(null);

  useEffect(() => {
    if (currentEmployee) {
      setEnhancedEmployee({
        ...currentEmployee,
        isRealEmployee: currentEmployee.employee_code !== 'USER',
      });
    } else if (user) {
      setEnhancedEmployee({
        id: user.id,
        full_name: user.email?.split('@')[0] || 'مستخدم غير محدد',
        employee_code: 'USER',
        email: user.email,
        is_active: true,
        isRealEmployee: false,
      });
    } else {
      setEnhancedEmployee(null);
    }
  }, [currentEmployee, user]);

  const shouldSaveBookingAgentId = () => enhancedEmployee?.isRealEmployee === true;
  const getBookingAgentId = () => (shouldSaveBookingAgentId() ? enhancedEmployee?.id : undefined);
  const getBookingAgentName = () => enhancedEmployee?.full_name || 'مستخدم غير محدد';

  return {
    currentEmployee: enhancedEmployee,
    isLoading,
    error,
    shouldSaveBookingAgentId,
    getBookingAgentId,
    getBookingAgentName,
    isRealEmployee: enhancedEmployee?.isRealEmployee || false,
  };
};
