
import { useState, useEffect } from 'react';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency, PRIMARY_CURRENCY } from '@/types/currency';

interface MultiCurrencyAmount {
  amount: number;
  currency: SupportedCurrency;
  amountInPrimary?: number;
  exchangeRate?: number;
}

export const useMultiCurrency = () => {
  const { getCurrentRate, convertToPrimaryCurrency } = useExchangeRates();

  const convertAmount = async (
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;
    
    const rate = await getCurrentRate(fromCurrency, toCurrency);
    return amount * rate;
  };

  const formatMultiCurrencyAmount = async (
    amount: number,
    currency: SupportedCurrency
  ): Promise<MultiCurrencyAmount> => {
    let amountInPrimary = amount;
    let exchangeRate = 1;

    if (currency !== PRIMARY_CURRENCY) {
      exchangeRate = await getCurrentRate(currency, PRIMARY_CURRENCY);
      amountInPrimary = await convertToPrimaryCurrency(amount, currency);
    }

    return {
      amount,
      currency,
      amountInPrimary,
      exchangeRate
    };
  };

  const calculateTotalInPrimary = async (
    amounts: Array<{ amount: number; currency: SupportedCurrency }>
  ): Promise<number> => {
    let total = 0;
    
    for (const item of amounts) {
      const amountInPrimary = await convertToPrimaryCurrency(item.amount, item.currency);
      total += amountInPrimary;
    }
    
    return total;
  };

  return {
    convertAmount,
    formatMultiCurrencyAmount,
    calculateTotalInPrimary,
    PRIMARY_CURRENCY
  };
};
