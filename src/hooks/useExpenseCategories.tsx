
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExpenseCategory } from '@/types/expenses';
import { useOrgId } from './useOrgId';

export const useExpenseCategories = () => {
  const orgId = useOrgId();

  const { data: expenseCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['expense-categories', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*').eq('is_active', true).order('name_ar');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
    enabled: !!orgId,
  });

  return { expenseCategories, categoriesLoading };
};
