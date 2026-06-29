
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrgId } from './useOrgId';
import { getFriendlyDatabaseError } from '@/utils/databaseErrors';

interface ExpenseTransaction {
  id: string; transaction_number: string; category_id: string; description: string;
  amount: number; currency: string; transaction_date: string; payment_method: string;
  vendor_name?: string; vendor_phone?: string; invoice_number?: string; receipt_url?: string;
  status: string; notes?: string; bank_account_id?: string; created_by: string;
  approved_by?: string; approved_at?: string; created_at: string; updated_at: string;
  expense_categories?: { id: string; name: string; name_ar: string; color: string; };
}

interface UseExpenseTransactionsOptions { search?: string; categoryId?: string; status?: string; paymentMethod?: string; dateFrom?: string; dateTo?: string; }
interface UsePaginationOptions { page?: number; pageSize?: number; }

const EMPTY_TRANSACTIONS: ExpenseTransaction[] = [];

export const useExpenseTransactionsOptimized = (
  filters: UseExpenseTransactionsOptions = {},
  pagination: UsePaginationOptions = {}
) => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { page = 1, pageSize = 50 } = pagination;

  const { data: queryData, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['expense-transactions-optimized', filters, page, pageSize, orgId],
    queryFn: async () => {
      let query = supabase.from('expense_transactions').select(`*, expense_categories!inner(id, name, name_ar, color)`, { count: 'exact' });
      if (filters.search) query = query.or(`description.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`);
      if (filters.categoryId && filters.categoryId !== 'all') query = query.eq('category_id', filters.categoryId);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.paymentMethod && filters.paymentMethod !== 'all') query = query.eq('payment_method', filters.paymentMethod);
      if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
      const startIndex = (page - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1).order('created_at', { ascending: false });
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as ExpenseTransaction[], count: count || 0 };
    },
    enabled: !!orgId,
  });

  const transactions = queryData?.data || EMPTY_TRANSACTIONS;
  const totalCount = queryData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: Partial<ExpenseTransaction>) => {
      const requiredData = {
        category_id: transactionData.category_id!,
        description: transactionData.description!,
        amount: transactionData.amount!,
        created_by: (await supabase.auth.getUser()).data.user?.id!,
        organization_id: orgId,
        ...transactionData
      };
      const { data, error } = await supabase.from('expense_transactions').insert([requiredData]).select(`*, expense_categories!inner(id, name, name_ar, color)`).single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] }); queryClient.invalidateQueries({ queryKey: ['expense-categories'] }); toast.success('تم إضافة المعاملة المالية بنجاح'); },
    onError: (error: any) => { toast.error('حدث خطأ أثناء إضافة المعاملة المالية: ' + getFriendlyDatabaseError(error)); console.error('Insert expense error:', error); },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (updateData: Partial<ExpenseTransaction> & { id: string }) => {
      const { id, ...dataToUpdate } = updateData;
      const { data, error } = await supabase.from('expense_transactions').update({ ...dataToUpdate, updated_at: new Date().toISOString() }).eq('id', id).select(`*, expense_categories!inner(id, name, name_ar, color)`).single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] }); toast.success('تم تحديث المعاملة المالية بنجاح'); },
    onError: (error: any) => { toast.error('حدث خطأ أثناء التحديث: ' + getFriendlyDatabaseError(error)); console.error('Update expense error:', error); },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => { const { error } = await supabase.from('expense_transactions').delete().eq('id', transactionId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expense-transactions-optimized'] }); toast.success('تم حذف المعاملة المالية بنجاح'); },
    onError: () => { toast.error('حدث خطأ أثناء حذف المعاملة المالية'); },
  });

  const getTransactionsStatistics = () => {
    if (!transactions) return null;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return {
      totalTransactions: transactions.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length,
      approvedTransactions: transactions.filter(t => t.status === 'approved').length,
      rejectedTransactions: transactions.filter(t => t.status === 'rejected').length,
      totalAmountThisMonth: transactions.filter(t => { const d = new Date(t.transaction_date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((sum, t) => sum + t.amount, 0),
      pendingAmount: transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)
    };
  };

  return {
    transactions, totalCount, isLoading: transactionsLoading, error: transactionsError,
    currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1,
    addTransaction: (data: Partial<ExpenseTransaction>) => addTransactionMutation.mutate(data),
    updateTransaction: (data: Partial<ExpenseTransaction> & { id: string }) => updateTransactionMutation.mutate(data),
    deleteTransaction: (id: string) => deleteTransactionMutation.mutate(id),
    getTransactionsStatistics,
    isAdding: addTransactionMutation.isPending, isUpdating: updateTransactionMutation.isPending, isDeleting: deleteTransactionMutation.isPending,
    transactionsLoading, transactionsError,
    isAddingTransaction: addTransactionMutation.isPending, isUpdatingStatus: updateTransactionMutation.isPending,
  };
};
