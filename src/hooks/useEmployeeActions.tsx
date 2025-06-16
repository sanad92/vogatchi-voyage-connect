
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

  // تحديد الصلاحيات
  const canToggleStatus = hasRole('admin') || hasRole('manager') || isSuperAdmin();
  const canDelete = isSuperAdmin();
  const canEdit = hasRole('admin') || hasRole('manager') || isSuperAdmin();

  // تحديث بيانات الموظف
  const updateEmployee = async (employeeData: any) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('employees')
        .update({
          full_name: employeeData.full_name,
          position: employeeData.position,
          department: employeeData.department,
          phone: employeeData.phone,
          email: employeeData.email,
          national_id: employeeData.national_id,
          hire_date: employeeData.hire_date,
          base_salary: employeeData.base_salary,
          allowances: employeeData.allowances,
          commission_rate: employeeData.commission_rate,
          is_active: employeeData.is_active,
          bank_account_number: employeeData.bank_account_number,
          bank_name: employeeData.bank_name,
          emergency_contact_name: employeeData.emergency_contact_name,
          emergency_contact_phone: employeeData.emergency_contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeData.id)
        .select()
        .single();

      if (error) {
        toast.error(`فشل في تحديث الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      // تحديث البيانات في الـ cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success('تم تحديث بيانات الموظف بنجاح');
      return { success: true, data };

    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحديث الموظف');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // تفعيل/إيقاف الموظف
  const toggleEmployeeStatus = async (employeeId: string, isActive: boolean, reason?: string) => {
    if (!canToggleStatus) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('toggle_employee_status', {
        p_employee_id: employeeId,
        p_is_active: isActive,
        p_reason: reason
      });

      if (error) {
        toast.error(`فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      const response = data as unknown as EmployeeActionResponse;

      if (!response?.success) {
        toast.error(response?.message || `فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
        return { success: false, error: response?.message };
      }

      // تحديث البيانات في الـ cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      toast.error(`حدث خطأ أثناء ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // التحقق من إمكانية حذف الموظف
  const checkEmployeeDeletion = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_employee_deletion', {
        p_employee_id: employeeId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const response = data as unknown as EmployeeActionResponse & {
        can_delete_safely: boolean;
        dependencies_count: number;
        linked_to_user: boolean;
        has_bookings: boolean;
        has_commissions: boolean;
        has_expenses: boolean;
      };

      return { success: true, data: response };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // حذف الموظف
  const deleteEmployee = async (employeeId: string, forceDelete = false, reason?: string) => {
    if (!canDelete) {
      toast.error('ليس لديك صلاحية لحذف الموظفين - السوبر أدمن فقط');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.rpc('safe_delete_employee', {
        p_employee_id: employeeId,
        p_force_delete: forceDelete,
        p_reason: reason
      });

      if (error) {
        toast.error(`فشل في حذف الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      const response = data as unknown as EmployeeActionResponse;

      if (!response?.success) {
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

      // تحديث البيانات في الـ cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      toast.error('حدث خطأ أثناء حذف الموظف');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    updateEmployee,
    toggleEmployeeStatus,
    checkEmployeeDeletion,
    deleteEmployee,
    canToggleStatus,
    canDelete,
    canEdit
  };
};
