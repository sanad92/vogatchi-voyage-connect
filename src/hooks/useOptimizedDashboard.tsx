import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useOrgId } from './useOrgId';
import { useSupabasePermissions } from './useSupabasePermissions';
import type { ExecutiveKpiDashboard } from './useExecutiveKpis';

export interface CurrencyTotals {
  currency: string; totalRevenue: number; netProfit: number;
  outstandingAmount: number; outstandingCount: number;
  bookingsCount: number; monthlyGrowth: number;
}

export const useOptimizedDashboard = (currency = 'EGP') => {
  const orgId = useOrgId();
  const { hasPermission, loading } = useSupabasePermissions();
  const financialAccess = hasPermission('financial_view');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = `${now.getFullYear()}-01-01`;
  const dayStart = `${today}T00:00:00Z`;
  const weekStart = new Date(Date.parse(dayStart) - 6 * 86400000).toISOString();
  const query = useQuery({
    queryKey: ['optimized-dashboard-v2', orgId, currency, today, financialAccess],
    enabled: !!orgId && !loading,
    queryFn: async () => {
      const [bookings, weekBookings, customers, checkouts, finance] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).gte('created_at', dayStart),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).gte('created_at', weekStart),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).gte('created_at', dayStart),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).eq('end_date', today).eq('booking_type', 'hotel').in('status', ['confirmed', 'completed', 'paid']),
        financialAccess ? callUntypedRpc<ExecutiveKpiDashboard>('get_executive_kpi_dashboard', {
          _org_id: orgId, _start_date: start, _end_date: today, _currency: currency,
        }) : Promise.resolve({ data: null, error: null }),
      ]);
      for (const result of [bookings, weekBookings, customers, checkouts, finance]) {
        if (result.error) throw result.error;
      }
      if (financialAccess && !finance.data) throw new Error('لم تصل بيانات المؤشرات المالية');
      const summary = finance.data?.summary;
      return {
        realStats: {
          totalBookings: summary?.bookings_count ?? 0, totalRevenue: summary?.selling ?? 0,
          activeCustomers: 0, monthlyGrowth: finance.data?.comparison.selling_change_pct ?? 0,
          netProfit: summary?.net_contribution ?? 0, currency,
        },
        alerts: { outstandingAmount: summary?.customer_remaining ?? 0, outstandingCount: 0, checkoutsToday: checkouts.count ?? 0, currency },
        today: { todayBookingsCount: bookings.count ?? 0, weekBookingsCount: weekBookings.count ?? 0, newCustomersToday: customers.count ?? 0 },
        byCurrency: [] as CurrencyTotals[],
      };
    },
    staleTime: 30000,
  });
  return { dashboardData: query.data, isLoading: query.isLoading || loading, error: query.error };
};
