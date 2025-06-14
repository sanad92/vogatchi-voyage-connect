
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerSegments = () => {
  const { data: segments, isLoading, error } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('is_active', true)
        .order('minimum_bookings', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  return {
    segments,
    isLoading,
    error
  };
};
