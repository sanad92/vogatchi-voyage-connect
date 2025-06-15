
import { SupportedCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

export const useCurrencyHelper = () => {
  const formatCurrency = (amount: number, currency: SupportedCurrency) => {
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${amount.toLocaleString()} ${symbol}`;
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
