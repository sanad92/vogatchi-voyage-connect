import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import type { AccountType } from './useChartOfAccounts';
import { callUntypedRpc } from '@/lib/supabaseRpc';

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

export interface BalanceSheetV2Row extends BalanceSheetRow {
  account_id: string;
  is_current_earnings: boolean;
}

export interface CashFlowRow {
  period_date: string;
  inflows: number;
  outflows: number;
  net_flow: number;
  currency: string;
}

export interface CashFlowV2Row extends CashFlowRow {
  opening_balance: number;
  closing_balance: number;
  operating_inflows: number;
  operating_outflows: number;
  investing_inflows: number;
  investing_outflows: number;
  financing_inflows: number;
  financing_outflows: number;
  other_inflows: number;
  other_outflows: number;
  entry_count: number;
}

export interface CashFlowDetailRow {
  entry_id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
  booking_id: string | null;
  booking_number: string | null;
  flow_category: 'customer_collection' | 'supplier_payment' | 'operating_expense' | 'refund' | 'investing' | 'financing' | 'opening_adjustment' | 'internal_transfer' | 'other';
  cash_accounts: string;
  cost_centers: string;
  inflow: number;
  outflow: number;
  net_flow: number;
  currency: string;
  is_locked: boolean;
}

export interface CashFlowV2Filters {
  cashAccountId?: string;
  costCenterId?: string;
  bookingType?: string;
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

export interface AgingDetailRow {
  invoice_id: string;
  invoice_number: string | null;
  customer_id?: string | null;
  customer_name?: string;
  supplier_id?: string | null;
  supplier_name?: string;
  issued_date: string;
  due_date: string;
  original_amount: number;
  paid_as_of: number;
  outstanding_amount: number;
  days_overdue: number;
  aging_bucket: 'current' | '1-30' | '31-60' | '61-90' | 'over-90';
  booking_id: string | null;
  booking_type?: string | null;
  currency: string;
  is_historical_estimate: boolean;
  is_date_corrected: boolean;
}

export interface AgingControlTotal {
  entity_type: 'customer' | 'supplier';
  aging_total: number;
  control_balance: number;
  difference: number;
  historical_estimate_count: number;
  corrected_date_count: number;
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

export const useBalanceSheetV2 = (asOfDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['balance-sheet-v2', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_balance_sheet_v2', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as BalanceSheetV2Row[];
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

const cashFlowV2Args = (
  orgId: string,
  startDate: string,
  endDate: string,
  currency: string,
  filters: CashFlowV2Filters,
) => ({
  _org_id: orgId,
  _start_date: startDate,
  _end_date: endDate,
  _currency: currency,
  _cash_account_id: filters.cashAccountId,
  _cost_center_id: filters.costCenterId,
  _booking_type: filters.bookingType,
});

export const useCashFlowV2 = (
  startDate: string,
  endDate: string,
  currency = 'EGP',
  filters: CashFlowV2Filters = {},
) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cash-flow-v2', orgId, startDate, endDate, currency, filters.cashAccountId, filters.costCenterId, filters.bookingType],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await callUntypedRpc<CashFlowV2Row[]>(
        'get_cash_flow_v2',
        cashFlowV2Args(orgId, startDate, endDate, currency, filters),
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !!startDate && !!endDate && startDate <= endDate,
  });
};

export const useCashFlowDetailsV2 = (
  startDate: string,
  endDate: string,
  currency = 'EGP',
  filters: CashFlowV2Filters = {},
) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cash-flow-details-v2', orgId, startDate, endDate, currency, filters.cashAccountId, filters.costCenterId, filters.bookingType],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await callUntypedRpc<CashFlowDetailRow[]>(
        'get_cash_flow_details_v2',
        cashFlowV2Args(orgId, startDate, endDate, currency, filters),
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && !!startDate && !!endDate && startDate <= endDate,
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

export const useCustomerAgingDetails = (asOfDate?: string, currency = 'EGP', enabled = true) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['customer-aging-details-v2', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_customer_aging_details_v2', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
        _customer_id: undefined,
      });
      if (error) throw error;
      return (data || []) as AgingDetailRow[];
    },
    enabled: !!orgId && enabled,
  });
};

export const useSupplierAgingDetails = (asOfDate?: string, currency = 'EGP', enabled = true) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['supplier-aging-details-v2', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_supplier_aging_details_v2', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
        _supplier_id: undefined,
      });
      if (error) throw error;
      return (data || []) as AgingDetailRow[];
    },
    enabled: !!orgId && enabled,
  });
};

export const useAgingControlTotals = (asOfDate?: string, currency = 'EGP') => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['aging-control-totals-v2', orgId, asOfDate, currency],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_aging_control_totals_v2', {
        _org_id: orgId,
        _as_of_date: asOfDate || undefined,
        _currency: currency,
      });
      if (error) throw error;
      return (data || []) as AgingControlTotal[];
    },
    enabled: !!orgId,
  });
};
