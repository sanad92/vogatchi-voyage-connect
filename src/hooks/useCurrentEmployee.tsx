
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentEmployee = () => {
  const { 
    data: currentEmployee, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('خطأ في جلب الملف الشخصي:', profileError);
        throw profileError;
      }

      return profile?.employee || null;
    },
    staleTime: 30000 // 30 seconds
  });

  return {
    currentEmployee,
    isLoading,
    error
  };
};
