
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLinkUserToEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
};

export const useUnlinkUserFromEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
};

export const useUpdateUnifiedDataMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
};
