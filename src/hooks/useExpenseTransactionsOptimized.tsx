
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExpenseFilters {
  search?: string;
  categoryId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
}

export const useExpenseTransactionsOptimized = (
  filters: ExpenseFilters = {},
  pagination: PaginationOptions = { page: 1, pageSize: 50 }
) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // حساب الإزاحة للصفحة
  const offset = (pagination.page - 1) * pagination.pageSize;

  // بناء query key للتخزين المؤقت
  const queryKey = ['expense-transactions', filters, pagination];

  // جلب المعاملات مع pagination
  const { 
    data: transactionsData, 
    isLoading: transactionsLoading,
    error: transactionsError 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('expense_transactions')
        .select(`
          *,
          expense_categories(id, name, name_ar, color),
          bank_accounts(id, account_name),
          profiles!expense_transactions_created_by_fkey(id, full_name),
          profiles!expense_transactions_approved_by_fkey(id, full_name)
        `)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pagination.pageSize - 1);

      // تطبيق الفلاتر
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%`);
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
      
      if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }
      
      if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('خطأ في جلب المعاملات:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
  });

  // جلب العدد الإجمالي للمعاملات (منفصل للتحسين)
  const { data: totalCount } = useQuery({
    queryKey: ['expense-transactions-count', filters],
    queryFn: async () => {
      let query = supabase
        .from('expense_transactions')
        .select('id', { count: 'exact', head: true });

      // تطبيق نفس الفلاتر
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%`);
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
      
      if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }
      
      if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
    staleTime: 2 * 60 * 1000, // 2 دقائق
  });

  // حساب معلومات الصفحات
  const totalPages = useMemo(() => {
    if (!totalCount) return 0;
    return Math.ceil(totalCount / pagination.pageSize);
  }, [totalCount, pagination.pageSize]);

  const hasNextPage = pagination.page < totalPages;
  const hasPrevPage = pagination.page > 1;

  // إضافة معاملة جديدة
  const addTransaction = useMutation({
    mutationFn: async (transactionData: any) => {
      const { data, error } = await supabase
        .from('expense_transactions')
        .insert([transactionData])
        .select(`
          *,
          expense_categories(id, name, name_ar, color),
          bank_accounts(id, account_name),
          profiles!expense_transactions_created_by_fkey(id, full_name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-count'] });
      toast.success('تم إضافة المعاملة بنجاح');
    },
    onError: (error: any) => {
      toast.error(`فشل في إضافة المعاملة: ${error.message}`);
    },
  });

  // تحديث معاملة
  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updateData }: any) => {
      const { data, error } = await supabase
        .from('expense_transactions')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          expense_categories(id, name, name_ar, color),
          bank_accounts(id, account_name),
          profiles!expense_transactions_created_by_fkey(id, full_name),
          profiles!expense_transactions_approved_by_fkey(id, full_name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      toast.success('تم تحديث المعاملة بنجاح');
    },
    onError: (error: any) => {
      toast.error(`فشل في تحديث المعاملة: ${error.message}`);
    },
  });

  // حذف معاملة
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense-transactions-count'] });
      toast.success('تم حذف المعاملة بنجاح');
    },
    onError: (error: any) => {
      toast.error(`فشل في حذف المعاملة: ${error.message}`);
    },
  });

  return {
    // البيانات
    transactions: transactionsData || [],
    totalCount: totalCount || 0,
    
    // حالة التحميل
    isLoading: transactionsLoading || isLoading,
    error: transactionsError,
    
    // معلومات الصفحات
    currentPage: pagination.page,
    pageSize: pagination.pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
    
    // العمليات
    addTransaction: addTransaction.mutateAsync,
    updateTransaction: updateTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    
    // حالة العمليات
    isAdding: addTransaction.isPending,
    isUpdating: updateTransaction.isPending,
    isDeleting: deleteTransaction.isPending,
  };
};
