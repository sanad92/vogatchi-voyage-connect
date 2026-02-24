
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from './useOrgId';

export const useOptimizedDashboard = () => {
  const orgId = useOrgId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard', orgId],
    queryFn: async () => {
      try {
        const [hotelBookingsResult, customersResult, recentBookingsResult, recentCustomersResult] = await Promise.allSettled([
          supabase.from('hotel_bookings').select('total_cost_customer, created_at').order('created_at', { ascending: false }),
          supabase.from('customers').select('id, name, total_bookings, loyalty_points, created_at').order('created_at', { ascending: false }),
          supabase.from('hotel_bookings').select('id, customer_name, hotel_name, total_cost_customer, created_at').order('created_at', { ascending: false }).limit(3),
          supabase.from('customers').select('id, name, created_at').order('created_at', { ascending: false }).limit(2)
        ]);

        const hotelBookings = hotelBookingsResult.status === 'fulfilled' && !hotelBookingsResult.value.error ? hotelBookingsResult.value.data || [] : [];
        const customers = customersResult.status === 'fulfilled' && !customersResult.value.error ? customersResult.value.data || [] : [];
        const recentBookings = recentBookingsResult.status === 'fulfilled' && !recentBookingsResult.value.error ? recentBookingsResult.value.data || [] : [];
        const recentCustomers = recentCustomersResult.status === 'fulfilled' && !recentCustomersResult.value.error ? recentCustomersResult.value.data || [] : [];

        const totalBookings = hotelBookings.length;
        const totalRevenue = hotelBookings.reduce((sum, b) => sum + (b.total_cost_customer || 0), 0);
        const activeCustomers = customers.length;

        let monthlyGrowth = 0;
        try {
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const currentMonthRevenue = hotelBookings.filter(b => { try { return new Date(b.created_at) >= currentMonthStart; } catch { return false; } }).reduce((s, b) => s + (b.total_cost_customer || 0), 0);
          const previousMonthRevenue = hotelBookings.filter(b => { try { const d = new Date(b.created_at); return d >= previousMonthStart && d < currentMonthStart; } catch { return false; } }).reduce((s, b) => s + (b.total_cost_customer || 0), 0);
          monthlyGrowth = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;
        } catch {}

        const vipCustomers = customers.filter(c => (c.total_bookings || 0) >= 10).length;
        const loyaltyPoints = customers.reduce((s, c) => s + (c.loyalty_points || 0), 0);

        return {
          realStats: { totalBookings, totalRevenue, activeCustomers, monthlyGrowth: Number(monthlyGrowth.toFixed(1)) },
          crmStats: { vipCustomers, loyaltyPoints },
          customers, recentBookings, recentCustomers
        };
      } catch {
        return { realStats: { totalBookings: 0, totalRevenue: 0, activeCustomers: 0, monthlyGrowth: 0 }, crmStats: { vipCustomers: 0, loyaltyPoints: 0 }, customers: [], recentBookings: [], recentCustomers: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
    enabled: !!orgId,
  });

  return { dashboardData: data, isLoading, error };
};
