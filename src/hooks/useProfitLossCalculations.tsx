
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
        try {
          // حساب إيرادات الفنادق
          const { data: hotelRevenue } = await supabase
            .from('hotel_bookings')
            .select('total_cost_customer_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          // حساب إيرادات الطيران
          const { data: flightRevenue } = await supabase
            .from('flight_bookings')
            .select('total_cost_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          // حساب التكاليف المباشرة
          const { data: hotelCosts } = await supabase
            .from('hotel_bookings')
            .select('cost_per_night_egp, number_of_nights')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          const { data: flightCosts } = await supabase
            .from('flight_bookings')
            .select('supplier_cost_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          // حساب التكاليف غير المباشرة
          const { data: salaries } = await supabase
            .from('monthly_salaries')
            .select('net_salary_egp')
            .gte('salary_month', startDate)
            .lte('salary_month', endDate)
            .eq('status', 'paid');

          const { data: rentPayments } = await supabase
            .from('rent_payments')
            .select('amount_egp')
            .gte('payment_month', startDate)
            .lte('payment_month', endDate)
            .eq('status', 'paid');

          const { data: expenses } = await supabase
            .from('expense_transactions')
            .select('amount')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .eq('status', 'paid')
            .eq('currency', 'EGP');

          // حساب الإيرادات الإجمالية
          const totalRevenue = 
            (hotelRevenue?.reduce((sum, item) => sum + (item.total_cost_customer_egp || 0), 0) || 0) +
            (flightRevenue?.reduce((sum, item) => sum + (item.total_cost_egp || 0), 0) || 0);

          // حساب التكاليف المباشرة
          const directCosts = 
            (hotelCosts?.reduce((sum, item) => sum + ((item.cost_per_night_egp || 0) * (item.number_of_nights || 0)), 0) || 0) +
            (flightCosts?.reduce((sum, item) => sum + (item.supplier_cost_egp || 0), 0) || 0);

          // حساب التكاليف غير المباشرة
          const indirectCosts = 
            (salaries?.reduce((sum, item) => sum + (item.net_salary_egp || 0), 0) || 0) +
            (rentPayments?.reduce((sum, item) => sum + (item.amount_egp || 0), 0) || 0) +
            (expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0);

          const grossProfit = totalRevenue - directCosts;
          const netProfit = grossProfit - indirectCosts;
          const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

          return {
            total_revenue: totalRevenue,
            direct_costs: directCosts,
            indirect_costs: indirectCosts,
            gross_profit: grossProfit,
            net_profit: netProfit,
            profit_margin: profitMargin
          };
        } catch (error) {
          console.error('Error calculating profit/loss:', error);
          return {
            total_revenue: 0,
            direct_costs: 0,
            indirect_costs: 0,
            gross_profit: 0,
            net_profit: 0,
            profit_margin: 0
          };
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  // التقرير المالي الشهري
  const getMonthlyReport = (year?: number) => {
    return useQuery({
      queryKey: ['monthly-financial-report', year || new Date().getFullYear()],
      queryFn: async (): Promise<MonthlyFinancialReport[]> => {
        const targetYear = year || new Date().getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const monthNames = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const results: MonthlyFinancialReport[] = [];

        for (const month of months) {
          const startDate = `${targetYear}-${month.toString().padStart(2, '0')}-01`;
          const endDate = new Date(targetYear, month, 0).toISOString().split('T')[0];

          try {
            // حساب الإيرادات لهذا الشهر
            const { data: hotelRevenue } = await supabase
              .from('hotel_bookings')
              .select('total_cost_customer_egp')
              .gte('booking_date', startDate)
              .lte('booking_date', endDate);

            const { data: flightRevenue } = await supabase
              .from('flight_bookings')
              .select('total_cost_egp')
              .gte('booking_date', startDate)
              .lte('booking_date', endDate);

            const totalRevenue = 
              (hotelRevenue?.reduce((sum, item) => sum + (item.total_cost_customer_egp || 0), 0) || 0) +
              (flightRevenue?.reduce((sum, item) => sum + (item.total_cost_egp || 0), 0) || 0);

            // حساب التكاليف المباشرة
            const { data: hotelCosts } = await supabase
              .from('hotel_bookings')
              .select('cost_per_night_egp, number_of_nights')
              .gte('booking_date', startDate)
              .lte('booking_date', endDate);

            const { data: flightCosts } = await supabase
              .from('flight_bookings')
              .select('supplier_cost_egp')
              .gte('booking_date', startDate)
              .lte('booking_date', endDate);

            const directCosts = 
              (hotelCosts?.reduce((sum, item) => sum + ((item.cost_per_night_egp || 0) * (item.number_of_nights || 0)), 0) || 0) +
              (flightCosts?.reduce((sum, item) => sum + (item.supplier_cost_egp || 0), 0) || 0);

            // حساب التكاليف غير المباشرة
            const { data: salaries } = await supabase
              .from('monthly_salaries')
              .select('net_salary_egp')
              .gte('salary_month', startDate)
              .lte('salary_month', endDate)
              .eq('status', 'paid');

            const { data: rentPayments } = await supabase
              .from('rent_payments')
              .select('amount_egp')
              .gte('payment_month', startDate)
              .lte('payment_month', endDate)
              .eq('status', 'paid');

            const { data: expenses } = await supabase
              .from('expense_transactions')
              .select('amount')
              .gte('transaction_date', startDate)
              .lte('transaction_date', endDate)
              .eq('status', 'paid')
              .eq('currency', 'EGP');

            const indirectCosts = 
              (salaries?.reduce((sum, item) => sum + (item.net_salary_egp || 0), 0) || 0) +
              (rentPayments?.reduce((sum, item) => sum + (item.amount_egp || 0), 0) || 0) +
              (expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0);

            const grossProfit = totalRevenue - directCosts;
            const netProfit = grossProfit - indirectCosts;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

            results.push({
              month_number: month,
              month_name: monthNames[month - 1],
              total_revenue: totalRevenue,
              direct_costs: directCosts,
              indirect_costs: indirectCosts,
              gross_profit: grossProfit,
              net_profit: netProfit,
              profit_margin: profitMargin
            });
          } catch (error) {
            console.error(`Error calculating data for month ${month}:`, error);
            results.push({
              month_number: month,
              month_name: monthNames[month - 1],
              total_revenue: 0,
              direct_costs: 0,
              indirect_costs: 0,
              gross_profit: 0,
              net_profit: 0,
              profit_margin: 0
            });
          }
        }

        return results;
      }
    });
  };

  // حساب الإيرادات لفترة محددة
  const calculateRevenue = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['total-revenue', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { data: hotelRevenue } = await supabase
            .from('hotel_bookings')
            .select('total_cost_customer_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          const { data: flightRevenue } = await supabase
            .from('flight_bookings')
            .select('total_cost_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          return (
            (hotelRevenue?.reduce((sum, item) => sum + (item.total_cost_customer_egp || 0), 0) || 0) +
            (flightRevenue?.reduce((sum, item) => sum + (item.total_cost_egp || 0), 0) || 0)
          );
        } catch (error) {
          console.error('Error calculating revenue:', error);
          return 0;
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  // حساب التكاليف المباشرة
  const calculateDirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['direct-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { data: hotelCosts } = await supabase
            .from('hotel_bookings')
            .select('cost_per_night_egp, number_of_nights')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          const { data: flightCosts } = await supabase
            .from('flight_bookings')
            .select('supplier_cost_egp')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate);

          return (
            (hotelCosts?.reduce((sum, item) => sum + ((item.cost_per_night_egp || 0) * (item.number_of_nights || 0)), 0) || 0) +
            (flightCosts?.reduce((sum, item) => sum + (item.supplier_cost_egp || 0), 0) || 0)
          );
        } catch (error) {
          console.error('Error calculating direct costs:', error);
          return 0;
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  // حساب التكاليف غير المباشرة
  const calculateIndirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['indirect-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { data: salaries } = await supabase
            .from('monthly_salaries')
            .select('net_salary_egp')
            .gte('salary_month', startDate)
            .lte('salary_month', endDate)
            .eq('status', 'paid');

          const { data: rentPayments } = await supabase
            .from('rent_payments')
            .select('amount_egp')
            .gte('payment_month', startDate)
            .lte('payment_month', endDate)
            .eq('status', 'paid');

          const { data: expenses } = await supabase
            .from('expense_transactions')
            .select('amount')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .eq('status', 'paid')
            .eq('currency', 'EGP');

          return (
            (salaries?.reduce((sum, item) => sum + (item.net_salary_egp || 0), 0) || 0) +
            (rentPayments?.reduce((sum, item) => sum + (item.amount_egp || 0), 0) || 0) +
            (expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0)
          );
        } catch (error) {
          console.error('Error calculating indirect costs:', error);
          return 0;
        }
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
