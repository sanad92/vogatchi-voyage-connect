
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SalaryCalculationData {
  employee_id: string;
  salary_month: string;
  overtime_hours?: number;
  bonus?: number;
  deductions?: number;
  notes?: string;
}

interface SalaryStatusUpdate {
  salary_id: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  bank_account_id?: string;
  notes?: string;
}

interface StoredProcedureResponse {
  success: boolean;
  error?: string;
  message?: string;
  salary_id?: string;
  calculated_data?: any;
  old_status?: string;
  new_status?: string;
}

export const useSalaryOperations = () => {
  const queryClient = useQueryClient();

  const calculateSalary = useMutation({
    mutationFn: async (salaryData: SalaryCalculationData) => {
      console.log('جاري حساب الراتب:', salaryData);

      if (!salaryData.employee_id || !salaryData.salary_month) {
        throw new Error('بيانات الموظف والشهر مطلوبة');
      }

      const salaryMonth = new Date(salaryData.salary_month + '-01').toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('calculate_monthly_salary', {
        p_employee_id: salaryData.employee_id,
        p_salary_month: salaryMonth,
        p_overtime_hours: salaryData.overtime_hours || 0,
        p_bonus: salaryData.bonus || 0,
        p_deductions: salaryData.deductions || 0,
        p_notes: salaryData.notes || null
      });

      if (error) throw error;

      const response = data as unknown as StoredProcedureResponse;
      if (!response?.success) {
        throw new Error(response?.message || 'فشل في حساب الراتب');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم حساب وحفظ الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في حساب الراتب:', error);
      let errorMessage = 'حدث خطأ أثناء حساب الراتب';
      
      if (error.message) {
        if (error.message.includes('EMPLOYEE_NOT_FOUND')) {
          errorMessage = 'الموظف غير موجود أو غير نشط';
        } else if (error.message.includes('SALARY_EXISTS')) {
          errorMessage = 'تم حساب راتب هذا الموظف لهذا الشهر مسبقاً';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    },
  });

  const updateSalaryStatus = useMutation({
    mutationFn: async (statusData: SalaryStatusUpdate) => {
      console.log('جاري تحديث حالة الراتب:', statusData);

      if (!statusData.salary_id || !statusData.status) {
        throw new Error('بيانات غير صحيحة لتحديث حالة الراتب');
      }

      const { data, error } = await supabase.rpc('update_salary_status', {
        p_salary_id: statusData.salary_id,
        p_status: statusData.status,
        p_payment_date: statusData.payment_date || null,
        p_payment_method: statusData.payment_method || null,
        p_bank_account_id: statusData.bank_account_id || null,
        p_notes: statusData.notes || null
      });

      if (error) throw error;

      const response = data as unknown as StoredProcedureResponse;
      if (!response?.success) {
        throw new Error(response?.message || 'فشل في تحديث حالة الراتب');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم تحديث حالة الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في تحديث حالة الراتب:', error);
      let errorMessage = 'حدث خطأ أثناء تحديث حالة الراتب';
      
      if (error.message?.includes('SALARY_NOT_FOUND')) {
        errorMessage = 'الراتب غير موجود';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });

  const deleteSalary = useMutation({
    mutationFn: async (salaryId: string) => {
      if (!salaryId) throw new Error('معرف الراتب مطلوب');

      const { error } = await supabase
        .from('monthly_salaries')
        .delete()
        .eq('id', salaryId);

      if (error) throw error;
      return salaryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم حذف الراتب بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الراتب');
    },
  });

  return {
    calculateSalary: calculateSalary.mutateAsync,
    isCalculating: calculateSalary.isPending,
    updateSalaryStatus: updateSalaryStatus.mutateAsync,
    isUpdating: updateSalaryStatus.isPending,
    deleteSalary: deleteSalary.mutateAsync,
    isDeleting: deleteSalary.isPending,
  };
};
