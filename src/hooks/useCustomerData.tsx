
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

      // Load loyalty transactions separately
      const { data: loyaltyData } = await supabase
        .from('customer_loyalty_points')
        .select(`
          *,
          booking:hotel_bookings(internal_booking_number)
        `)
        .eq('customer_id', customerId);

      // Load bookings separately
      const { data: bookingsData } = await supabase
        .from('hotel_bookings')
        .select('*')
        .eq('customer_id', customerId);

      // Load communications separately
      const { data: communicationsData } = await supabase
        .from('customer_communications')
        .select(`
          *,
          handled_by_profile:profiles!customer_communications_handled_by_fkey(full_name)
        `)
        .eq('customer_id', customerId);

      // Load notes separately
      const { data: notesData } = await supabase
        .from('customer_notes')
        .select(`
          *,
          created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
        `)
        .eq('customer_id', customerId);

      // Load follow-ups separately
      const { data: followUpsData } = await supabase
        .from('customer_follow_ups')
        .select(`
          *,
          assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
        `)
        .eq('customer_id', customerId);

      // Combine all data
      const combinedData = {
        ...basicData,
        loyalty_transactions: loyaltyData || [],
        bookings: bookingsData || [],
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
