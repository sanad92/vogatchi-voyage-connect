
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { LinkUserToEmployeeResponse } from '../unified-data/types';

export const useLinkingOperations = (refetchCurrentEmployee: () => Promise<void>) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ربط مستخدم بموظف باستخدام الدالة المحسنة
  const linkUserToEmployee = async (employeeId: string) => {
    if (!user?.id) {
      toast.error('المستخدم غير مسجل الدخول');
      return false;
    }

    try {
      console.log('🔄 بدء ربط المستخدم بالموظف:', { userId: user.id, employeeId });
      
      const { data, error } = await supabase.rpc('link_user_to_employee', {
        p_user_id: user.id,
        p_employee_id: employeeId
      });

      if (error) {
        console.error('Error linking user to employee:', error);
        toast.error('خطأ في الاتصال بقاعدة البيانات: ' + error.message);
        return false;
      }

      const response = data as unknown as LinkUserToEmployeeResponse;

      if (!response?.success) {
        console.error('فشل في ربط المستخدم بالموظف:', response);
        
        let errorMessage = response?.message || 'فشل في ربط المستخدم بالموظف';
        switch (response?.error) {
          case 'USER_NOT_FOUND':
            errorMessage = 'المستخدم غير موجود في النظام';
            break;
          case 'EMPLOYEE_NOT_FOUND':
            errorMessage = 'الموظف غير موجود في النظام';
            break;
          case 'EMPLOYEE_INACTIVE':
            errorMessage = 'الموظف غير نشط حالياً';
            break;
          case 'EMPLOYEE_ALREADY_LINKED':
            errorMessage = 'هذا الموظف مرتبط بمستخدم آخر بالفعل';
            break;
        }
        
        toast.error(errorMessage);
        return false;
      }

      console.log('✅ تم ربط المستخدم بالموظف بنجاح:', response);
      toast.success(response.message || 'تم ربط المستخدم بالموظف بنجاح');
      
      await refetchCurrentEmployee();
      
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      return true;
    } catch (error) {
      console.error('Error in linkUserToEmployee:', error);
      toast.error('حدث خطأ أثناء ربط المستخدم بالموظف');
      return false;
    }
  };

  return {
    linkUserToEmployee
  };
};
