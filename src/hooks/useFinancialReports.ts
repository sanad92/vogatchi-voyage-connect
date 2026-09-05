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

export interface TrialBalanceV2Row extends TrialBalanceRow {
  debit_balance: number;
  credit_balance: number;
}

export interface IncomeStatementRow {
  account_type: AccountType;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  amount: number;
  currency: string;
}

export interface IncomeStatementV2Row extends IncomeStatementRow {
  account_id: string;
  section: 'revenue' | 'cost_of_sales' | 'operating_expense';
  entry_count: number;
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
      const { data, error } = await supabase.rpc('get_trial_balance', {
        _org_id: orgId,
        _end_date: endDate || undefined,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
    enabled: !!orgId,
  });
};

export const useTrialBalanceV2 = (
  asOfDate?: string,
  currency = 'EGP',
  costCenterId?: string,
) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['trial-balance-v2', orgId, asOfDate, currency, costCenterId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_trial_balance_v2', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
        _cost_center_id: costCenterId || undefined,
      });
      if (error) throw error;
      return (data || []) as TrialBalanceV2Row[];
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
      const { data, error } = await supabase.rpc('get_income_statement', {
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

export const useIncomeStatementV2 = (
  startDate: string,
  endDate: string,
  currency = 'EGP',
  costCenterId?: string,
  bookingType?: string,
) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['income-statement-v2', orgId, startDate, endDate, currency, costCenterId, bookingType],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_income_statement_v2', {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate,
        _currency: currency,
        _cost_center_id: costCenterId || undefined,
        _booking_type: bookingType || undefined,
      });
      if (error) throw error;
      return (data || []) as IncomeStatementV2Row[];
    },
    enabled: !!orgId && !!startDate && !!endDate && startDate <= endDate,
  });
};

export const useBalanceSheet = (asOfDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['balance-sheet', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_balance_sheet', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
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
      const { data, error } = await supabase.rpc('get_cash_flow', {
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
      const { data, error } = await supabase.rpc('get_customer_aging_by_currency', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as CustomerAgingRow[];
    },
    enabled: !!orgId,
  });
};
