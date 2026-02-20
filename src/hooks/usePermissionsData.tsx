
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from './useOptimizedAuth';

export interface PermissionGroup {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  color: string;
  is_active: boolean;
}

export interface PermissionDetail {
  id: string;
  permission_key: string;
  permission_name: string;
  permission_name_ar: string;
  description: string;
  group_id: string;
  is_active: boolean;
}

export const usePermissionsData = () => {
  const { isSuperAdmin } = useOptimizedAuth();

  // جلب مجموعات الصلاحيات
  const { data: permissionGroups } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_permission_groups' as any);
      if (error) throw error;
      return data as unknown as PermissionGroup[];
    },
    enabled: isSuperAdmin(),
  });

  // جلب تفاصيل الصلاحيات
  const { data: permissionDetails } = useQuery({
    queryKey: ['permission-details'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_detailed_permissions');
      if (error) throw error;
      return data as PermissionDetail[];
    },
    enabled: isSuperAdmin(),
  });

  return {
    permissionGroups,
    permissionDetails,
  };
};
