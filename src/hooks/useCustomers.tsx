
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomers = (searchTerm?: string, segmentFilter?: string) => {
  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', searchTerm, segmentFilter],
    queryFn: async () => {
      let query = supabase
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
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply segment filter
      if (segmentFilter) {
        query = query.eq('segment_id', segmentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  return {
    customers,
    isLoading,
    error,
    refetch
  };
};
