
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUnifiedUserData } from './useUnifiedUserData';
import { useUnifiedUserActions } from './useUnifiedUserActions';

export const useUnifiedUserEmployee = () => {
  const { isSuperAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // استخدام البيانات من hooks منفصلة
  const { unifiedUsers, isLoading: usersLoading, refetch } = useUnifiedUserData();
  const actions = useUnifiedUserActions();

  // جلب الموظفين غير المرتبطين بأي مستخدم
  const { data: unlinkedEmployees } = useQuery({
    queryKey: ['unlinked-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .not('id', 'in', `(SELECT employee_id FROM profiles WHERE employee_id IS NOT NULL)`)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin(),
  });

  return {
    unifiedUsers,
    unlinkedEmployees,
    isLoading: usersLoading || isLoading,
    refetch,
    ...actions,
  };
};
