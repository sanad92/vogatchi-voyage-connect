
export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  created_at: string;
  created_by?: string;
  is_active: boolean;
}

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  account_type: string;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface BankAccountTransaction {
  id: string;
  bank_account_id: string;
  transaction_type: 'debit' | 'credit';
  amount: number;
  description?: string;
  reference_number?: string;
  related_invoice_id?: string;
  related_payment_order_id?: string;
  transaction_date: string;
  created_at: string;
  created_by?: string;
}

export interface MultiCurrencyInvoice {
  id: string;
  invoice_number: string;
  currency: string;
  final_amount: number;
  exchange_rate_to_egp: number;
  total_amount_egp: number;
  exchange_rate_to_usd?: number;
  total_amount_usd?: number;
  exchange_rate_to_sar?: number;
  total_amount_sar?: number;
}

export interface MultiCurrencyPaymentOrder {
  id: string;
  order_number: string;
  amount: number;
  currency: string;
  bank_account_id?: string;
  exchange_rate: number;
  amount_in_account_currency?: number;
}

// الجنيه المصري كعملة أساسية ووحيدة
export const SUPPORTED_CURRENCIES = ['EGP'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const PRIMARY_CURRENCY: SupportedCurrency = 'EGP';

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EGP: 'ج.م'
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EGP: 'جنيه مصري'
};

export interface SupplierContract {
  id: string;
  supplier_id: string;
  contract_number: string;
  contract_type: 'service' | 'supply' | 'maintenance';
  start_date: string;
  end_date: string;
  contract_value: number;
  currency: SupportedCurrency;
  payment_terms: string;
  terms_and_conditions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  contract_id?: string;
  amount: number;
  currency: SupportedCurrency;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  exchange_rate: number;
  amount_in_egp: number;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface SupplierRating {
  id: string;
  supplier_id: string;
  service_quality: number;
  delivery_time: number;
  price_competitiveness: number;
  communication: number;
  overall_rating: number;
  feedback: string;
  rated_by: string;
  rating_date: string;
}
