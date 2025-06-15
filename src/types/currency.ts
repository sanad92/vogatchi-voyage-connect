
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

export const SUPPORTED_CURRENCIES = ['EGP', 'USD', 'SAR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EGP: 'ج.م',
  USD: '$',
  SAR: 'ر.س'
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EGP: 'جنيه مصري',
  USD: 'دولار أمريكي',
  SAR: 'ريال سعودي'
};
