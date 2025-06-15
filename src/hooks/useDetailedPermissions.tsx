
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface DetailedUserPermissions {
  id: string;
  user_id: string;
  // صلاحيات العملاء
  customers_view: boolean;
  customers_create: boolean;
  customers_edit: boolean;
  customers_delete: boolean;
  customers_export: boolean;
  // صلاحيات الحجوزات
  bookings_view: boolean;
  bookings_create: boolean;
  bookings_edit: boolean;
  bookings_delete: boolean;
  bookings_cancel: boolean;
  bookings_confirm: boolean;
  // صلاحيات الفواتير
  invoices_view: boolean;
  invoices_create: boolean;
  invoices_edit: boolean;
  invoices_delete: boolean;
  invoices_send: boolean;
  invoices_payment: boolean;
  // صلاحيات الموردين
  suppliers_view: boolean;
  suppliers_create: boolean;
  suppliers_edit: boolean;
  suppliers_delete: boolean;
  suppliers_contracts: boolean;
  // صلاحيات التقارير
  reports_financial: boolean;
  reports_sales: boolean;
  reports_operational: boolean;
  reports_export: boolean;
  reports_advanced: boolean;
  // صلاحيات الموظفين
  employees_view: boolean;
  employees_create: boolean;
  employees_edit: boolean;
  employees_delete: boolean;
  employees_salary: boolean;
  employees_commission: boolean;
  // صلاحيات المصروفات
  expenses_view: boolean;
  expenses_create: boolean;
  expenses_approve: boolean;
  expenses_reports: boolean;
  // صلاحيات إدارة النظام
  system_users: boolean;
  system_settings: boolean;
  system_backup: boolean;
  system_audit: boolean;
  // صلاحيات الحسابات البنكية
  banking_view: boolean;
  banking_transactions: boolean;
  banking_transfer: boolean;
  created_at: string;
  updated_at: string;
}

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

export const useDetailedPermissions = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // جلب مجموعات الصلاحيات باستخدام Raw SQL
  const { data: permissionGroups } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_permission_groups');
      if (error) throw error;
      return data as PermissionGroup[];
    },
  });

  // جلب تفاصيل الصلاحيات باستخدام Raw SQL
  const { data: permissionDetails } = useQuery({
    queryKey: ['permission-details'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_detailed_permissions');
      if (error) throw error;
      return data as PermissionDetail[];
    },
  });

  // جلب صلاحيات جميع المستخدمين
  const { data: allUserPermissions, isLoading, error } = useQuery({
    queryKey: ['detailed-user-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_user_permissions');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin(),
  });

  // جلب صلاحيات مستخدم محدد
  const getUserPermissions = (userId: string) => {
    return useQuery({
      queryKey: ['detailed-user-permissions', userId],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_user_permissions', { 
          p_user_id: userId 
        });
        if (error) throw error;
        return data as DetailedUserPermissions;
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
      permissions: Partial<DetailedUserPermissions> 
    }) => {
      const { data, error } = await supabase.rpc('update_user_permissions', {
        p_user_id: userId,
        p_permissions: permissions
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailed-user-permissions'] });
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
      const { data, error } = await supabase.rpc('create_default_permissions', {
        p_user_id: userId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailed-user-permissions'] });
      toast.success('تم إنشاء الصلاحيات للمستخدم');
    },
  });

  // تطبيق قالب صلاحيات
  const applyPermissionTemplate = async (userId: string, templateName: string) => {
    const templates = {
      'sales_agent': {
        customers_view: true,
        customers_create: true,
        customers_edit: true,
        bookings_view: true,
        bookings_create: true,
        bookings_edit: true,
        invoices_view: true,
        suppliers_view: true,
      },
      'accountant': {
        customers_view: true,
        bookings_view: true,
        invoices_view: true,
        invoices_create: true,
        invoices_edit: true,
        invoices_payment: true,
        reports_financial: true,
        expenses_view: true,
        expenses_approve: true,
        banking_view: true,
        banking_transactions: true,
      },
      'manager': {
        customers_view: true,
        customers_create: true,
        customers_edit: true,
        customers_delete: true,
        bookings_view: true,
        bookings_create: true,
        bookings_edit: true,
        bookings_delete: true,
        invoices_view: true,
        invoices_create: true,
        invoices_edit: true,
        suppliers_view: true,
        suppliers_create: true,
        suppliers_edit: true,
        reports_financial: true,
        reports_sales: true,
        reports_operational: true,
        employees_view: true,
        employees_edit: true,
        expenses_view: true,
        expenses_approve: true,
      },
      'viewer': {
        customers_view: true,
        bookings_view: true,
        invoices_view: true,
        suppliers_view: true,
        reports_financial: true,
        reports_sales: true,
        employees_view: true,
        expenses_view: true,
      }
    };

    const templatePermissions = templates[templateName as keyof typeof templates];
    if (templatePermissions) {
      await updatePermissionsMutation.mutateAsync({ userId, permissions: templatePermissions });
    }
  };

  return {
    permissionGroups,
    permissionDetails,
    allUserPermissions,
    isLoading,
    error,
    getUserPermissions,
    updatePermissions: updatePermissionsMutation.mutate,
    createPermissions: createPermissionsMutation.mutate,
    applyPermissionTemplate,
    isUpdating: updatePermissionsMutation.isPending,
    isCreating: createPermissionsMutation.isPending,
  };
};
