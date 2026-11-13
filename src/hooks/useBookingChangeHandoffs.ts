import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export type HandoffStatus =
  | 'supplier_pending' | 'supplier_confirmed' | 'finance_reviewed'
  | 'execution_reported' | 'blocked';
export type HandoffAction = 'supplier_confirm' | 'finance_verify' | 'report_execution' | 'block';

export interface BookingChangeHandoff {
  id: string;
  change_request_id: string;
  organization_id: string;
  booking_id: string;
  status: HandoffStatus;
  supplier_reference: string | null;
  supplier_confirmed_by: string | null;
  supplier_confirmed_at: string | null;
  finance_reference: string | null;
  finance_reviewed_by: string | null;
  finance_reviewed_at: string | null;
  execution_reference: string | null;
  execution_reported_by: string | null;
  execution_reported_at: string | null;
  blocked_at: string | null;
}
export interface HandoffAuditEvent {
  id: string;
  change_request_id: string;
  organization_id: string;
  action: HandoffAction;
  actor_id: string;
  evidence_reference: string | null;
  note: string | null;
  occurred_at: string;
}

const client = supabase as any;

/** Finance-sensitive evidence: this query requires active membership and financial_view via RLS. */
export function useBookingChangeHandoffs(bookingId: string, canRead: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['booking-change-handoffs', orgId, bookingId],
    enabled: !!orgId && !!bookingId && canRead,
    queryFn: async (): Promise<BookingChangeHandoff[]> => {
      if (!orgId) return [];
      const { data, error } = await client.from('booking_change_handoffs')
        .select('id,change_request_id,organization_id,booking_id,status,supplier_reference,supplier_confirmed_by,supplier_confirmed_at,finance_reference,finance_reviewed_by,finance_reviewed_at,execution_reference,execution_reported_by,execution_reported_at,blocked_at')
        .eq('organization_id', orgId).eq('booking_id', bookingId);
      if (error) throw error;
      return (data ?? []) as BookingChangeHandoff[];
    },
  });
}

export function useBookingHandoffAudit(bookingId: string, canRead: boolean) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['booking-change-handoff-events', orgId, bookingId],
    enabled: !!orgId && !!bookingId && canRead,
    queryFn: async (): Promise<HandoffAuditEvent[]> => {
      if (!orgId) return [];
      const { data, error } = await client.from('booking_change_handoff_events')
        .select('id,change_request_id,organization_id,action,actor_id,evidence_reference,note,occurred_at')
        .eq('organization_id', orgId).eq('booking_id', bookingId)
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as HandoffAuditEvent[];
    },
  });
}

export function useRecordBookingChangeHandoff(bookingId: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      action: HandoffAction;
      reference: string | null;
      note: string | null;
    }): Promise<{ id: string; status: HandoffStatus; replayed: boolean }> => {
      if (!orgId || !bookingId) throw new Error('اختر الشركة وملف الحجز أولًا');
      const { data, error } = await client.rpc('record_booking_change_handoff', {
        p_request_id: input.requestId,
        p_action: input.action,
        p_reference: input.reference,
        p_note: input.note,
      });
      if (error) throw error;
      if (!data?.id || !data?.status) throw new Error('تعذر التأكد من تسجيل خطوة متابعة التعديل');
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['booking-change-handoffs', orgId, bookingId] }),
        qc.invalidateQueries({ queryKey: ['booking-change-handoff-events', orgId, bookingId] }),
        qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      ]);
    },
  });
}
