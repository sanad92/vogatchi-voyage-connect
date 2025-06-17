
import { useFinancialReportsImproved } from './useFinancialReportsImproved';

export const useExpenseBreakdown = (startDate?: string, endDate?: string) => {
  const { expenseBreakdown, expensesLoading } = useFinancialReportsImproved(startDate, endDate);

  return {
    expenseBreakdown,
    isLoading: expensesLoading,
  };
};
