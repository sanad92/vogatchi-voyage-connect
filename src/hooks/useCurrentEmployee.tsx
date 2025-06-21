
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useCurrentEmployee = () => {
  const { profile } = useAuth();

  const { data: currentEmployee, isLoading } = useQuery({
    queryKey: ['current-employee', profile?.employee_id],
    queryFn: async () => {
      if (!profile?.employee_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', profile.employee_id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('خطأ في جلب بيانات الموظف الحالي:', error);
        throw error;
      }

      return data;
    },
    enabled: !!profile?.employee_id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    currentEmployee,
    isLoading
  };
};
