
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  // بيانات الموظف (إذا كان مرتبطاً)
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

export const useUnifiedUserEmployee = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // جلب جميع المستخدمين مع بيانات الموظفين المرتبطة
  const { data: unifiedUsers, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['unified-users-employees'],
    queryFn: async () => {
      console.log('🔄 جاري جلب المستخدمين والموظفين...');
      
      try {
        // جلب المستخدمين مع الأدوار والموظفين المرتبطين
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

        // تحويل البيانات للصيغة المطلوبة
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
  });

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
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees'] });
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
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees'] });
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
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees'] });
      toast.success('تم تحديث البيانات بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    },
  });

  return {
    unifiedUsers,
    unlinkedEmployees,
    isLoading: usersLoading || isLoading,
    linkUserToEmployee: linkUserToEmployeeMutation.mutate,
    unlinkUserFromEmployee: unlinkUserFromEmployeeMutation.mutate,
    updateUnifiedData: updateUnifiedDataMutation.mutate,
    isLinking: linkUserToEmployeeMutation.isPending,
    isUnlinking: unlinkUserFromEmployeeMutation.isPending,
    isUpdating: updateUnifiedDataMutation.isPending,
    refetch,
  };
};
