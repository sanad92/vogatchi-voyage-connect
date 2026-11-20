import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export const useWorkspaceVouchers = (bookingId?: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['workspace-vouchers', bookingId, orgId],
    enabled: Boolean(bookingId && orgId),
    queryFn: async () => {
      if (!bookingId || !orgId) return [];
      const { data, error } = await supabase
        .from('booking_vouchers')
        .select('id, voucher_number, issued_at, created_at, updated_at, pdf_url')
        .eq('booking_id', bookingId)
        .eq('organization_id', orgId)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};
