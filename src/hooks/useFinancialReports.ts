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
  currency: string;
}

export interface IncomeStatementRow {
  account_type: AccountType;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  amount: number;
  currency: string;
}

export interface BalanceSheetRow {
  account_type: AccountType;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  balance: number;
  currency: string;
}

export interface CashFlowRow {
  period_date: string;
  inflows: number;
  outflows: number;
  net_flow: number;
  currency: string;
}

export interface CustomerAgingRow {
  customer_id: string;
  customer_name: string;
  total_due: number;
  current_due: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_over_90: number;
  currency: string;
}

export const useTrialBalance = (endDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['trial-balance', orgId, endDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_trial_balance', {
        _org_id: orgId,
        _end_date: endDate || null,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
    enabled: !!orgId,
  });
};

export const useIncomeStatement = (startDate: string, endDate: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['income-statement', orgId, startDate, endDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_income_statement', {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as IncomeStatementRow[];
    },
    enabled: !!orgId && !!startDate && !!endDate,
  });
};

export const useBalanceSheet = (asOfDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['balance-sheet', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_balance_sheet', {
        _org_id: orgId,
        _as_of_date: asOfDate || null,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as BalanceSheetRow[];
    },
    enabled: !!orgId,
  });
};

export const useCashFlow = (startDate: string, endDate: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cash-flow', orgId, startDate, endDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_cash_flow', {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as CashFlowRow[];
    },
    enabled: !!orgId && !!startDate && !!endDate,
  });
};

export const useCustomerAging = (asOfDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['customer-aging', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_customer_aging_by_currency', {
        _org_id: orgId,
        _as_of_date: asOfDate || null,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as CustomerAgingRow[];
    },
    enabled: !!orgId,
  });
};
