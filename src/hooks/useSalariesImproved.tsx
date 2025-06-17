
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';
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

export const useSalariesImproved = () => {
  const queryClient = useQueryClient();

  // جلب الرواتب الشهرية مع بيانات الموظفين
  const { data: monthlySalaries, isLoading: salariesLoading, error: salariesError } = useQuery({
    queryKey: ['monthly-salaries-improved'],
    queryFn: async () => {
      console.log('جاري جلب الرواتب الشهرية...');
      
      const { data, error } = await supabase
        .from('monthly_salaries')
        .select(`
          *,
          employee:employees(
            id,
            employee_code,
            full_name,
            position,
            department,
            base_salary,
            allowances
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الرواتب:', error);
        throw error;
      }
      
      console.log('تم جلب الرواتب بنجاح:', data?.length);
      return data as (MonthlySalary & { employee?: any })[];
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // حساب راتب شهري جديد باستخدام الـ stored procedure
  const { mutateAsync: calculateMonthlySalary, isPending: isCalculatingSalary } = useMutation({
    mutationFn: async (salaryData: SalaryCalculationData) => {
      console.log('جاري حساب الراتب:', salaryData);

      // التحقق من صحة البيانات
      if (!salaryData.employee_id) {
        throw new Error('يجب اختيار موظف');
      }

      if (!salaryData.salary_month) {
        throw new Error('يجب تحديد شهر الراتب');
      }

      // التأكد من تنسيق التاريخ
      const salaryMonth = new Date(salaryData.salary_month + '-01').toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('calculate_monthly_salary', {
        p_employee_id: salaryData.employee_id,
        p_salary_month: salaryMonth,
        p_overtime_hours: salaryData.overtime_hours || 0,
        p_bonus: salaryData.bonus || 0,
        p_deductions: salaryData.deductions || 0,
        p_notes: salaryData.notes || null
      });

      if (error) {
        console.error('خطأ في استدعاء stored procedure:', error);
        throw error;
      }

      // Type assertion للـ response مع التحويل إلى unknown أولاً
      const response = data as unknown as StoredProcedureResponse;

      if (!response?.success) {
        console.error('فشل في حساب الراتب:', response);
        throw new Error(response?.message || 'فشل في حساب الراتب');
      }

      console.log('تم حساب الراتب بنجاح:', response);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم حساب وحفظ الراتب بنجاح');
      console.log('تم حفظ الراتب بنجاح:', data.salary_id);
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

  // تحديث حالة راتب باستخدام الـ stored procedure
  const { mutateAsync: updateSalaryStatus, isPending: isUpdatingSalary } = useMutation({
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

      if (error) {
        console.error('خطأ في تحديث حالة الراتب:', error);
        throw error;
      }

      // Type assertion للـ response مع التحويل إلى unknown أولاً
      const response = data as unknown as StoredProcedureResponse;

      if (!response?.success) {
        console.error('فشل في تحديث حالة الراتب:', response);
        throw new Error(response?.message || 'فشل في تحديث حالة الراتب');
      }

      console.log('تم تحديث حالة الراتب بنجاح:', response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم تحديث حالة الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في تحديث حالة الراتب:', error);
      let errorMessage = 'حدث خطأ أثناء تحديث حالة الراتب';
      
      if (error.message) {
        if (error.message.includes('SALARY_NOT_FOUND')) {
          errorMessage = 'الراتب غير موجود';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    },
  });

  // حذف راتب
  const { mutateAsync: deleteSalary, isPending: isDeletingSalary } = useMutation({
    mutationFn: async (salaryId: string) => {
      console.log('جاري حذف الراتب:', salaryId);

      if (!salaryId) {
        throw new Error('معرف الراتب مطلوب');
      }

      const { error } = await supabase
        .from('monthly_salaries')
        .delete()
        .eq('id', salaryId);

      if (error) {
        console.error('خطأ في حذف الراتب:', error);
        throw error;
      }

      console.log('تم حذف الراتب بنجاح');
      return salaryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries-improved'] });
      toast.success('تم حذف الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في حذف الراتب:', error);
      toast.error('حدث خطأ أثناء حذف الراتب');
    },
  });

  // حساب الإحصائيات
  const getSalaryStatistics = () => {
    if (!monthlySalaries) return null;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthSalaries = monthlySalaries.filter(
      salary => salary.salary_month.startsWith(currentMonth)
    );

    const totalSalariesThisMonth = currentMonthSalaries.reduce(
      (sum, salary) => sum + (salary.net_salary || 0), 0
    );
    
    const paidSalariesThisMonth = currentMonthSalaries
      .filter(salary => salary.status === 'paid')
      .reduce((sum, salary) => sum + (salary.net_salary || 0), 0);
    
    const pendingSalariesThisMonth = currentMonthSalaries
      .filter(salary => salary.status === 'pending')
      .reduce((sum, salary) => sum + (salary.net_salary || 0), 0);

    return {
      totalSalariesThisMonth,
      paidSalariesThisMonth,
      pendingSalariesThisMonth,
      salariesCount: currentMonthSalaries.length,
      paidCount: currentMonthSalaries.filter(s => s.status === 'paid').length,
      pendingCount: currentMonthSalaries.filter(s => s.status === 'pending').length,
    };
  };

  // التحقق من وجود راتب للموظف في شهر معين
  const checkSalaryExists = (employeeId: string, salaryMonth: string): boolean => {
    if (!monthlySalaries) return false;
    
    return monthlySalaries.some(
      salary => salary.employee_id === employeeId && 
                salary.salary_month.startsWith(salaryMonth)
    );
  };

  return {
    // البيانات
    monthlySalaries,
    salariesLoading,
    salariesError,
    
    // العمليات
    calculateMonthlySalary,
    isCalculatingSalary,
    updateSalaryStatus,
    isUpdatingSalary,
    deleteSalary,
    isDeletingSalary,
    
    // المساعدات
    getSalaryStatistics,
    checkSalaryExists,
  };
};
