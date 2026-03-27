
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
          supabase.from('hotel_bookings').select('total_cost_customer, total_profit, created_at').order('created_at', { ascending: false }),
          supabase.from('flight_bookings').select('total_cost_egp, total_profit, created_at').order('created_at', { ascending: false }),
          supabase.from('car_rentals').select('total_cost_egp, total_rental_cost, total_profit, created_at').order('created_at', { ascending: false }),
          supabase.from('transport_bookings').select('total_cost, total_profit, created_at').order('created_at', { ascending: false }),
          supabase.from('customers').select('id, name, total_bookings, loyalty_points, created_at').order('created_at', { ascending: false }),
          supabase.from('hotel_bookings').select('id, customer_name, hotel_name, total_cost_customer, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('customers').select('id, name, created_at').order('created_at', { ascending: false }).limit(2)
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

        let monthlyGrowth = 0;
        try {
          const now = new Date();
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
          crmStats: { vipCustomers, loyaltyPoints },
          customers, recentBookings, recentCustomers
        };
      } catch {
        return { realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0, netProfit: 0 }, crmStats: { vipCustomers: 0, loyaltyPoints: 0 }, customers: [], recentBookings: [], recentCustomers: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
    enabled: !!orgId,
  });

  return { dashboardData: data, isLoading, error };
};
