
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

/**
 * @deprecated استخدم useCurrentEmployeeEnhanced بدلاً منه — يوفر fallback للمستخدم العادي
 * ومنطق shouldSaveBookingAgentId/getBookingAgentId الموحَّد عبر النظام.
 */
export const useCurrentEmployee = () => {
  const { user } = useOptimizedAuth();

  const { data: currentEmployee, isLoading, error } = useQuery({
    queryKey: ['current-employee', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('id', user.id)
        .single();

      if (!profile?.employee_id) return null;

      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', profile.employee_id)
        .single();

      if (error) {
        console.error('خطأ في جلب بيانات الموظف:', error);
        throw error;
      }

      return employee;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    currentEmployee,
    isLoading,
    error
  };
};
