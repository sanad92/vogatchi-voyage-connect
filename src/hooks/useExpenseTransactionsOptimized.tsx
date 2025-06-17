
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExpenseTransaction {
  id: string;
  transaction_number: string;
  category_id: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_method: string;
  vendor_name?: string;
  vendor_phone?: string;
  invoice_number?: string;
  receipt_url?: string;
  status: string;
  notes?: string;
  bank_account_id?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  expense_categories?: {
    id: string;
    name: string;
    name_ar: string;
    color: string;
  };
}

export const useExpenseTransactionsOptimized = () => {
  const queryClient = useQueryClient();

  // جلب جميع المعاملات المالية مع التصنيفات
  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['expense-transactions-optimized'],
    queryFn: async () => {
      console.log('Fetching optimized expense transactions...');
      const { data, error } = await supabase
        .from('expense_transactions')
        .select(`
          *,
          expense_categories!inner(
            id,
            name,
            name_ar,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching expense transactions:', error);
        throw error;
      }
      console.log('Fetched expense transactions:', data);
      return data as ExpenseTransaction[];
    },
  });

  // إضافة معاملة مالية جديدة
  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: Partial<ExpenseTransaction>) => {
      console.log('Adding new expense transaction:', transactionData);
      
      const { data, error } = await supabase
        .from('expense_transactions')
        .insert([{
          ...transactionData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          expense_categories!inner(
            id,
            name,
            name_ar,
            color
          )
        `)
        .single();

      if (error) {
        console.error('Error adding expense transaction:', error);
        throw error;
      }
      
      console.log('Added expense transaction:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('تم إضافة المعاملة المالية بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error adding expense transaction:', error);
      toast.error('حدث خطأ أثناء إضافة المعاملة المالية');
    },
  });

  // تحديث حالة المعاملة المالية
  const updateTransactionStatusMutation = useMutation({
    mutationFn: async ({ transactionId, status, approvedBy }: {
      transactionId: string;
      status: string;
      approvedBy?: string;
    }) => {
      console.log('Updating transaction status:', { transactionId, status });
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'approved' && approvedBy) {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('expense_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select(`
          *,
          expense_categories!inner(
            id,
            name,
            name_ar,
            color
          )
        `)
        .single();

      if (error) {
        console.error('Error updating transaction status:', error);
        throw error;
      }
      
      console.log('Updated transaction status:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] });
      toast.success('تم تحديث حالة المعاملة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error updating transaction status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المعاملة');
    },
  });

  // حذف معاملة مالية
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      console.log('Deleting expense transaction:', transactionId);
      
      const { error } = await supabase
        .from('expense_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting expense transaction:', error);
        throw error;
      }
      
      console.log('Deleted expense transaction successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] });
      toast.success('تم حذف المعاملة المالية بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error deleting expense transaction:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة المالية');
    },
  });

  // حساب الإحصائيات
  const getTransactionsStatistics = () => {
    if (!transactions) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const stats = {
      totalTransactions: transactions.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      approvedTransactions: transactions.filter(t => t.status === 'approved').length,
      rejectedTransactions: transactions.filter(t => t.status === 'rejected').length,
      totalAmountThisMonth: transactions
        .filter(t => {
          const transactionDate = new Date(t.transaction_date);
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0),
      pendingAmount: transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0)
    };

    return stats;
  };

  const addTransaction = (data: Partial<ExpenseTransaction>) => {
    addTransactionMutation.mutate(data);
  };

  const updateTransactionStatus = (data: {
    transactionId: string;
    status: string;
    approvedBy?: string;
  }) => {
    updateTransactionStatusMutation.mutate(data);
  };

  const deleteTransaction = (transactionId: string) => {
    deleteTransactionMutation.mutate(transactionId);
  };

  return {
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    updateTransactionStatus,
    deleteTransaction,
    getTransactionsStatistics,
    isAddingTransaction: addTransactionMutation.isPending,
    isUpdatingStatus: updateTransactionStatusMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  };
};
