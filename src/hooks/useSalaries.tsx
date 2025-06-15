
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';

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

  // حساب راتب شهري جديد
  const { mutateAsync: calculateMonthlySalary, isPending: isCalculatingSalary } = useMutation({
    mutationFn: async (salaryData: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('monthly_salaries')
        .insert({
          ...salaryData,
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

  return {
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary,
    updateSalaryStatus,
    isUpdatingSalary,
  };
};
