
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from './useOrgId';

export interface CurrencyTotals {
  currency: string;
  totalRevenue: number;
  netProfit: number;
  outstandingAmount: number;
  outstandingCount: number;
  bookingsCount: number;
  monthlyGrowth: number;
}

export const useOptimizedDashboard = () => {
  const orgId = useOrgId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard', orgId],
    queryFn: async () => {
      try {
        const [hotelBookingsResult, flightBookingsResult, carRentalsResult, transportResult, customersResult, recentBookingsResult, recentCustomersResult] = await Promise.allSettled([
          supabase.from('hotel_bookings').select('total_cost_customer, total_profit, paid_amount, currency, check_in_date, check_out_date, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('flight_bookings').select('total_cost_egp, total_profit, paid_amount, currency, departure_date, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('car_rentals').select('total_cost_egp, total_rental_cost, total_profit, currency, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('transport_bookings').select('total_cost, total_profit, currency, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('customers').select('id, name, total_bookings, loyalty_points, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('hotel_bookings').select('id, customer_name, hotel_name, total_cost_customer, currency, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(3),
          supabase.from('customers').select('id, name, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(2)
        ]);

        const hotelBookings = hotelBookingsResult.status === 'fulfilled' && !hotelBookingsResult.value.error ? hotelBookingsResult.value.data || [] : [];
        const flightBookings = flightBookingsResult.status === 'fulfilled' && !flightBookingsResult.value.error ? flightBookingsResult.value.data || [] : [];
        const carRentals = carRentalsResult.status === 'fulfilled' && !carRentalsResult.value.error ? carRentalsResult.value.data || [] : [];
        const transports = transportResult.status === 'fulfilled' && !transportResult.value.error ? transportResult.value.data || [] : [];
        const customers = customersResult.status === 'fulfilled' && !customersResult.value.error ? customersResult.value.data || [] : [];
        const recentBookings = recentBookingsResult.status === 'fulfilled' && !recentBookingsResult.value.error ? recentBookingsResult.value.data || [] : [];
        const recentCustomers = recentCustomersResult.status === 'fulfilled' && !recentCustomersResult.value.error ? recentCustomersResult.value.data || [] : [];

        const totalBookings = hotelBookings.length + flightBookings.length + carRentals.length + transports.length;

        // Normalize and aggregate per currency
        type Row = { currency: string; revenue: number; profit: number; paid: number; created_at: string };
        const rows: Row[] = [
          ...hotelBookings.map((b: any) => ({ currency: b.currency || 'EGP', revenue: +b.total_cost_customer || 0, profit: +b.total_profit || 0, paid: +b.paid_amount || 0, created_at: b.created_at })),
          ...flightBookings.map((b: any) => ({ currency: b.currency || 'EGP', revenue: +b.total_cost_egp || 0, profit: +b.total_profit || 0, paid: +b.paid_amount || 0, created_at: b.created_at })),
          ...carRentals.map((b: any) => ({ currency: b.currency || 'EGP', revenue: +(b.total_cost_egp || b.total_rental_cost) || 0, profit: +b.total_profit || 0, paid: 0, created_at: b.created_at })),
          ...transports.map((b: any) => ({ currency: b.currency || 'EGP', revenue: +b.total_cost || 0, profit: +b.total_profit || 0, paid: 0, created_at: b.created_at })),
        ];

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
        const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

        const byCurrencyMap: Record<string, CurrencyTotals & { _curRev: number; _prevRev: number }> = {};
        for (const r of rows) {
          const c = r.currency;
          if (!byCurrencyMap[c]) {
            byCurrencyMap[c] = { currency: c, totalRevenue: 0, netProfit: 0, outstandingAmount: 0, outstandingCount: 0, bookingsCount: 0, monthlyGrowth: 0, _curRev: 0, _prevRev: 0 };
          }
          const agg = byCurrencyMap[c];
          agg.totalRevenue += r.revenue;
          agg.netProfit += r.profit;
          const out = Math.max(0, r.revenue - r.paid);
          agg.outstandingAmount += out;
          if (out > 0) agg.outstandingCount += 1;
          agg.bookingsCount += 1;
          const t = new Date(r.created_at).getTime();
          if (t >= currentMonthStart) agg._curRev += r.revenue;
          else if (t >= previousMonthStart && t < currentMonthStart) agg._prevRev += r.revenue;
        }
        const byCurrency: CurrencyTotals[] = Object.values(byCurrencyMap)
          .map((a) => ({
            currency: a.currency,
            totalRevenue: a.totalRevenue,
            netProfit: a.netProfit,
            outstandingAmount: a.outstandingAmount,
            outstandingCount: a.outstandingCount,
            bookingsCount: a.bookingsCount,
            monthlyGrowth: a._prevRev > 0 ? Number(((a._curRev - a._prevRev) / a._prevRev * 100).toFixed(1)) : 0,
          }))
          .sort((x, y) => y.totalRevenue - x.totalRevenue);

        const primary = byCurrency[0] || { currency: 'EGP', totalRevenue: 0, netProfit: 0, outstandingAmount: 0, outstandingCount: 0, bookingsCount: 0, monthlyGrowth: 0 };

        const todayBookingsCount =
          hotelBookings.filter((b: any) => { const t = new Date(b.created_at).getTime(); return t >= startOfDay && t < endOfDay; }).length +
          flightBookings.filter((b: any) => { const t = new Date(b.created_at).getTime(); return t >= startOfDay && t < endOfDay; }).length;
        const weekBookingsCount =
          hotelBookings.filter((b: any) => new Date(b.created_at).getTime() >= startOfWeek).length +
          flightBookings.filter((b: any) => new Date(b.created_at).getTime() >= startOfWeek).length;
        const newCustomersToday = customers.filter((c: any) => new Date(c.created_at).getTime() >= startOfDay).length;

        const checkoutsToday = hotelBookings.filter((b: any) => {
          if (!b.check_out_date) return false;
          const d = new Date(b.check_out_date);
          return d >= new Date(startOfDay) && d < new Date(endOfDay);
        }).length;

        const vipCustomers = customers.filter((c: any) => (c.total_bookings || 0) >= 10).length;
        const loyaltyPoints = customers.reduce((s: number, c: any) => s + (c.loyalty_points || 0), 0);

        return {
          realStats: {
            totalBookings,
            totalRevenue: primary.totalRevenue,
            activeCustomers: customers.length,
            monthlyGrowth: primary.monthlyGrowth,
            netProfit: primary.netProfit,
            currency: primary.currency,
          },
          byCurrency,
          alerts: { outstandingAmount: primary.outstandingAmount, outstandingCount: primary.outstandingCount, checkoutsToday, currency: primary.currency },
          today: { todayBookingsCount, weekBookingsCount, newCustomersToday },
          crmStats: { vipCustomers, loyaltyPoints },
          customers, recentBookings, recentCustomers
        };
      } catch {
        return {
          realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0, netProfit: 0, currency: 'EGP' },
          byCurrency: [] as CurrencyTotals[],
          alerts: { outstandingAmount: 0, outstandingCount: 0, checkoutsToday: 0, currency: 'EGP' },
          today: { todayBookingsCount: 0, weekBookingsCount: 0, newCustomersToday: 0 },
          crmStats: { vipCustomers: 0, loyaltyPoints: 0 },
          customers: [], recentBookings: [], recentCustomers: []
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
    enabled: !!orgId,
  });

  return { dashboardData: data, isLoading, error };
};
