
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';
import { toast } from 'sonner';
import { useOrgId } from './useOrgId';

export const useSalaries = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: monthlySalaries, isLoading: salariesLoading } = useQuery({
    queryKey: ['monthly-salaries', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('monthly_salaries').select(`*, employee:employees(full_name, employee_code, position)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data as (MonthlySalary & { employee?: any })[];
    },
    enabled: !!orgId,
  });

  const { mutateAsync: calculateMonthlySalary, isPending: isCalculatingSalary } = useMutation({
    mutationFn: async (salaryData: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at'>) => {
      const salaryDataWithEGP = {
        ...salaryData, currency: 'EGP', exchange_rate: 1.00, net_salary_egp: salaryData.net_salary,
        created_by: (await supabase.auth.getUser()).data.user?.id, organization_id: orgId,
      };
      const { data, error } = await supabase.from('monthly_salaries').insert(salaryDataWithEGP).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] }); toast.success('تم حفظ الراتب بنجاح'); },
    onError: (error: any) => { toast.error('حدث خطأ أثناء حفظ الراتب: ' + (error.message || 'خطأ غير محدد')); },
  });

  const { mutateAsync: updateSalaryStatus, isPending: isUpdatingSalary } = useMutation({
    mutationFn: async ({ id, status, payment_date }: { id: string; status: 'pending' | 'paid' | 'cancelled'; payment_date?: string; }) => {
      const { data, error } = await supabase.from('monthly_salaries').update({ status, payment_date }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] }); toast.success('تم تحديث حالة الراتب بنجاح'); },
    onError: () => { toast.error('حدث خطأ أثناء تحديث حالة الراتب'); },
  });

  const calculateTotalSalariesInEGP = (salaries: MonthlySalary[]) => salaries.reduce((total, salary) => total + (salary.net_salary || 0), 0);

  const getSalaryStatistics = () => {
    if (!monthlySalaries) return null;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthSalaries = monthlySalaries.filter(s => s.salary_month.startsWith(currentMonth));
    return {
      totalSalariesThisMonth: calculateTotalSalariesInEGP(currentMonthSalaries),
      paidSalariesThisMonth: calculateTotalSalariesInEGP(currentMonthSalaries.filter(s => s.status === 'paid')),
      pendingSalariesThisMonth: calculateTotalSalariesInEGP(currentMonthSalaries.filter(s => s.status === 'pending')),
      salariesCount: currentMonthSalaries.length,
      paidCount: currentMonthSalaries.filter(s => s.status === 'paid').length,
      pendingCount: currentMonthSalaries.filter(s => s.status === 'pending').length,
    };
  };

  return { monthlySalaries, salariesLoading, calculateMonthlySalary, isCalculatingSalary, updateSalaryStatus, isUpdatingSalary, calculateTotalSalariesInEGP, getSalaryStatistics };
};
