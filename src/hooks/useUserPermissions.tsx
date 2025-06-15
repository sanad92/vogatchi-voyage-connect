
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface UserPermissions {
  id: string;
  user_id: string;
  customers_read: boolean;
  customers_write: boolean;
  bookings_read: boolean;
  bookings_write: boolean;
  suppliers_read: boolean;
  suppliers_write: boolean;
  invoices_read: boolean;
  invoices_write: boolean;
  reports_read: boolean;
  reports_write: boolean;
  employees_read: boolean;
  employees_write: boolean;
  expenses_read: boolean;
  expenses_write: boolean;
  users_read: boolean;
  users_write: boolean;
  settings_read: boolean;
  settings_write: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserPermissions = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // جلب صلاحيات جميع المستخدمين
  const { data: allPermissions, isLoading, error } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`
          *,
          profiles!user_permissions_user_id_fkey(
            id,
            email,
            full_name,
            is_active
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin(),
  });

  // جلب صلاحيات مستخدم محدد
  const getUserPermissions = (userId: string) => {
    return useQuery({
      queryKey: ['user-permissions', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) throw error;
        return data as UserPermissions;
      },
      enabled: !!userId,
    });
  };

  // تحديث صلاحيات مستخدم
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: Partial<UserPermissions> 
    }) => {
      const { data, error } = await supabase
        .from('user_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('تم تحديث الصلاحيات بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في تحديث الصلاحيات:', error);
      toast.error('حدث خطأ أثناء تحديث الصلاحيات');
    },
  });

  // إنشاء صلاحيات افتراضية لمستخدم جديد
  const createPermissionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_permissions')
        .insert([{ user_id: userId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('تم إنشاء الصلاحيات للمستخدم');
    },
  });

  // التحقق من صلاحية معينة
  const checkPermission = async (userId: string, permissionType: string, accessType: 'read' | 'write') => {
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_permission_type: permissionType,
      p_access_type: accessType
    });
    
    if (error) {
      console.error('خطأ في التحقق من الصلاحية:', error);
      return false;
    }
    
    return data;
  };

  return {
    allPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions: updatePermissionsMutation.mutate,
    createPermissions: createPermissionsMutation.mutate,
    checkPermission,
    isUpdating: updatePermissionsMutation.isPending,
    isCreating: createPermissionsMutation.isPending,
  };
};
