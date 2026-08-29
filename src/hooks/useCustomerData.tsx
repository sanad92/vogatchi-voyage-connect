
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CurrencyTotals } from '@/lib/customerMetrics';
import type { Database } from '@/integrations/supabase/types';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type CustomerBookingRow = Pick<BookingRow,
  | 'id'
  | 'booking_number'
  | 'booking_type'
  | 'status'
  | 'workflow_stage'
  | 'selling_price'
  | 'cost_price'
  | 'currency'
  | 'start_date'
  | 'end_date'
  | 'supplier_name'
  | 'notes'
  | 'created_at'
>;
type BookingGroupKey = 'hotel' | 'flight' | 'transport' | 'car_rental';
type CustomerBookingSummary = CustomerBookingRow & {
  internal_booking_number: string;
  booking_reference: string;
  hotel_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  departure_date: string | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  total_cost_customer: number | null;
  total_cost: number | null;
  total_rental_cost: number | null;
  status: { name_ar: string; name: string; color: string };
};

const isBookingGroupKey = (value: string): value is BookingGroupKey => (
  ['hotel', 'flight', 'transport', 'car_rental'] as const
).includes(value as BookingGroupKey);

export const useCustomerData = (customerId: string) => {
  const { data: customerData, isLoading, refetch, error } = useQuery({
    queryKey: ['customer-full-data', customerId],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // First, load basic customer data with segment and creator info
      const { data: basicData, error: basicError } = await supabase
        .from('customers')
        .select(`
          *,
          segment:customer_segments(
            id,
            name,
            name_ar,
            color,
            minimum_bookings,
            minimum_total_spent
          ),
          created_by_profile:profiles!customers_created_by_fkey(
            id,
            full_name,
            email
          ),
          last_follow_up_by_profile:profiles!customers_last_follow_up_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('id', customerId)
        .single();

      if (basicError) {
        throw basicError;
      }

      if (!basicData) {
        throw new Error('لم يتم العثور على العميل');
      }

      // Load unified bookings + supporting data in parallel
      const [
        { data: unifiedBookings },
        { data: loyaltyData },
        { data: communicationsData },
        { data: notesData },
        { data: followUpsData }
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, booking_number, booking_type, status, workflow_stage, selling_price, cost_price, currency, start_date, end_date, supplier_name, notes, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        supabase
          .from('loyalty_points')
          .select('*')
          .eq('customer_id', customerId),

        supabase
          .from('customer_communications')
          .select(`
            *,
            handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name)
          `)
          .eq('customer_id', customerId),

        supabase
          .from('customer_notes')
          .select(`
            *,
            created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
          `)
          .eq('customer_id', customerId),

        supabase
          .from('customer_follow_ups')
          .select(`
            *,
            assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
          `)
          .eq('customer_id', customerId)
      ]);

      // Group unified bookings by booking_type and normalise fields
      // used by CustomerDetails (hotel_name, check_in_date, status.name_ar…).
      const byType: Record<BookingGroupKey, CustomerBookingSummary[]> = {
        hotel: [],
        flight: [],
        transport: [],
        car_rental: [],
      };
      for (const b of (unifiedBookings ?? []) as CustomerBookingRow[]) {
        const normalised = {
          ...b,
          internal_booking_number: b.booking_number,
          booking_reference: b.booking_number,
          hotel_name: b.supplier_name,
          check_in_date: b.start_date,
          check_out_date: b.end_date,
          departure_date: b.start_date,
          rental_start_date: b.start_date,
          rental_end_date: b.end_date,
          total_cost_customer: b.selling_price,
          total_cost: b.selling_price,
          total_rental_cost: b.selling_price,
          status: { name_ar: b.status, name: b.status, color: '#64748b' },
        };
        const key = isBookingGroupKey(b.booking_type) ? b.booking_type : 'hotel';
        byType[key].push(normalised);
      }

      const confirmedBookings = ((unifiedBookings ?? []) as CustomerBookingRow[]).filter((booking) =>
        ['confirmed', 'completed', 'paid'].includes(String(booking.status || '').toLowerCase())
        || ['paid', 'operations', 'traveling', 'completed', 'post_travel'].includes(String(booking.workflow_stage || '')),
      );
      const spendByCurrency = confirmedBookings.reduce<CurrencyTotals>((totals, booking) => {
        const currency = String(booking.currency || 'EGP').trim().toUpperCase();
        totals[currency] = (totals[currency] || 0) + Number(booking.selling_price || 0);
        return totals;
      }, {});
      const bookingCountByCurrency = confirmedBookings.reduce<CurrencyTotals>((totals, booking) => {
        const currency = String(booking.currency || 'EGP').trim().toUpperCase();
        totals[currency] = (totals[currency] || 0) + 1;
        return totals;
      }, {});
      const totalBookings = confirmedBookings.length;
      const lastBookingDate = confirmedBookings[0]?.created_at ?? null;

      const combinedData = {
        ...basicData,
        total_bookings: totalBookings,
        total_spent: spendByCurrency.EGP || 0,
        spend_by_currency: spendByCurrency,
        booking_count_by_currency: bookingCountByCurrency,
        last_booking_date: lastBookingDate,
        hotel_bookings: byType.hotel,
        flight_bookings: byType.flight,
        transport_bookings: byType.transport,
        car_rentals: byType.car_rental,
        loyalty_transactions: loyaltyData || [],
        communications: communicationsData || [],
        notes: notesData || [],
        follow_ups: followUpsData || []
      };

      return combinedData;
    },
    enabled: !!customerId,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    customerData,
    isLoading,
    refetch,
    error
  };
};
