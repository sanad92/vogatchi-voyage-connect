import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import type { AccountType } from './useChartOfAccounts';

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_type: AccountType;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface IncomeStatementRow {
  account_type: AccountType;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  amount: number;
}

export const useTrialBalance = (endDate?: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['trial-balance', orgId, endDate],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_trial_balance', {
        _org_id: orgId,
        _end_date: endDate || null,
      });
      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
    enabled: !!orgId,
  });
};

export const useIncomeStatement = (startDate: string, endDate: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['income-statement', orgId, startDate, endDate],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_income_statement', {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      return (data || []) as IncomeStatementRow[];
    },
    enabled: !!orgId && !!startDate && !!endDate,
  });
};
