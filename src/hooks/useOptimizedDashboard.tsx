
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from './useOrgId';

export const useOptimizedDashboard = () => {
  const orgId = useOrgId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard', orgId],
    queryFn: async () => {
      try {
        const [hotelBookingsResult, flightBookingsResult, carRentalsResult, transportResult, customersResult, recentBookingsResult, recentCustomersResult] = await Promise.allSettled([
          supabase.from('hotel_bookings').select('total_cost_customer, total_profit, paid_amount, check_in_date, check_out_date, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('flight_bookings').select('total_cost_egp, total_profit, paid_amount, departure_date, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('car_rentals').select('total_cost_egp, total_rental_cost, total_profit, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('transport_bookings').select('total_cost, total_profit, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('customers').select('id, name, total_bookings, loyalty_points, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }),
          supabase.from('hotel_bookings').select('id, customer_name, hotel_name, total_cost_customer, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(3),
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
        const totalRevenue =
          hotelBookings.reduce((sum: number, b: any) => sum + (b.total_cost_customer || 0), 0) +
          flightBookings.reduce((sum: number, b: any) => sum + (b.total_cost_egp || 0), 0) +
          carRentals.reduce((sum: number, b: any) => sum + (b.total_cost_egp || b.total_rental_cost || 0), 0) +
          transports.reduce((sum: number, b: any) => sum + (b.total_cost || 0), 0);
        const netProfit =
          hotelBookings.reduce((sum: number, b: any) => sum + (b.total_profit || 0), 0) +
          flightBookings.reduce((sum: number, b: any) => sum + (b.total_profit || 0), 0) +
          carRentals.reduce((sum: number, b: any) => sum + (b.total_profit || 0), 0) +
          transports.reduce((sum: number, b: any) => sum + (b.total_profit || 0), 0);
        const activeCustomers = customers.length;

        // Outstanding receivables (customer paid less than total)
        const outstandingAmount =
          hotelBookings.reduce((s: number, b: any) => s + Math.max(0, (b.total_cost_customer || 0) - (b.paid_amount || 0)), 0) +
          flightBookings.reduce((s: number, b: any) => s + Math.max(0, (b.total_cost_egp || 0) - (b.paid_amount || 0)), 0);
        const outstandingCount =
          hotelBookings.filter((b: any) => (b.total_cost_customer || 0) > (b.paid_amount || 0)).length +
          flightBookings.filter((b: any) => (b.total_cost_egp || 0) > (b.paid_amount || 0)).length;

        // Today / week activity
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
        const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;

        const todayBookingsCount =
          hotelBookings.filter((b: any) => { const t = new Date(b.created_at).getTime(); return t >= startOfDay && t < endOfDay; }).length +
          flightBookings.filter((b: any) => { const t = new Date(b.created_at).getTime(); return t >= startOfDay && t < endOfDay; }).length;
        const weekBookingsCount =
          hotelBookings.filter((b: any) => new Date(b.created_at).getTime() >= startOfWeek).length +
          flightBookings.filter((b: any) => new Date(b.created_at).getTime() >= startOfWeek).length;
        const newCustomersToday = customers.filter((c: any) => new Date(c.created_at).getTime() >= startOfDay).length;

        // Bookings ending today (hotel checkouts)
        const checkoutsToday = hotelBookings.filter((b: any) => {
          if (!b.check_out_date) return false;
          const d = new Date(b.check_out_date);
          return d >= new Date(startOfDay) && d < new Date(endOfDay);
        }).length;

        let monthlyGrowth = 0;
        try {
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const allBookings = [...hotelBookings.map((b: any) => ({ ...b, rev: b.total_cost_customer || 0 })), ...flightBookings.map((b: any) => ({ ...b, rev: b.total_cost_egp || 0 }))];
          const currentMonthRevenue = allBookings.filter((b: any) => { try { return new Date(b.created_at) >= currentMonthStart; } catch { return false; } }).reduce((s: number, b: any) => s + b.rev, 0);
          const previousMonthRevenue = allBookings.filter((b: any) => { try { const d = new Date(b.created_at); return d >= previousMonthStart && d < currentMonthStart; } catch { return false; } }).reduce((s: number, b: any) => s + b.rev, 0);
          monthlyGrowth = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;
        } catch {}

        const vipCustomers = customers.filter((c: any) => (c.total_bookings || 0) >= 10).length;
        const loyaltyPoints = customers.reduce((s: number, c: any) => s + (c.loyalty_points || 0), 0);

        return {
          realStats: { totalBookings, totalRevenue, activeCustomers, monthlyGrowth: Number(monthlyGrowth.toFixed(1)), netProfit },
          alerts: { outstandingAmount, outstandingCount, checkoutsToday },
          today: { todayBookingsCount, weekBookingsCount, newCustomersToday },
          crmStats: { vipCustomers, loyaltyPoints },
          customers, recentBookings, recentCustomers
        };
      } catch {
        return {
          realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0, netProfit: 0 },
          alerts: { outstandingAmount: 0, outstandingCount: 0, checkoutsToday: 0 },
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
