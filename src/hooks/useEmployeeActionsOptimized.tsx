
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
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

export const useEmployeeActionsOptimized = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  const queryClient = useQueryClient();

  // تحديد الصلاحيات
  const permissions = {
    canToggleStatus: hasRole('admin') || hasRole('manager') || isSuperAdmin(),
    canDelete: isSuperAdmin(),
    canEdit: hasRole('admin') || hasRole('manager') || isSuperAdmin(),
  };

  // إدارة حالة التحميل لعمليات مختلفة
  const setActionLoading = useCallback((action: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [action]: loading }));
  }, []);

  // تحديث البيانات في cache
  const invalidateEmployeeQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
    queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
  }, [queryClient]);

  // تحديث بيانات الموظف - محسن
  const updateEmployee = useCallback(async (employeeData: any) => {
    if (!permissions.canEdit) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    const actionKey = `update-${employeeData.id}`;
    
    try {
      setActionLoading(actionKey, true);

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
        console.error('خطأ في تحديث الموظف:', error);
        toast.error(`فشل في تحديث الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      // تحديث البيانات بشكل انتقائي
      invalidateEmployeeQueries();
      
      toast.success('تم تحديث بيانات الموظف بنجاح');
      return { success: true, data };

    } catch (error: any) {
      console.error('خطأ غير متوقع:', error);
      toast.error('حدث خطأ أثناء تحديث الموظف');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(actionKey, false);
    }
  }, [permissions.canEdit, setActionLoading, invalidateEmployeeQueries]);

  // تفعيل/إيقاف الموظف - محسن
  const toggleEmployeeStatus = useCallback(async (employeeId: string, isActive: boolean, reason?: string) => {
    if (!permissions.canToggleStatus) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    const actionKey = `toggle-${employeeId}`;

    try {
      setActionLoading(actionKey, true);

      const { data, error } = await supabase.rpc('toggle_employee_status' as any, {
        p_employee_id: employeeId,
        p_is_active: isActive,
        p_reason: reason
      });

      if (error) {
        console.error('خطأ في تغيير حالة الموظف:', error);
        toast.error(`فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      const response = data as unknown as EmployeeActionResponse;

      if (!response?.success) {
        toast.error(response?.message || `فشل في ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
        return { success: false, error: response?.message };
      }

      invalidateEmployeeQueries();
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      console.error('خطأ غير متوقع:', error);
      toast.error(`حدث خطأ أثناء ${isActive ? 'تفعيل' : 'إيقاف'} الموظف`);
      return { success: false, error: error.message };
    } finally {
      setActionLoading(actionKey, false);
    }
  }, [permissions.canToggleStatus, setActionLoading, invalidateEmployeeQueries]);

  // التحقق من إمكانية حذف الموظف - محسن
  const checkEmployeeDeletion = useCallback(async (employeeId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_employee_deletion', {
        p_employee_id: employeeId
      });

      if (error) {
        console.error('خطأ في فحص إمكانية الحذف:', error);
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
      console.error('خطأ غير متوقع:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // حذف الموظف - محسن
  const deleteEmployee = useCallback(async (employeeId: string, forceDelete = false, reason?: string) => {
    if (!permissions.canDelete) {
      toast.error('ليس لديك صلاحية لحذف الموظفين - السوبر أدمن فقط');
      return { success: false, error: 'غير مصرح' };
    }

    const actionKey = `delete-${employeeId}`;

    try {
      setActionLoading(actionKey, true);

      const { data, error } = await supabase.rpc('safe_delete_employee', {
        p_employee_id: employeeId,
        p_force_delete: forceDelete,
        p_reason: reason
      });

      if (error) {
        console.error('خطأ في حذف الموظف:', error);
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

      invalidateEmployeeQueries();
      
      toast.success(response.message);
      return { success: true, data: response };

    } catch (error: any) {
      console.error('خطأ غير متوقع:', error);
      toast.error('حدث خطأ أثناء حذف الموظف');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(actionKey, false);
    }
  }, [permissions.canDelete, setActionLoading, invalidateEmployeeQueries]);

  // إنشاء موظف جديد - محسن
  const createEmployee = useCallback(async (employeeData: any) => {
    if (!permissions.canEdit) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    const actionKey = 'create-employee';

    try {
      setActionLoading(actionKey, true);

      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء الموظف:', error);
        toast.error(`فشل في إنشاء الموظف: ${error.message}`);
        return { success: false, error: error.message };
      }

      invalidateEmployeeQueries();
      
      toast.success('تم إنشاء الموظف بنجاح');
      return { success: true, data };

    } catch (error: any) {
      console.error('خطأ غير متوقع:', error);
      toast.error('حدث خطأ أثناء إنشاء الموظف');
      return { success: false, error: error.message };
    } finally {
      setActionLoading(actionKey, false);
    }
  }, [permissions.canEdit, setActionLoading, invalidateEmployeeQueries]);

  return {
    // العمليات
    updateEmployee,
    toggleEmployeeStatus,
    checkEmployeeDeletion,
    deleteEmployee,
    createEmployee,
    
    // الصلاحيات
    ...permissions,
    
    // حالة التحميل
    isLoading: (action?: string) => action ? loadingStates[action] || false : Object.values(loadingStates).some(Boolean),
    loadingStates,
  };
};
