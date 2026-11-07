import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export type BookingChangeKind = 'dates' | 'travellers' | 'room' | 'service' | 'cancellation' | 'other';
export type BookingChangeService = 'hotel' | 'flight' | 'transport' | 'car';
export type BookingChangeStatus = 'pending' | 'approved' | 'rejected';

export interface BookingChangeRequest {
  id: string;
  booking_id: string;
  organization_id: string;
  change_kind: BookingChangeKind;
  service_kind: BookingChangeService | null;
  service_reference: string | null;
  description: string;
  proposed_selling_delta: number | null;
  proposed_cost_delta: number | null;
  estimate_currency: string | null;
  status: BookingChangeStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface CreateBookingChangeInput {
  bookingId: string;
  requestKey: string;
  kind: BookingChangeKind;
  description: string;
  serviceKind: BookingChangeService | null;
  serviceReference: string | null;
  sellingDelta: number | null;
  costDelta: number | null;
  currency: string | null;
}

type ChangeRpcResult = {
  id: string;
  status: BookingChangeStatus;
  replayed?: boolean;
  already_decided?: boolean;
};

const client = supabase as any;

/** Current-company read; it does not depend on client-supplied org IDs for writes. */
export function useBookingChangeRequests(bookingId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['booking-change-requests', orgId, bookingId],
    enabled: !!orgId && !!bookingId,
    queryFn: async (): Promise<BookingChangeRequest[]> => {
      if (!orgId || !bookingId) return [];
      const { data, error } = await client.from('booking_change_requests')
        .select('id, booking_id, organization_id, change_kind, service_kind, service_reference, description, proposed_selling_delta, proposed_cost_delta, estimate_currency, status, requested_by, requested_at, reviewed_by, reviewed_at, review_note')
        .eq('organization_id', orgId)
        .eq('booking_id', bookingId)
        .order('requested_at', { ascending: false })
        .limit(200);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          throw new Error('تحديث طلبات تعديل الحجز لم يتم تثبيته على قاعدة البيانات الحالية');
        }
        throw error;
      }
      return (data ?? []) as BookingChangeRequest[];
    },
  });
}

export function useCreateBookingChangeRequest(bookingId: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingChangeInput): Promise<ChangeRpcResult> => {
      if (!orgId || input.bookingId !== bookingId) throw new Error('ملف الحجز أو الشركة غير محدد');
      const { data, error } = await client.rpc('create_booking_change_request', {
        p_booking_id: input.bookingId,
        p_request_key: input.requestKey,
        p_change_kind: input.kind,
        p_description: input.description,
        p_service_kind: input.serviceKind,
        p_service_reference: input.serviceReference,
        p_selling_delta: input.sellingDelta,
        p_cost_delta: input.costDelta,
        p_currency: input.currency,
      });
      if (error) throw error;
      if (!data?.id) throw new Error('لم يتم تأكيد حفظ طلب التعديل');
      return data as ChangeRpcResult;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking-change-requests', orgId, bookingId] }),
        qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      ]);
    },
  });
}

export function useDecideBookingChangeRequest(bookingId: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; approve: boolean; note: string }): Promise<ChangeRpcResult> => {
      if (!orgId) throw new Error('الشركة غير محددة');
      const { data, error } = await client.rpc('decide_booking_change_request', {
        p_request_id: input.requestId,
        p_approve: input.approve,
        p_note: input.note || null,
      });
      if (error) throw error;
      if (!data?.id) throw new Error('لم يتم تأكيد تسجيل قرار المدير');
      return data as ChangeRpcResult;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking-change-requests', orgId, bookingId] }),
        qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      ]);
    },
  });
}
