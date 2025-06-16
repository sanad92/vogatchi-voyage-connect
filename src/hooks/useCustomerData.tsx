
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

      const { data, error } = await supabase
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
          loyalty_transactions:customer_loyalty_points(
            *,
            booking:hotel_bookings(internal_booking_number)
          ),
          bookings:hotel_bookings(
            *,
            follow_ups:customer_follow_ups(*)
          ),
          communications:customer_communications(
            *,
            handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name)
          ),
          notes:customer_notes(
            *,
            created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
          ),
          follow_ups:customer_follow_ups(
            *,
            bookings:hotel_bookings(internal_booking_number),
            assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
          )
        `)
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('❌ خطأ في تحميل بيانات العميل:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ لم يتم العثور على العميل');
        throw new Error('لم يتم العثور على العميل');
      }

      console.log('✅ تم تحميل بيانات العميل بنجاح:', data);
      return data;
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
