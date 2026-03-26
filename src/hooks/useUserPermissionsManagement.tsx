import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizedAuth } from './useOptimizedAuth';

export interface DetailedUserPermissions {
  id: string;
  user_id: string;
  customers_view: boolean;
  customers_create: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  customers_export: boolean;
  bookings_view: boolean;
  bookings_create: boolean;
  bookings_edit: boolean;
  bookings_delete: boolean;
  bookings_cancel: boolean;
  bookings_confirm: boolean;
  invoices_view: boolean;
  invoices_create: boolean;
  invoices_edit: boolean;
  invoices_delete: boolean;
  invoices_send: boolean;
  invoices_payment: boolean;
  suppliers_view: boolean;
  suppliers_create: boolean;
  suppliers_edit: boolean;
  suppliers_delete: boolean;
  suppliers_contracts: boolean;
  reports_financial: boolean;
  reports_sales: boolean;
  reports_operational: boolean;
  reports_export: boolean;
  reports_advanced: boolean;
  employees_view: boolean;
  employees_create: boolean;
  employees_edit: boolean;
  employees_delete: boolean;
  employees_salary: boolean;
  employees_commission: boolean;
  expenses_view: boolean;
  expenses_create: boolean;
  expenses_approve: boolean;
  expenses_reports: boolean;
  system_users: boolean;
  system_settings: boolean;
  system_backup: boolean;
  system_audit: boolean;
  banking_view: boolean;
  banking_transactions: boolean;
  banking_transfer: boolean;
  created_at: string;
  updated_at: string;
}

export interface AllUserPermissions extends DetailedUserPermissions {
  email: string;
  full_name: string;
  is_active: boolean;
}

export type DetailedPermissionsPayload = Partial<
  Omit<DetailedUserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

const permissionsQueryKey = ['detailed-user-permissions'] as const;

export const useUserPermissionsManagement = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const queryClient = useQueryClient();

  const { data: allUserPermissions, isLoading, error } = useQuery({
    queryKey: permissionsQueryKey,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('get_all_user_permissions' as never);
      if (rpcError) throw rpcError;
      return (data ?? []) as unknown as AllUserPermissions[];
    },
    enabled: isSuperAdmin(),
  });

  const getUserPermissions = (userId: string) =>
    allUserPermissions?.find((permissions) => permissions.user_id === userId) ?? null;

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: DetailedPermissionsPayload;
    }) => {
      const { data, error: rpcError } = await supabase.rpc('update_user_permissions' as never, {
        p_user_id: userId,
        p_permissions: permissions,
      } as never);

      if (rpcError) throw rpcError;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: permissionsQueryKey });
      toast.success('تم تحديث الصلاحيات بنجاح');
    },
    onError: (mutationError: unknown) => {
      console.error('خطأ في تحديث الصلاحيات:', mutationError);
      toast.error('حدث خطأ أثناء تحديث الصلاحيات');
    },
  });

  const createPermissionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error: rpcError } = await supabase.rpc('create_default_permissions' as never, {
        p_user_id: userId,
      } as never);

      if (rpcError) throw rpcError;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: permissionsQueryKey });
      toast.success('تم إنشاء الصلاحيات للمستخدم');
    },
    onError: (mutationError: unknown) => {
      console.error('خطأ في إنشاء الصلاحيات الافتراضية:', mutationError);
      toast.error('حدث خطأ أثناء إنشاء الصلاحيات الافتراضية');
    },
  });

  return {
    allUserPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions: updatePermissionsMutation.mutateAsync,
    createPermissions: createPermissionsMutation.mutateAsync,
    isUpdating: updatePermissionsMutation.isPending,
    isCreating: createPermissionsMutation.isPending,
  };
};
