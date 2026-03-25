import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

type BookingStatus = {
  name: string;
  name_ar: string;
  color?: string;
};

type DashboardBooking = {
  id: string;
  internal_booking_number: string;
  customer_name: string;
  hotel_name: string;
  check_in_date: string;
  total_cost_customer: number;
  booking_statuses?: BookingStatus;
  created_at?: string | null;
};

type RevenuePoint = {
  month: string;
  revenue: number;
  bookings: number;
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getLast12Months = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  return Array.from({ length: 12 }).map((_, index) => {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1);

    return {
      key: getMonthKey(monthDate),
      month: monthDate.toLocaleString('ar-EG', { month: 'short' }),
      year: monthDate.getFullYear(),
    };
  });
};

const safeDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = (status: any): BookingStatus | undefined => {
  if (!status) return undefined;

  return {
    name: status.name || 'unknown',
    name_ar: status.name_ar || status.name || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    color: status.color || undefined,
  };
};

const normalizeAmount = (...values: Array<number | null | undefined>) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

export const useOptimizedDashboard = () => {
  const orgId = useOrgId();

  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard', orgId],
    queryFn: async () => {
      if (!orgId) {
        return {
          realStats: {
            totalBookings: 0,
            totalRevenue: 0,
            activeCustomers: 0,
            monthlyGrowth: 0,
            flightBookings: 0,
            pendingFollowUps: 0,
          },
          crmStats: { vipCustomers: 0, loyaltyPoints: 0 },
          customers: [],
          recentBookings: [],
          recentCustomers: [],
          monthlyRevenue: getLast12Months().map((month) => ({ month: month.month, revenue: 0, bookings: 0 })),
          revenueYear: new Date().getFullYear().toString(),
        };
      }

      try {
        const [
          hotelBookingsResult,
          flightBookingsResult,
          transportBookingsResult,
          customersResult,
          recentHotelBookingsResult,
          recentFlightBookingsResult,
          recentTransportBookingsResult,
          recentCustomersResult,
          pendingFollowUpsResult,
        ] = await Promise.allSettled([
          supabase
            .from('hotel_bookings')
            .select('id, created_at, total_cost_customer')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('flight_bookings')
            .select('id, created_at, total_cost, total_cost_egp')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('transport_bookings')
            .select('id, created_at, total_cost, total_cost_egp')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('customers')
            .select('id, name, total_bookings, loyalty_points, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('hotel_bookings')
            .select('id, internal_booking_number, customer_name, hotel_name, check_in_date, total_cost_customer, created_at, status:booking_statuses(name, name_ar, color)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('flight_bookings')
            .select('id, booking_reference, customer_name, departure_date, total_cost, total_cost_egp, created_at, status:booking_statuses(name, name_ar, color)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('transport_bookings')
            .select('id, booking_reference, customer_name, departure_date, total_cost, total_cost_egp, created_at, status:booking_statuses(name, name_ar, color)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('customers')
            .select('id, name, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('customer_follow_ups')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('status', 'pending'),
        ]);

        const hotelBookings =
          hotelBookingsResult.status === 'fulfilled' && !hotelBookingsResult.value.error
            ? hotelBookingsResult.value.data || []
            : [];

        const flightBookings =
          flightBookingsResult.status === 'fulfilled' && !flightBookingsResult.value.error
            ? flightBookingsResult.value.data || []
            : [];

        const transportBookings =
          transportBookingsResult.status === 'fulfilled' && !transportBookingsResult.value.error
            ? transportBookingsResult.value.data || []
            : [];

        const customers =
          customersResult.status === 'fulfilled' && !customersResult.value.error
            ? customersResult.value.data || []
            : [];

        const recentHotelBookings =
          recentHotelBookingsResult.status === 'fulfilled' && !recentHotelBookingsResult.value.error
            ? recentHotelBookingsResult.value.data || []
            : [];

        const recentFlightBookings =
          recentFlightBookingsResult.status === 'fulfilled' && !recentFlightBookingsResult.value.error
            ? recentFlightBookingsResult.value.data || []
            : [];

        const recentTransportBookings =
          recentTransportBookingsResult.status === 'fulfilled' && !recentTransportBookingsResult.value.error
            ? recentTransportBookingsResult.value.data || []
            : [];

        const recentCustomers =
          recentCustomersResult.status === 'fulfilled' && !recentCustomersResult.value.error
            ? recentCustomersResult.value.data || []
            : [];

        const pendingFollowUps =
          pendingFollowUpsResult.status === 'fulfilled' && !pendingFollowUpsResult.value.error
            ? pendingFollowUpsResult.value.count || 0
            : 0;

        const mappedHotelBookings: DashboardBooking[] = recentHotelBookings.map((booking: any) => ({
          id: booking.id,
          internal_booking_number: booking.internal_booking_number || `HTL-${booking.id?.slice(0, 6) || 'N/A'}`,
          customer_name: booking.customer_name || '-',
          hotel_name: booking.hotel_name || '-',
          check_in_date: booking.check_in_date || booking.created_at,
          total_cost_customer: normalizeAmount(booking.total_cost_customer),
          booking_statuses: normalizeStatus(booking.status),
          created_at: booking.created_at,
        }));

        const mappedFlightBookings: DashboardBooking[] = recentFlightBookings.map((booking: any) => ({
          id: `flight-${booking.id}`,
          internal_booking_number: booking.booking_reference || `FLT-${booking.id?.slice(0, 6) || 'N/A'}`,
          customer_name: booking.customer_name || '-',
          hotel_name: '\u062d\u062c\u0632 \u0637\u064a\u0631\u0627\u0646',
          check_in_date: booking.departure_date || booking.created_at,
          total_cost_customer: normalizeAmount(booking.total_cost_egp, booking.total_cost),
          booking_statuses: normalizeStatus(booking.status),
          created_at: booking.created_at,
        }));

        const mappedTransportBookings: DashboardBooking[] = recentTransportBookings.map((booking: any) => ({
          id: `transport-${booking.id}`,
          internal_booking_number: booking.booking_reference || `TRN-${booking.id?.slice(0, 6) || 'N/A'}`,
          customer_name: booking.customer_name || '-',
          hotel_name: '\u062d\u062c\u0632 \u0646\u0642\u0644',
          check_in_date: booking.departure_date || booking.created_at,
          total_cost_customer: normalizeAmount(booking.total_cost_egp, booking.total_cost),
          booking_statuses: normalizeStatus(booking.status),
          created_at: booking.created_at,
        }));

        const recentBookings = [...mappedHotelBookings, ...mappedFlightBookings, ...mappedTransportBookings]
          .sort((a, b) => {
            const firstDate = safeDate(a.created_at || a.check_in_date)?.getTime() || 0;
            const secondDate = safeDate(b.created_at || b.check_in_date)?.getTime() || 0;
            return secondDate - firstDate;
          })
          .slice(0, 6)
          .map(({ created_at, ...booking }) => booking);

        const totalHotelRevenue = hotelBookings.reduce(
          (sum, booking: any) => sum + normalizeAmount(booking.total_cost_customer),
          0
        );

        const totalFlightRevenue = flightBookings.reduce(
          (sum, booking: any) => sum + normalizeAmount(booking.total_cost_egp, booking.total_cost),
          0
        );

        const totalTransportRevenue = transportBookings.reduce(
          (sum, booking: any) => sum + normalizeAmount(booking.total_cost_egp, booking.total_cost),
          0
        );

        const totalBookings = hotelBookings.length + flightBookings.length + transportBookings.length;
        const totalRevenue = totalHotelRevenue + totalFlightRevenue + totalTransportRevenue;
        const activeCustomers = customers.length;

        const monthTemplate = getLast12Months();
        const monthStats = new Map(monthTemplate.map((month) => [month.key, { revenue: 0, bookings: 0 }]));

        const pushToMonthStats = (bookingDate: string | null | undefined, amount: number) => {
          const parsedDate = safeDate(bookingDate);
          if (!parsedDate) return;

          const key = getMonthKey(parsedDate);
          const current = monthStats.get(key);
          if (!current) return;

          current.revenue += amount;
          current.bookings += 1;
        };

        hotelBookings.forEach((booking: any) => pushToMonthStats(booking.created_at, normalizeAmount(booking.total_cost_customer)));
        flightBookings.forEach((booking: any) => pushToMonthStats(booking.created_at, normalizeAmount(booking.total_cost_egp, booking.total_cost)));
        transportBookings.forEach((booking: any) => pushToMonthStats(booking.created_at, normalizeAmount(booking.total_cost_egp, booking.total_cost)));

        const monthlyRevenue: RevenuePoint[] = monthTemplate.map((month) => {
          const stats = monthStats.get(month.key) || { revenue: 0, bookings: 0 };
          return {
            month: month.month,
            revenue: stats.revenue,
            bookings: stats.bookings,
          };
        });

        const currentMonth = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
        const previousMonth = monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0;

        const monthlyGrowth =
          previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : currentMonth > 0 ? 100 : 0;

        const vipCustomers = customers.filter((customer: any) => (customer.total_bookings || 0) >= 10).length;
        const loyaltyPoints = customers.reduce((sum: number, customer: any) => sum + (customer.loyalty_points || 0), 0);

        const revenueYear = monthTemplate[monthTemplate.length - 1]?.year?.toString() || new Date().getFullYear().toString();

        return {
          realStats: {
            totalBookings,
            totalRevenue,
            activeCustomers,
            monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
            flightBookings: flightBookings.length,
            pendingFollowUps,
          },
          crmStats: { vipCustomers, loyaltyPoints },
          customers,
          recentBookings,
          recentCustomers,
          monthlyRevenue,
          revenueYear,
        };
      } catch {
        return {
          realStats: {
            totalBookings: 0,
            totalRevenue: 0,
            activeCustomers: 0,
            monthlyGrowth: 0,
            flightBookings: 0,
            pendingFollowUps: 0,
          },
          crmStats: { vipCustomers: 0, loyaltyPoints: 0 },
          customers: [],
          recentBookings: [],
          recentCustomers: [],
          monthlyRevenue: getLast12Months().map((month) => ({ month: month.month, revenue: 0, bookings: 0 })),
          revenueYear: new Date().getFullYear().toString(),
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
