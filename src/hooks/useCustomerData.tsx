
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerData = (customerId: string) => {
  const { data: customerData, isLoading, refetch } = useQuery({
    queryKey: ['customer-full-data', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          bookings(
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
            bookings(booking_reference),
            assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
          )
        `)
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  return {
    customerData,
    isLoading,
    refetch
  };
};
