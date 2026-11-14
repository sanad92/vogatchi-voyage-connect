import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWorkspaceVouchers = (bookingId?: string) => useQuery({
  queryKey: ['workspace-vouchers', bookingId],
  enabled: Boolean(bookingId),
  queryFn: async () => {
    const { data, error } = await supabase
      .from('booking_vouchers')
      .select('id, voucher_number, issued_at, created_at, pdf_url')
      .eq('booking_id', bookingId!)
      .order('issued_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
