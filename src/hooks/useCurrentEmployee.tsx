
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useCurrentEmployee = () => {
  const { user } = useAuth();

  const { data: currentEmployee, isLoading } = useQuery({
    queryKey: ['current-employee', user?.id],
    queryFn: async () => {
      if (!user?.email) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current employee:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.email
  });

  return {
    currentEmployee,
    isLoading
  };
};
