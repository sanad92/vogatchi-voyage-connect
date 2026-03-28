
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySalary } from '@/types/expenses';
import { useSalaryOperations } from './useSalaryOperations';
import { useOrgId } from './useOrgId';

export const useSalariesImproved = () => {
  const salaryOperations = useSalaryOperations();
  const orgId = useOrgId();

  const { data: monthlySalaries, isLoading: salariesLoading, error: salariesError } = useQuery({
    queryKey: ['monthly-salaries-improved', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
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
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الرواتب:', error);
        throw error;
      }
      
      console.log('تم جلب الرواتب بنجاح:', data?.length);
      return data as (MonthlySalary & { employee?: any })[];
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

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

  const checkSalaryExists = (employeeId: string, salaryMonth: string): boolean => {
    if (!monthlySalaries) return false;
    
    return monthlySalaries.some(
      salary => salary.employee_id === employeeId && 
                salary.salary_month.startsWith(salaryMonth)
    );
  };

  return {
    monthlySalaries,
    salariesLoading,
    salariesError,
    getSalaryStatistics,
    checkSalaryExists,
    ...salaryOperations,
  };
};
