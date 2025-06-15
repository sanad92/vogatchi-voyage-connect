
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';
import { toast } from 'sonner';

export const useSalaries = () => {
  const queryClient = useQueryClient();

  // جلب الرواتب الشهرية
  const { data: monthlySalaries, isLoading: salariesLoading } = useQuery({
    queryKey: ['monthly-salaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_salaries')
        .select(`
          *,
          employee:employees(full_name, employee_code, position)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (MonthlySalary & { employee?: any })[];
    },
  });

  // حساب راتب شهري جديد (جميع الرواتب بالجنيه المصري)
  const { mutateAsync: calculateMonthlySalary, isPending: isCalculatingSalary } = useMutation({
    mutationFn: async (salaryData: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at'>) => {
      // التأكد من أن العملة هي الجنيه المصري
      const salaryDataWithEGP = {
        ...salaryData,
        currency: 'EGP',
        exchange_rate: 1.00,
        net_salary_egp: salaryData.net_salary,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      console.log('Creating salary with data:', salaryDataWithEGP);

      const { data, error } = await supabase
        .from('monthly_salaries')
        .insert(salaryDataWithEGP)
        .select()
        .single();

      if (error) {
        console.error('Error creating salary:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] });
      toast.success('تم حفظ الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('Error saving salary:', error);
      toast.error('حدث خطأ أثناء حفظ الراتب: ' + (error.message || 'خطأ غير محدد'));
    },
  });

  // تحديث حالة راتب
  const { mutateAsync: updateSalaryStatus, isPending: isUpdatingSalary } = useMutation({
    mutationFn: async ({ id, status, payment_date }: { 
      id: string; 
      status: 'pending' | 'paid' | 'cancelled';
      payment_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('monthly_salaries')
        .update({ status, payment_date })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] });
      toast.success('تم تحديث حالة الراتب بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating salary status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الراتب');
    },
  });

  // حساب إجمالي الرواتب (جميعها بالجنيه المصري)
  const calculateTotalSalariesInEGP = (salaries: MonthlySalary[]) => {
    return salaries.reduce((total, salary) => {
      // جميع الرواتب بالجنيه المصري، لذا نجمع net_salary مباشرة
      return total + (salary.net_salary || 0);
    }, 0);
  };

  // إحصائيات الرواتب
  const getSalaryStatistics = () => {
    if (!monthlySalaries) return null;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthSalaries = monthlySalaries.filter(
      salary => salary.salary_month.startsWith(currentMonth)
    );

    const totalSalariesThisMonth = calculateTotalSalariesInEGP(currentMonthSalaries);
    const paidSalariesThisMonth = calculateTotalSalariesInEGP(
      currentMonthSalaries.filter(salary => salary.status === 'paid')
    );
    const pendingSalariesThisMonth = calculateTotalSalariesInEGP(
      currentMonthSalaries.filter(salary => salary.status === 'pending')
    );

    return {
      totalSalariesThisMonth,
      paidSalariesThisMonth,
      pendingSalariesThisMonth,
      salariesCount: currentMonthSalaries.length,
      paidCount: currentMonthSalaries.filter(s => s.status === 'paid').length,
      pendingCount: currentMonthSalaries.filter(s => s.status === 'pending').length,
    };
  };

  return {
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary,
    updateSalaryStatus,
    isUpdatingSalary,
    calculateTotalSalariesInEGP,
    getSalaryStatistics,
  };
};
