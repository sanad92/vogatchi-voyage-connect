import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export type SourceEvidenceType =
  | 'customer_invoice' | 'supplier_invoice'
  | 'customer_payment' | 'supplier_payment' | 'generated_document';

export interface BookingSourceEvidence {
  id: string;
  organization_id: string;
  booking_id: string;
  change_request_id: string;
  source_type: SourceEvidenceType;
  source_id: string;
  status_at_link: string | null;
  currency_at_link: string | null;
  amount_at_link: number | null;
  reference_at_link: string | null;
  linked_by: string;
  linked_at: string;
}

export function useBookingChangeSourceEvidence(bookingId: string, canRead: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['booking-change-source-evidence', orgId, bookingId],
    enabled: Boolean(orgId && bookingId && canRead),
    queryFn: async (): Promise<BookingSourceEvidence[]> => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('booking_change_source_evidence')
        .select('id,organization_id,booking_id,change_request_id,source_type,source_id,status_at_link,currency_at_link,amount_at_link,reference_at_link,linked_by,linked_at')
        .eq('organization_id', orgId).eq('booking_id', bookingId)
        .order('linked_at', { ascending: false }).limit(200);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          throw new Error('ميزة ربط مستندات التعديل لم تُثبّت بعد على قاعدة البيانات الحالية');
        }
        throw error;
      }
      return (data ?? []) as BookingSourceEvidence[];
    },
  });
}

export function useLinkBookingChangeSourceEvidence(bookingId: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      sourceType: SourceEvidenceType;
      sourceId: string;
    }): Promise<{ id: string; replayed: boolean }> => {
      if (!orgId || !bookingId) throw new Error('الشركة أو الحجز غير محدد');
      const { data, error } = await (supabase as any).rpc(
        'link_booking_change_source_evidence', {
          p_request_id: input.requestId,
          p_source_type: input.sourceType,
          p_source_id: input.sourceId,
        },
      );
      if (error) throw error;
      if (!data?.id) throw new Error('تعذر التأكد من ربط المستند');
      return data as { id: string; replayed: boolean };
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking-change-source-evidence', orgId, bookingId] }),
        qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      ]);
    },
  });
}
