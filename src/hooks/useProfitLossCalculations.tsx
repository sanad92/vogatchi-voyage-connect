
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfitLossData {
  total_revenue: number;
  direct_costs: number;
  indirect_costs: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
}

export interface MonthlyFinancialReport {
  month_number: number;
  month_name: string;
  total_revenue: number;
  direct_costs: number;
  indirect_costs: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export const useProfitLossCalculations = () => {
  // حساب الأرباح والخسائر لفترة محددة
  const calculateProfitLoss = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['profit-loss', startDate, endDate],
      queryFn: async (): Promise<ProfitLossData> => {
        const { data, error } = await supabase.rpc('calculate_net_profit', {
          start_date: startDate,
          end_date: endDate
        });

        if (error) throw error;
        return data[0] || {
          total_revenue: 0,
          direct_costs: 0,
          indirect_costs: 0,
          gross_profit: 0,
          net_profit: 0,
          profit_margin: 0
        };
      },
      enabled: !!startDate && !!endDate
    });
  };

  // التقرير المالي الشهري
  const getMonthlyReport = (year?: number) => {
    return useQuery({
      queryKey: ['monthly-financial-report', year || new Date().getFullYear()],
      queryFn: async (): Promise<MonthlyFinancialReport[]> => {
        const { data, error } = await supabase.rpc('get_monthly_financial_report', {
          target_year: year || new Date().getFullYear()
        });

        if (error) throw error;
        return data || [];
      }
    });
  };

  // حساب الإيرادات لفترة محددة
  const calculateRevenue = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['total-revenue', startDate, endDate],
      queryFn: async (): Promise<number> => {
        const { data, error } = await supabase.rpc('calculate_total_revenue', {
          start_date: startDate,
          end_date: endDate
        });

        if (error) throw error;
        return data || 0;
      },
      enabled: !!startDate && !!endDate
    });
  };

  // حساب التكاليف المباشرة
  const calculateDirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['direct-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        const { data, error } = await supabase.rpc('calculate_direct_costs', {
          start_date: startDate,
          end_date: endDate
        });

        if (error) throw error;
        return data || 0;
      },
      enabled: !!startDate && !!endDate
    });
  };

  // حساب التكاليف غير المباشرة
  const calculateIndirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['indirect-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        const { data, error } = await supabase.rpc('calculate_indirect_costs', {
          start_date: startDate,
          end_date: endDate
        });

        if (error) throw error;
        return data || 0;
      },
      enabled: !!startDate && !!endDate
    });
  };

  return {
    calculateProfitLoss,
    getMonthlyReport,
    calculateRevenue,
    calculateDirectCosts,
    calculateIndirectCosts
  };
};
