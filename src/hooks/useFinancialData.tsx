
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFinancialData = () => {
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
      return data;
    },
  });

  // جلب الحسابات البنكية
  const { data: bankAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_name');
      
      if (error) throw error;
      return data;
    },
  });

  // جلب معاملات المصروفات
  const { data: expenseTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['expense-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_transactions')
        .select(`
          *,
          category:expense_categories(name_ar, color),
          created_by_profile:profiles(full_name)
        `)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // جلب أسعار الصرف
  const { data: exchangeRates, isLoading: ratesLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // جلب معاملات الحسابات البنكية
  const { data: bankTransactions, isLoading: bankTransactionsLoading } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select(`
          *,
          bank_account:bank_accounts(account_name, currency)
        `)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return {
    expenseCategories,
    categoriesLoading,
    bankAccounts,
    accountsLoading,
    expenseTransactions,
    transactionsLoading,
    exchangeRates,
    ratesLoading,
    bankTransactions,
    bankTransactionsLoading,
  };
};
