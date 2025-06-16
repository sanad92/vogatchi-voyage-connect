
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EmployeeActionResponse {
  success: boolean;
  message: string;
  employee_name?: string;
  can_force_delete?: boolean;
  blocking_reasons?: string[];
  dependencies_count?: number;
}

export const useEmployeeActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isSuperAdmin, hasRole } = useAuth();
  const queryClient = useQueryClient();

  // تفعيل/إيقاف الموظف
  const toggleEmployeeStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);
      console.log(`🔄 ${isActive ? 'تفعيل' : 'إيقاف'} الموظف:`, { employeeId, isActive, reason });

      const { data, error } = await supabase.rpc('toggle_employee_status', {
        p_employee_id: employeeId,
        p_is_active: isActive,
        p_reason: reason
      });

      if (error) {
        console.error('❌ خطأ في تغيير حالة الموظف:', error);
        toast.error(`فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      const response = data as EmployeeActionResponse;

      if (!response?.success) {
        console.error('❌ فشل في تغيير حالة الموظف:', response);
        toast.error(response?.message || `فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
        return { success: false, error: response?.message };
      }

      console.log('✅ تم تغيير حالة الموظف بنجاح');
      
      // تحديث البيانات في الـ cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      console.error('💥 خطأ في تغيير حالة الموظف:', error);
      toast.error(`حدث خطأ أثناء ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // التحقق من إمكانية حذف الموظف
  const checkEmployeeDeletion = async (employeeId: string) => {
    try {
      console.log('🔍 فحص إمكانية حذف الموظف:', employeeId);

      const { data, error } = await supabase.rpc('check_employee_deletion', {
        p_employee_id: employeeId
      });

      if (error) {
        console.error('❌ خطأ في فحص إمكانية الحذف:', error);
        return { success: false, error: error.message };
      }

      const response = data as EmployeeActionResponse & {
        can_delete_safely: boolean;
        dependencies_count: number;
        linked_to_user: boolean;
        has_bookings: boolean;
        has_commissions: boolean;
        has_expenses: boolean;
      };

      console.log('✅ نتيجة فحص إمكانية الحذف:', response);
      return { success: true, data: response };

    } catch (error: any) {
      console.error('💥 خطأ في فحص إمكانية الحذف:', error);
      return { success: false, error: error.message };
    }
  };

  // حذف الموظف
  const deleteEmployee = async (employeeId: string, forceDelete = false, reason?: string) => {
    if (!isSuperAdmin()) {
      toast.error('ليس لديك صلاحية لحذف الموظفين - السوبر أدمن فقط');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);
      console.log('🗑️ بدء حذف الموظف:', { employeeId, forceDelete, reason });

      const { data, error } = await supabase.rpc('safe_delete_employee', {
        p_employee_id: employeeId,
        p_force_delete: forceDelete,
        p_reason: reason
      });

      if (error) {
        console.error('❌ خطأ في حذف الموظف:', error);
        toast.error(`فشل في حذف الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      const response = data as EmployeeActionResponse;

      if (!response?.success) {
        console.error('❌ فشل في حذف الموظف:', response);
        
        if (response.can_force_delete && response.blocking_reasons) {
          return { 
            success: false, 
            error: response.message,
            canForceDelete: true,
            blockingReasons: response.blocking_reasons
          };
        }
        
        toast.error(response?.message || 'فشل في حذف الموظف');
        return { success: false, error: response?.message };
      }

      console.log('✅ تم حذف الموظف بنجاح');
      
      // تحديث البيانات في الـ cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      console.error('💥 خطأ في حذف الموظف:', error);
      toast.error('حدث خطأ أثناء حذف الموظف');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    toggleEmployeeStatus,
    checkEmployeeDeletion,
    deleteEmployee,
    canToggleStatus: hasRole('admin') || hasRole('manager') || isSuperAdmin(),
    canDelete: isSuperAdmin()
  };
};
