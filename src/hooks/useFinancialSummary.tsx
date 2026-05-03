import { useFinancialReportsImproved, CurrencySummary } from './useFinancialReportsImproved';

export const useFinancialSummary = (startDate?: string, endDate?: string) => {
  const { summaryByCurrency, isLoading } = useFinancialReportsImproved(startDate, endDate);
  return {
    summaryByCurrency: summaryByCurrency as CurrencySummary[],
    isLoading,
  };
};
