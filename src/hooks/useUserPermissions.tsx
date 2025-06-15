
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DetailedUserPermissions } from './useUserPermissionsManagement';

export const useUserPermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_user_permissions', { 
        p_user_id: user.id 
      });
      
      if (error) throw error;
      return data?.[0] as DetailedUserPermissions;
    },
    enabled: !!user?.id,
  });

  return {
    permissions,
    isLoading,
    error,
  };
};
