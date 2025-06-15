
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { 
  ExpenseCategory, 
  Employee, 
  SalaryScale, 
  RentContract,
  MonthlySalary,
  RentPayment,
  ExpenseTransaction,
  BudgetAllocation 
} from '@/types/expenses';

export const useExpenses = () => {
  const queryClient = useQueryClient();

  // جلب فئات المصروفات
  const { data: expenseCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_ar');

      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  // جلب الموظفين
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Employee[];
    },
  });

  // جلب عقود الإيجار
  const { data: rentContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['rent-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_contracts')
        .select('*')
        .eq('is_active', true)
        .order('contract_number');

      if (error) throw error;
      return data as RentContract[];
    },
  });

  // جلب المعاملات المالية
  const { data: expenseTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['expense-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_transactions')
        .select(`
          *,
          category:expense_categories(name, name_ar, color)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ExpenseTransaction[];
    },
  });

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

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة الموظف الجديد بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الإضافة",
        description: "حدث خطأ أثناء إضافة الموظف",
        variant: "destructive",
      });
    },
  });

  // إضافة معاملة مصروفات
  const addExpenseTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>) => {
      const { data, error } = await supabase
        .from('expense_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم تسجيل المعاملة بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في التسجيل",
        description: "حدث خطأ أثناء تسجيل المعاملة",
        variant: "destructive",
      });
    },
  });

  // إضافة عقد إيجار
  const addRentContractMutation = useMutation({
    mutationFn: async (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rent_contracts')
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-contracts'] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة عقد الإيجار بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الإضافة",
        description: "حدث خطأ أثناء إضافة عقد الإيجار",
        variant: "destructive",
      });
    },
  });

  // حساب الراتب الشهري
  const calculateMonthlySalaryMutation = useMutation({
    mutationFn: async (salary: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at' | 'gross_salary' | 'net_salary' | 'overtime_amount'>) => {
      const { data, error } = await supabase
        .from('monthly_salaries')
        .insert(salary)
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

  // دوال مساعدة
  const addEmployee = (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    addEmployeeMutation.mutate(employee);
  };

  const addExpenseTransaction = (transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>) => {
    addExpenseTransactionMutation.mutate(transaction);
  };

  const addRentContract = (contract: Omit<RentContract, 'id' | 'created_at' | 'updated_at'>) => {
    addRentContractMutation.mutate(contract);
  };

  const calculateMonthlySalary = (salary: Omit<MonthlySalary, 'id' | 'created_at' | 'updated_at' | 'gross_salary' | 'net_salary' | 'overtime_amount'>) => {
    calculateMonthlySalaryMutation.mutate(salary);
  };

  return {
    expenseCategories,
    employees,
    rentContracts,
    expenseTransactions,
    monthlySalaries,
    categoriesLoading,
    employeesLoading,
    contractsLoading,
    transactionsLoading,
    salariesLoading,
    addEmployee,
    addExpenseTransaction,
    addRentContract,
    calculateMonthlySalary,
    isAddingEmployee: addEmployeeMutation.isPending,
    isAddingTransaction: addExpenseTransactionMutation.isPending,
    isAddingContract: addRentContractMutation.isPending,
    isCalculatingSalary: calculateMonthlySalaryMutation.isPending,
  };
};
