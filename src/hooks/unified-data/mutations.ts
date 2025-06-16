
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLinkUserToEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string }) => {
      console.log('🔗 بدء ربط المستخدم بالموظف:', { userId, employeeId });
      
      try {
        const { data, error } = await supabase.rpc('link_user_to_employee', {
          p_user_id: userId,
          p_employee_id: employeeId
        });

        if (error) {
          console.error('❌ خطأ في ربط المستخدم بالموظف:', error);
          throw error;
        }

        if (!data) {
          throw new Error('فشل في ربط المستخدم بالموظف');
        }

        console.log('✅ تم ربط المستخدم بالموظف بنجاح');
        return data;
      } catch (error) {
        console.error('❌ خطأ في عملية الربط:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('✅ نجح ربط المستخدم - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast.success('تم ربط المستخدم بالموظف بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في ربط المستخدم بالموظف:', error);
      const errorMessage = error?.message || 'حدث خطأ أثناء ربط المستخدم بالموظف';
      toast.error(errorMessage);
    },
  });
};

export const useUnlinkUserFromEmployeeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      console.log('🔗 بدء إلغاء ربط المستخدم من الموظف:', userId);
      
      try {
        const { data, error } = await supabase.rpc('unlink_user_from_employee', {
          p_user_id: userId
        });

        if (error) {
          console.error('❌ خطأ في إلغاء ربط المستخدم من الموظف:', error);
          throw error;
        }

        if (!data) {
          throw new Error('فشل في إلغاء ربط المستخدم من الموظف');
        }

        console.log('✅ تم إلغاء ربط المستخدم من الموظف بنجاح');
        return data;
      } catch (error) {
        console.error('❌ خطأ في عملية إلغاء الربط:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('✅ نجح إلغاء ربط المستخدم - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast.success('تم إلغاء ربط المستخدم من الموظف بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في إلغاء ربط المستخدم من الموظف:', error);
      const errorMessage = error?.message || 'حدث خطأ أثناء إلغاء ربط المستخدم من الموظف';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateUnifiedDataMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      console.log('🔄 تحديث البيانات الموحدة:', data);
      // هذه دالة عامة لتحديث البيانات حسب الحاجة
      return data;
    },
    onSuccess: () => {
      // تحديث جميع الـ caches
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};
