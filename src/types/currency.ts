
// تحديث نوع العملة ليشمل العملات الإضافية
export type SupportedCurrency = 'EGP' | 'USD' | 'SAR' | 'EUR' | 'GBP' | 'AED';

// العملة الأساسية للنظام
export const PRIMARY_CURRENCY: SupportedCurrency = 'EGP';

// قائمة العملات المدعومة
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['EGP', 'USD', 'SAR', 'EUR', 'GBP', 'AED'];

// رموز العملات
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EGP: 'ج.م',
  USD: '$',
  SAR: 'ر.س',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ'
};

// أسماء العملات
export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EGP: 'جنيه مصري',
  USD: 'دولار أمريكي',
  SAR: 'ريال سعودي',
  EUR: 'يورو',
  GBP: 'جنيه إسترليني',
  AED: 'درهم إماراتي'
};

// نوع الحساب البنكي
export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: SupportedCurrency;
  current_balance: number;
  account_type: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// نوع معاملة الحساب البنكي
export interface BankAccountTransaction {
  id: string;
  bank_account_id: string;
  transaction_type: string;
  amount: number;
  description?: string;
  transaction_date: string;
  reference_number?: string;
  related_invoice_id?: string;
  related_payment_order_id?: string;
  created_at: string;
  created_by?: string;
}

// نوع سعر الصرف
export interface ExchangeRate {
  id: string;
  from_currency: SupportedCurrency;
  to_currency: SupportedCurrency;
  rate: number;
  effective_date: string;
  created_at: string;
  created_by?: string;
  is_active: boolean;
}

// نوع عقد المورد - محدث ليطابق قاعدة البيانات
export interface SupplierContract {
  id: string;
  supplier_id: string;
  contract_number: string;
  contract_type: string;
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

// نوع تقييم المورد - محدث ليطابق قاعدة البيانات
export interface SupplierRating {
  id: string;
  supplier_id: string;
  service_quality: number;
  delivery_time: number;
  price_competitiveness: number;
  communication: number;
  overall_rating: number;
  feedback?: string;
  rated_by: string;
  rating_date: string;
  created_at: string;
}
