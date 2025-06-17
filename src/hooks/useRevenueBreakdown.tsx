
import { useFinancialReportsImproved } from './useFinancialReportsImproved';

export const useRevenueBreakdown = (startDate?: string, endDate?: string) => {
  const { revenueBreakdown, revenueLoading } = useFinancialReportsImproved(startDate, endDate);

  return {
    revenueBreakdown,
    isLoading: revenueLoading,
  };
};
