
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LinkUserToEmployeeResponse, UnlinkUserFromEmployeeResponse } from './types';

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
          console.error('❌ خطأ في استدعاء دالة الربط:', error);
          throw new Error(error.message || 'خطأ في الاتصال بقاعدة البيانات');
        }

        console.log('📋 استجابة دالة الربط:', data);

        // Type cast the response safely
        const response = data as unknown as LinkUserToEmployeeResponse;

        // التحقق من نجاح العملية
        if (!response?.success) {
          const errorMessage = response?.message || 'فشل في ربط المستخدم بالموظف';
          console.error('❌ فشل في ربط المستخدم:', response);
          
          // رسائل خطأ مخصصة حسب نوع الخطأ
          switch (response?.error) {
            case 'USER_NOT_FOUND':
              throw new Error('المستخدم غير موجود في النظام');
            case 'EMPLOYEE_NOT_FOUND':
              throw new Error('الموظف غير موجود في النظام');
            case 'EMPLOYEE_INACTIVE':
              throw new Error('الموظف غير نشط حالياً');
            case 'EMPLOYEE_ALREADY_LINKED':
              throw new Error('هذا الموظف مرتبط بمستخدم آخر بالفعل');
            case 'UPDATE_FAILED':
              throw new Error('فشل في تحديث بيانات المستخدم');
            default:
              throw new Error(errorMessage);
          }
        }

        console.log('✅ تم ربط المستخدم بالموظف بنجاح');
        return response;
      } catch (error) {
        console.error('❌ خطأ في عملية الربط:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ نجح ربط المستخدم - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast.success(data?.message || 'تم ربط المستخدم بالموظف بنجاح');
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
          console.error('❌ خطأ في استدعاء دالة إلغاء الربط:', error);
          throw new Error(error.message || 'خطأ في الاتصال بقاعدة البيانات');
        }

        console.log('📋 استجابة دالة إلغاء الربط:', data);

        // Type cast the response safely
        const response = data as unknown as UnlinkUserFromEmployeeResponse;

        // التحقق من نجاح العملية
        if (!response?.success) {
          const errorMessage = response?.message || 'فشل في إلغاء ربط المستخدم من الموظف';
          console.error('❌ فشل في إلغاء ربط المستخدم:', response);
          
          // رسائل خطأ مخصصة حسب نوع الخطأ
          switch (response?.error) {
            case 'USER_NOT_FOUND':
              throw new Error('المستخدم غير موجود في النظام');
            case 'UPDATE_FAILED':
              throw new Error('فشل في تحديث بيانات المستخدم');
            default:
              throw new Error(errorMessage);
          }
        }

        console.log('✅ تم إلغاء ربط المستخدم من الموظف بنجاح');
        return response;
      } catch (error) {
        console.error('❌ خطأ في عملية إلغاء الربط:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ نجح إلغاء ربط المستخدم - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast.success(data?.message || 'تم إلغاء ربط المستخدم من الموظف بنجاح');
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

// Export a combined hook for backward compatibility
export const useLinkingMutations = () => {
  const linkMutation = useLinkUserToEmployeeMutation();
  const unlinkMutation = useUnlinkUserFromEmployeeMutation();
  const updateMutation = useUpdateUnifiedDataMutation();

  return {
    linkUserToEmployee: (params: { userId: string; employeeId: string }) => linkMutation.mutate(params),
    unlinkUserFromEmployee: (userId: string) => unlinkMutation.mutate(userId),
    updateUnifiedData: (data: any) => updateMutation.mutate(data),
    isLinking: linkMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};
