
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

interface UseExpenseTransactionsOptions {
  search?: string;
  categoryId?: string;
  status?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UsePaginationOptions {
  page?: number;
  pageSize?: number;
}

export const useExpenseTransactionsOptimized = (
  filters: UseExpenseTransactionsOptions = {},
  pagination: UsePaginationOptions = {}
) => {
  const queryClient = useQueryClient();
  const { page = 1, pageSize = 50 } = pagination;

  // جلب جميع المعاملات المالية مع التصنيفات
  const { data: queryData, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['expense-transactions-optimized', filters, page, pageSize],
    queryFn: async () => {
      console.log('Fetching optimized expense transactions...');
      
      let query = supabase
        .from('expense_transactions')
        .select(`
          *,
          expense_categories!inner(
            id,
            name,
            name_ar,
            color
          )
        `, { count: 'exact' });

      // تطبيق الفلاتر
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`);
      }
      
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      
      if (filters.dateFrom) {
        query = query.gte('transaction_date', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('transaction_date', filters.dateTo);
      }

      // تطبيق التصفح
      const startIndex = (page - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1);
      
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching expense transactions:', error);
        throw error;
      }
      
      console.log('Fetched expense transactions:', data);
      return { 
        data: data as ExpenseTransaction[], 
        count: count || 0 
      };
    },
  });

  const transactions = queryData?.data || [];
  const totalCount = queryData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // إضافة معاملة مالية جديدة
  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: Partial<ExpenseTransaction>) => {
      console.log('Adding new expense transaction:', transactionData);
      
      // التأكد من أن البيانات المطلوبة موجودة
      const requiredData = {
        category_id: transactionData.category_id!,
        description: transactionData.description!,
        amount: transactionData.amount!,
        created_by: (await supabase.auth.getUser()).data.user?.id!,
        ...transactionData
      };

      const { data, error } = await supabase
        .from('expense_transactions')
        .insert([requiredData])
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

  // تحديث معاملة مالية
  const updateTransactionMutation = useMutation({
    mutationFn: async (updateData: Partial<ExpenseTransaction> & { id: string }) => {
      console.log('Updating expense transaction:', updateData);
      
      const { id, ...dataToUpdate } = updateData;

      const { data, error } = await supabase
        .from('expense_transactions')
        .update({
          ...dataToUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
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
        console.error('Error updating expense transaction:', error);
        throw error;
      }
      
      console.log('Updated expense transaction:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] });
      toast.success('تم تحديث المعاملة المالية بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error updating expense transaction:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة المالية');
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

  const updateTransaction = (data: Partial<ExpenseTransaction> & { id: string }) => {
    updateTransactionMutation.mutate(data);
  };

  const deleteTransaction = (transactionId: string) => {
    deleteTransactionMutation.mutate(transactionId);
  };

  return {
    transactions,
    totalCount,
    isLoading: transactionsLoading,
    error: transactionsError,
    currentPage: page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsStatistics,
    isAdding: addTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
    // للتوافق مع الأسماء القديمة
    transactionsLoading,
    transactionsError,
    isAddingTransaction: addTransactionMutation.isPending,
    isUpdatingStatus: updateTransactionMutation.isPending,
  };
};
