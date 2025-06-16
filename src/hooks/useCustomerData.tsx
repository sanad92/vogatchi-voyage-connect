
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

      // First, load basic customer data with segment
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

      // Load all booking types separately
      const [
        { data: hotelBookings },
        { data: flightBookings },
        { data: transportBookings },
        { data: carRentals },
        { data: loyaltyData },
        { data: communicationsData },
        { data: notesData },
        { data: followUpsData }
      ] = await Promise.all([
        // Hotel bookings
        supabase
          .from('hotel_bookings')
          .select(`
            *,
            status:booking_statuses(name, name_ar, color)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // Flight bookings
        supabase
          .from('flight_bookings')
          .select(`
            *,
            status:booking_statuses(name, name_ar, color),
            departure_airport:airports!flight_bookings_departure_airport_id_fkey(name, city, iata_code),
            arrival_airport:airports!flight_bookings_arrival_airport_id_fkey(name, city, iata_code),
            airline:airlines(name)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // Transport bookings
        supabase
          .from('transport_bookings')
          .select(`
            *,
            status:booking_statuses(name, name_ar, color),
            route:transport_routes(route_name, route_name_ar),
            vehicle_type:vehicle_types(name, name_ar)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // Car rentals
        supabase
          .from('car_rentals')
          .select(`
            *,
            status:booking_statuses(name, name_ar, color),
            vehicle_type:vehicle_types(name, name_ar)
          `)
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),

        // Loyalty transactions
        supabase
          .from('customer_loyalty_points')
          .select(`
            *,
            booking:hotel_bookings(internal_booking_number)
          `)
          .eq('customer_id', customerId),

        // Communications
        supabase
          .from('customer_communications')
          .select(`
            *,
            handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name)
          `)
          .eq('customer_id', customerId),

        // Notes
        supabase
          .from('customer_notes')
          .select(`
            *,
            created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
          `)
          .eq('customer_id', customerId),

        // Follow-ups
        supabase
          .from('customer_follow_ups')
          .select(`
            *,
            assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
          `)
          .eq('customer_id', customerId)
      ]);

      // Combine all data
      const combinedData = {
        ...basicData,
        hotel_bookings: hotelBookings || [],
        flight_bookings: flightBookings || [],
        transport_bookings: transportBookings || [],
        car_rentals: carRentals || [],
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
