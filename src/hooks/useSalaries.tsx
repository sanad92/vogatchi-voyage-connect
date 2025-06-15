
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';

export const useSalaries = () => {
  const queryClient = useQueryClient();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

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

  // حساب راتب شهري جديد مع دعم العملات المتعددة
  const { mutateAsync: calculateMonthlySalary, isPending: isCalculatingSalary } = useMutation({
    mutationFn: async (salaryData: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at'> & { 
      currency?: SupportedCurrency 
    }) => {
      // إذا كانت العملة مختلفة عن الجنيه المصري، احسب المبلغ بالجنيه
      let netSalaryEGP = salaryData.net_salary;
      let exchangeRate = 1;

      if (salaryData.currency && salaryData.currency !== 'EGP') {
        exchangeRate = await getCurrentRate(salaryData.currency, 'EGP');
        netSalaryEGP = await convertToPrimaryCurrency(salaryData.net_salary, salaryData.currency);
      }

      const { data, error } = await supabase
        .from('monthly_salaries')
        .insert({
          ...salaryData,
          currency: salaryData.currency || 'EGP',
          exchange_rate: exchangeRate,
          net_salary_egp: netSalaryEGP,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] });
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
    },
  });

  // حساب إجمالي الرواتب بالجنيه المصري
  const calculateTotalSalariesInEGP = async (salaries: MonthlySalary[]) => {
    let total = 0;
    for (const salary of salaries) {
      if (salary.net_salary_egp) {
        total += salary.net_salary_egp;
      } else if (salary.currency && salary.currency !== 'EGP') {
        const amountInEGP = await convertToPrimaryCurrency(salary.net_salary, salary.currency as SupportedCurrency);
        total += amountInEGP;
      } else {
        total += salary.net_salary;
      }
    }
    return total;
  };

  return {
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary,
    updateSalaryStatus,
    isUpdatingSalary,
    calculateTotalSalariesInEGP,
  };
};
