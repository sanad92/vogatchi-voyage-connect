
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
          employee:employees(full_name, position, employee_code)
        `)
        .order('salary_month', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MonthlySalary[];
    },
  });

  // حساب الراتب الشهري
  const calculateMonthlySalaryMutation = useMutation({
    mutationFn: async (salaryData: {
      employee_id: string;
      salary_month: string;
      base_salary: number;
      allowances?: number;
      overtime_hours?: number;
      overtime_rate?: number;
      deductions?: number;
      bonus?: number;
      tax_amount?: number;
      insurance_deduction?: number;
      payment_method?: string;
      bank_account_id?: string;
      status?: 'pending' | 'paid' | 'cancelled';
      notes?: string;
      created_by?: string;
    }) => {
      // إضافة القيم المطلوبة للراتب الإجمالي والصافي (سيتم حسابها في قاعدة البيانات)
      const dataToInsert = {
        ...salaryData,
        gross_salary: 0, // سيتم حسابها في trigger
        net_salary: 0,   // سيتم حسابها في trigger
        overtime_amount: 0 // سيتم حسابها في trigger
      };

      const { data, error } = await supabase
        .from('monthly_salaries')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-salaries'] });
      toast({
        title: "تم الحساب بنجاح",
        description: "تم حساب الراتب الشهري بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الحساب",
        description: "حدث خطأ أثناء حساب الراتب",
        variant: "destructive",
      });
    },
  });

  const calculateMonthlySalary = (salaryData: {
    employee_id: string;
    salary_month: string;
    base_salary: number;
    allowances?: number;
    overtime_hours?: number;
    overtime_rate?: number;
    deductions?: number;
    bonus?: number;
    tax_amount?: number;
    insurance_deduction?: number;
    payment_method?: string;
    bank_account_id?: string;
    status?: 'pending' | 'paid' | 'cancelled';
    notes?: string;
    created_by?: string;
  }) => {
    calculateMonthlySalaryMutation.mutate(salaryData);
  };

  return {
    monthlySalaries,
    salariesLoading,
    calculateMonthlySalary,
    isCalculatingSalary: calculateMonthlySalaryMutation.isPending,
  };
};
