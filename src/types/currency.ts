
// تحديث نوع العملة ليشمل العملات الإضافية
export type SupportedCurrency = 'EGP' | 'USD' | 'SAR' | 'EUR' | 'GBP' | 'AED';

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
