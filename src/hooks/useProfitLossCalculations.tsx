
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

// دالة مساعدة لجلب بيانات فترة معينة
const fetchPeriodData = async (startDate: string, endDate: string) => {
  // إيرادات الفنادق
  const { data: hotelRevenue } = await (supabase
    .from('hotel_bookings')
    .select('total_cost_customer, total_profit')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate) as any);

  // إيرادات الطيران
  const { data: flightRevenue } = await supabase
    .from('flight_bookings')
    .select('total_cost_egp')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  // إيرادات النقل
  const { data: transportRevenue } = await supabase
    .from('transport_bookings')
    .select('total_cost')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  // إيرادات تأجير السيارات
  const { data: carRentalRevenue } = await supabase
    .from('car_rentals')
    .select('total_rental_cost, total_cost_egp')
    .gte('rental_start_date', startDate)
    .lte('rental_start_date', endDate);

  // تكاليف الفنادق المباشرة
  const { data: hotelCosts } = await (supabase
    .from('hotel_bookings')
    .select('cost_per_night, number_of_nights')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate) as any);

  // تكاليف الطيران المباشرة
  const { data: flightCosts } = await supabase
    .from('flight_bookings')
    .select('supplier_cost_egp')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  // تكاليف النقل المباشرة
  const { data: transportCosts } = await supabase
    .from('transport_bookings')
    .select('supplier_cost')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate);

  // تكاليف تأجير السيارات المباشرة
  const { data: carRentalCosts } = await supabase
    .from('car_rentals')
    .select('supplier_total_cost, supplier_cost_egp, insurance_cost, additional_fees')
    .gte('rental_start_date', startDate)
    .lte('rental_start_date', endDate);

  // تكاليف غير مباشرة
  const { data: salaries } = await (supabase
    .from('monthly_salaries' as any)
    .select('net_salary_egp')
    .gte('salary_month', startDate)
    .lte('salary_month', endDate)
    .eq('status', 'paid') as any);

  const { data: rentPayments } = await (supabase
    .from('rent_payments' as any)
    .select('amount_egp')
    .gte('payment_month', startDate)
    .lte('payment_month', endDate)
    .eq('status', 'paid') as any);

  // مصروفات - جلب الكل مع سعر الصرف
  const { data: expensesEGP } = await supabase
    .from('expense_transactions')
    .select('amount')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .eq('status', 'paid')
    .eq('currency', 'EGP');

  const { data: expensesOther } = await supabase
    .from('expense_transactions')
    .select('amount, currency')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .eq('status', 'paid')
    .neq('currency', 'EGP');

  // جلب أسعار الصرف
  const { data: exchangeRates } = await supabase
    .from('exchange_rates')
    .select('from_currency, rate')
    .eq('to_currency', 'EGP')
    .eq('is_active', true);

  const rateMap: Record<string, number> = {};
  exchangeRates?.forEach((r: any) => { rateMap[r.from_currency] = r.rate; });

  // حساب الإيرادات
  const totalRevenue =
    (hotelRevenue?.reduce((sum: number, item: any) => sum + (item.total_cost_customer || 0), 0) || 0) +
    (flightRevenue?.reduce((sum: number, item: any) => sum + (item.total_cost_egp || 0), 0) || 0) +
    (transportRevenue?.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0) || 0) +
    (carRentalRevenue?.reduce((sum: number, item: any) => sum + (item.total_cost_egp || item.total_rental_cost || 0), 0) || 0);

  // حساب التكاليف المباشرة
  const directCosts =
    (hotelCosts?.reduce((sum: number, item: any) => sum + ((item.cost_per_night || 0) * (item.number_of_nights || 0)), 0) || 0) +
    (flightCosts?.reduce((sum: number, item: any) => sum + (item.supplier_cost_egp || 0), 0) || 0) +
    (transportCosts?.reduce((sum: number, item: any) => sum + (item.supplier_cost || 0), 0) || 0) +
    (carRentalCosts?.reduce((sum: number, item: any) => sum + (item.supplier_cost_egp || item.supplier_total_cost || 0) + (item.insurance_cost || 0) + (item.additional_fees || 0), 0) || 0);

  // حساب التكاليف غير المباشرة
  const expensesEGPTotal = expensesEGP?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
  const expensesOtherTotal = expensesOther?.reduce((sum: number, item: any) => {
    const rate = rateMap[item.currency] || 1;
    return sum + ((item.amount || 0) * rate);
  }, 0) || 0;

  const indirectCosts =
    (salaries?.reduce((sum: number, item: any) => sum + (item.net_salary_egp || 0), 0) || 0) +
    (rentPayments?.reduce((sum: number, item: any) => sum + (item.amount_egp || 0), 0) || 0) +
    expensesEGPTotal + expensesOtherTotal;

  const grossProfit = totalRevenue - directCosts;
  const netProfit = grossProfit - indirectCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return { totalRevenue, directCosts, indirectCosts, grossProfit, netProfit, profitMargin };
};

export const useProfitLossCalculations = () => {
  const calculateProfitLoss = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['profit-loss', startDate, endDate],
      queryFn: async (): Promise<ProfitLossData> => {
        try {
          const result = await fetchPeriodData(startDate, endDate);
          return {
            total_revenue: result.totalRevenue,
            direct_costs: result.directCosts,
            indirect_costs: result.indirectCosts,
            gross_profit: result.grossProfit,
            net_profit: result.netProfit,
            profit_margin: result.profitMargin
          };
        } catch (error) {
          console.error('Error calculating profit/loss:', error);
          return { total_revenue: 0, direct_costs: 0, indirect_costs: 0, gross_profit: 0, net_profit: 0, profit_margin: 0 };
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  const getMonthlyReport = (year?: number) => {
    return useQuery({
      queryKey: ['monthly-financial-report', year || new Date().getFullYear()],
      queryFn: async (): Promise<MonthlyFinancialReport[]> => {
        const targetYear = year || new Date().getFullYear();
        const monthNames = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const results: MonthlyFinancialReport[] = [];

        for (let month = 1; month <= 12; month++) {
          const startDate = `${targetYear}-${month.toString().padStart(2, '0')}-01`;
          const endDate = new Date(targetYear, month, 0).toISOString().split('T')[0];

          try {
            const data = await fetchPeriodData(startDate, endDate);
            results.push({
              month_number: month,
              month_name: monthNames[month - 1],
              total_revenue: data.totalRevenue,
              direct_costs: data.directCosts,
              indirect_costs: data.indirectCosts,
              gross_profit: data.grossProfit,
              net_profit: data.netProfit,
              profit_margin: data.profitMargin
            });
          } catch (error) {
            console.error(`Error calculating data for month ${month}:`, error);
            results.push({
              month_number: month, month_name: monthNames[month - 1],
              total_revenue: 0, direct_costs: 0, indirect_costs: 0, gross_profit: 0, net_profit: 0, profit_margin: 0
            });
          }
        }
        return results;
      }
    });
  };

  const calculateRevenue = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['total-revenue', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { totalRevenue } = await fetchPeriodData(startDate, endDate);
          return totalRevenue;
        } catch (error) {
          console.error('Error calculating revenue:', error);
          return 0;
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  const calculateDirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['direct-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { directCosts } = await fetchPeriodData(startDate, endDate);
          return directCosts;
        } catch (error) {
          console.error('Error calculating direct costs:', error);
          return 0;
        }
      },
      enabled: !!startDate && !!endDate
    });
  };

  const calculateIndirectCosts = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['indirect-costs', startDate, endDate],
      queryFn: async (): Promise<number> => {
        try {
          const { indirectCosts } = await fetchPeriodData(startDate, endDate);
          return indirectCosts;
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
