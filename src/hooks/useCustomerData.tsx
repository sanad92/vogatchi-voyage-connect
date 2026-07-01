
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerData = (customerId: string) => {
  const { data: customerData, isLoading, refetch, error } = useQuery({
    queryKey: ['customer-full-data', customerId],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      console.log('🔍 جاري تحميل بيانات العميل:', customerId);

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
        console.error('❌ خطأ في تحميل بيانات العميل الأساسية:', basicError);
        throw basicError;
      }

      if (!basicData) {
        console.error('❌ لم يتم العثور على العميل');
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
          .select('id, booking_number, booking_type, status, selling_price, cost_price, currency, start_date, end_date, supplier_name, notes, created_at')
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
      const byType = { hotel: [] as any[], flight: [] as any[], transport: [] as any[], car_rental: [] as any[] };
      for (const b of (unifiedBookings ?? []) as any[]) {
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
        const key = (b.booking_type as keyof typeof byType) || 'hotel';
        (byType[key] ?? byType.hotel).push(normalised);
      }

      // Derived stats from unified bookings (fallback to stored columns)
      const totalBookings = (unifiedBookings?.length ?? 0) || (basicData as any).total_bookings || 0;
      const totalSpent =
        (unifiedBookings ?? []).reduce((s: number, b: any) => s + (Number(b.selling_price) || 0), 0) ||
        (basicData as any).total_spent || 0;
      const lastBookingDate =
        (unifiedBookings ?? [])[0]?.created_at ?? (basicData as any).last_booking_date ?? null;

      const combinedData = {
        ...(basicData as any),
        total_bookings: totalBookings,
        total_spent: totalSpent,
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

      console.log('✅ تم تحميل بيانات العميل بنجاح:', combinedData);
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
