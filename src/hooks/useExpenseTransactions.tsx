
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ExpenseTransaction } from '@/types/expenses';

export const useExpenseTransactions = () => {
  const queryClient = useQueryClient();

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

  const addExpenseTransaction = (transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>) => {
    addExpenseTransactionMutation.mutate(transaction);
  };

  return {
    expenseTransactions,
    transactionsLoading,
    addExpenseTransaction,
    isAddingTransaction: addExpenseTransactionMutation.isPending,
  };
};
