import { useState, useEffect } from 'react';
import { useCurrentEmployeeFetch } from './user-employee-mapping/useCurrentEmployeeFetch';
import { useOptimizedAuth } from './useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const [profileName, setProfileName] = useState<string | null>(null);

  // Fallback: لو مفيش موظف مربوط، نجيب الاسم من profile.full_name بدل جزء الإيميل
  useEffect(() => {
    if (currentEmployee || !user?.id) {
      setProfileName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled && data?.full_name) {
        setProfileName(data.full_name);
      }
    })();
    return () => { cancelled = true; };
  }, [currentEmployee, user?.id]);

  useEffect(() => {
    if (currentEmployee) {
      setEnhancedEmployee({
        ...currentEmployee,
        isRealEmployee: currentEmployee.employee_code !== 'USER',
      });
    } else if (user) {
      const fallbackName =
        profileName ||
        (user as any).user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'مستخدم غير محدد';
      setEnhancedEmployee({
        id: user.id,
        full_name: fallbackName,
        employee_code: 'USER',
        email: user.email,
        is_active: true,
        isRealEmployee: false,
      });
    } else {
      setEnhancedEmployee(null);
    }
  }, [currentEmployee, user, profileName]);

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
