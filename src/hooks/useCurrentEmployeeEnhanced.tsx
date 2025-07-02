
import { useState, useEffect } from 'react';
import { useUserEmployeeMapping } from './useUserEmployeeMapping';
import { useOptimizedAuth } from './useOptimizedAuth';

interface EnhancedCurrentEmployee {
  id: string;
  full_name: string;
  employee_code: string;
  email?: string;
  position?: string;
  is_active: boolean;
  isRealEmployee: boolean; // للتمييز بين الموظف الحقيقي والمستخدم العادي
}

export const useCurrentEmployeeEnhanced = () => {
  const { user } = useOptimizedAuth();
  const { currentEmployee, isLoading, error } = useUserEmployeeMapping();
  const [enhancedEmployee, setEnhancedEmployee] = useState<EnhancedCurrentEmployee | null>(null);

  useEffect(() => {
    if (currentEmployee) {
      // إذا كان هناك موظف مرتبط
      setEnhancedEmployee({
        ...currentEmployee,
        isRealEmployee: currentEmployee.employee_code !== "USER"
      });
    } else if (user) {
      // fallback للمستخدم العادي
      setEnhancedEmployee({
        id: user.id,
        full_name: user.email?.split('@')[0] || 'مستخدم غير محدد',
        employee_code: 'USER',
        email: user.email,
        is_active: true,
        isRealEmployee: false
      });
    } else {
      setEnhancedEmployee(null);
    }
  }, [currentEmployee, user]);

  // دالة لتحديد ما إذا كان يجب حفظ booking_agent_id
  const shouldSaveBookingAgentId = () => {
    return enhancedEmployee?.isRealEmployee === true;
  };

  // دالة للحصول على booking_agent_id للحفظ
  const getBookingAgentId = () => {
    return shouldSaveBookingAgentId() ? enhancedEmployee?.id : undefined;
  };

  // دالة للحصول على اسم الموظف للعرض
  const getBookingAgentName = () => {
    return enhancedEmployee?.full_name || 'مستخدم غير محدد';
  };

  return {
    currentEmployee: enhancedEmployee,
    isLoading,
    error,
    shouldSaveBookingAgentId,
    getBookingAgentId,
    getBookingAgentName,
    isRealEmployee: enhancedEmployee?.isRealEmployee || false
  };
};
