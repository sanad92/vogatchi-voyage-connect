/**
 * @deprecated استخدم useFinancialReports.ts (المحرك المحاسبي الجديد) كمصدر رسمي.
 * هذا الـ hook يحسب الأرقام من جداول العمليات وقد لا يطابق القيود المحاسبية.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export const useFinancialData = () => {
  const orgId = useOrgId();

  // جلب فئات المصروفات
  const { data: expenseCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['expense-categories', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name_ar');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // جلب الحسابات البنكية
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['bank-accounts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('account_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // جلب معاملات المصروفات
  const { data: expenseTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['expense-transactions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('expense_transactions')
        .select(`
          *,
          category:expense_categories(name_ar, color),
          created_by_profile:profiles(full_name)
        `)
        .eq('organization_id', orgId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // جلب أسعار الصرف
  const { data: exchangeRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['exchange-rates', orgId],
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
  const { data: bankTransactions = [], isLoading: bankTransactionsLoading } = useQuery({
    queryKey: ['bank-transactions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select(`
          *,
          bank_account:bank_accounts(account_name, currency)
        `)
        .eq('organization_id', orgId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
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
