
import { useMemo } from 'react';
import { useFinancialReportsImproved } from './useFinancialReportsImproved';

export const useFinancialSummary = (startDate?: string, endDate?: string) => {
  const { getFinancialSummary, isLoading } = useFinancialReportsImproved(startDate, endDate);

  const summary = useMemo(() => {
    return getFinancialSummary();
  }, [getFinancialSummary]);

  return {
    summary,
    isLoading,
  };
};
