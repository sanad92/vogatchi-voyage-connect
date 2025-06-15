
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate: number;
    bank_name?: string;
    bank_account_number?: string;
    national_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
}

export interface UnlinkedEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  hire_date: string;
  base_salary: number;
  allowances: number;
  commission_rate: number;
  is_active: boolean;
}

export const useUnifiedData = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // جلب البيانات الموحدة للمستخدمين والموظفين
  const { data: unifiedUsers, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['unified-users-employees-all'],
    queryFn: async () => {
      console.log('🔄 جاري جلب البيانات الموحدة...');
      
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            *,
            user_roles!inner(role),
            employees(*)
          `)
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('❌ خطأ في جلب البيانات:', profilesError);
          throw profilesError;
        }

        const unified = profilesData?.map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          department: profile.department,
          is_active: profile.is_active,
          role: Array.isArray(profile.user_roles) && profile.user_roles.length > 0 
            ? profile.user_roles[0].role 
            : 'no_role',
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          employee: profile.employees ? {
            id: profile.employees.id,
            employee_code: profile.employees.employee_code,
            position: profile.employees.position,
            hire_date: profile.employees.hire_date,
            base_salary: profile.employees.base_salary,
            allowances: profile.employees.allowances,
            commission_rate: profile.employees.commission_rate,
            bank_name: profile.employees.bank_name,
            bank_account_number: profile.employees.bank_account_number,
            national_id: profile.employees.national_id,
            emergency_contact_name: profile.employees.emergency_contact_name,
            emergency_contact_phone: profile.employees.emergency_contact_phone,
          } : undefined
        })) || [];

        console.log('✅ تم جلب البيانات الموحدة:', unified.length);
        return unified as UnifiedUser[];
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات الموحدة:', error);
        toast.error('حدث خطأ في جلب بيانات المستخدمين والموظفين');
        throw error;
      }
    },
    enabled: isSuperAdmin(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // جلب الموظفين غير المرتبطين
  const { data: unlinkedEmployees, isLoading: employeesLoading } = useQuery({
    queryKey: ['unlinked-employees-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .not('id', 'in', `(SELECT employee_id FROM profiles WHERE employee_id IS NOT NULL)`)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as UnlinkedEmployee[];
    },
    enabled: isSuperAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  // ربط مستخدم بموظف
  const linkUserToEmployeeMutation = useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string }) => {
      const { data, error } = await supabase.rpc('link_user_to_employee', {
        p_user_id: userId,
        p_employee_id: employeeId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // تحديث جميع الـ caches المتعلقة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم ربط المستخدم بالموظف بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في ربط المستخدم بالموظف:', error);
      toast.error(error.message || 'حدث خطأ أثناء ربط المستخدم بالموظف');
    },
  });

  // إلغاء ربط مستخدم من موظف
  const unlinkUserFromEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('unlink_user_from_employee', {
        p_user_id: userId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم إلغاء ربط المستخدم من الموظف بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في إلغاء ربط المستخدم من الموظف:', error);
      toast.error(error.message || 'حدث خطأ أثناء إلغاء ربط المستخدم من الموظف');
    },
  });

  // تحديث بيانات مستخدم/موظف
  const updateUnifiedDataMutation = useMutation({
    mutationFn: async ({ userId, userData, employeeData }: {
      userId: string;
      userData?: Partial<{
        full_name: string;
        email: string;
        phone: string;
        department: string;
        is_active: boolean;
      }>;
      employeeData?: Partial<{
        position: string;
        base_salary: number;
        allowances: number;
        commission_rate: number;
        bank_name: string;
        bank_account_number: string;
        national_id: string;
        emergency_contact_name: string;
        emergency_contact_phone: string;
      }>;
    }) => {
      // تحديث بيانات المستخدم
      if (userData) {
        const { error: userError } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', userId);
        
        if (userError) throw userError;
      }

      // تحديث بيانات الموظف إذا كان مرتبطاً
      if (employeeData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('id', userId)
          .single();
        
        if (profile?.employee_id) {
          const { error: employeeError } = await supabase
            .from('employees')
            .update(employeeData)
            .eq('id', profile.employee_id);
          
          if (employeeError) throw employeeError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('تم تحديث البيانات بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    },
  });

  // إعادة تحديث جميع البيانات
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
    queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
    queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  return {
    // البيانات
    unifiedUsers,
    unlinkedEmployees,
    
    // حالات التحميل
    isLoading: usersLoading || employeesLoading,
    usersLoading,
    employeesLoading,
    usersError,
    
    // الإجراءات
    linkUserToEmployee: linkUserToEmployeeMutation.mutate,
    unlinkUserFromEmployee: unlinkUserFromEmployeeMutation.mutate,
    updateUnifiedData: updateUnifiedDataMutation.mutate,
    refreshAllData,
    refetchUsers,
    
    // حالات الإجراءات
    isLinking: linkUserToEmployeeMutation.isPending,
    isUnlinking: unlinkUserFromEmployeeMutation.isPending,
    isUpdating: updateUnifiedDataMutation.isPending,
  };
};
