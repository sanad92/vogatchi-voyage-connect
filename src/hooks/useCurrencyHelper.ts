
import { SupportedCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

export const useCurrencyHelper = () => {
  const formatCurrency = (amount: number, currency?: SupportedCurrency | string | null) => {
    // Safety: never render "undefined" to users. Falls back to EGP if missing/invalid.
    let resolved: SupportedCurrency = 'EGP';
    if (currency && (currency as string) in CURRENCY_SYMBOLS) {
      resolved = currency as SupportedCurrency;
    } else if (currency) {
      // Unknown currency string; warn in dev so we can trace the source
      if (typeof console !== 'undefined') {
        console.warn(`[formatCurrency] Unknown currency "${currency}", defaulting to EGP`);
      }
    }
    const symbol = CURRENCY_SYMBOLS[resolved];
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${safeAmount.toLocaleString()} ${symbol}`;
  };

  const getCurrencyName = (currency: SupportedCurrency) => {
    return CURRENCY_NAMES[currency];
  };

  const getCurrencySymbol = (currency: SupportedCurrency) => {
    return CURRENCY_SYMBOLS[currency];
  };

  const validateCurrency = (currency: string): currency is SupportedCurrency => {
    return Object.keys(CURRENCY_SYMBOLS).includes(currency);
  };

  const ensureSupportedCurrency = (currency: string | undefined): SupportedCurrency => {
    if (!currency || !validateCurrency(currency)) {
      return 'EGP';
    }
    return currency;
  };

  return {
    formatCurrency,
    getCurrencyName,
    getCurrencySymbol,
    validateCurrency,
    ensureSupportedCurrency,
  };
};
