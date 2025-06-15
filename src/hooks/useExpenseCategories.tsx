
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExpenseCategory } from '@/types/expenses';

export const useExpenseCategories = () => {
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

  return {
    expenseCategories,
    categoriesLoading,
  };
};
