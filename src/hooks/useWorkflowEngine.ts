import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowProgress {
  current: string;
  previous: string | null;
  next: string | null;
  progress_pct: number;
  total_stages: number;
  stages: Array<{ key: string; label: string; order: number }>;
  blockers: string[];
  missing: string[];
  financial: { invoiced: number; paid: number; has_voucher: boolean };
}

export function useWorkflowProgress(aggregateType: string, aggregateId?: string | null) {
  return useQuery({
    queryKey: ['workflow-progress', aggregateType, aggregateId],
    enabled: !!aggregateId,
    queryFn: async (): Promise<WorkflowProgress | null> => {
      const { data, error } = await (supabase as any).rpc('get_workflow_progress', {
        p_aggregate_type: aggregateType,
        p_aggregate_id: aggregateId,
      });
      if (error) throw error;
      if (!data || (data as any).error) return null;
      return data as WorkflowProgress;
    },
    staleTime: 15_000,
  });
}

export function useAdvanceWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bookingId: string; to: string; reason?: string }) => {
      const { data, error } = await (supabase as any).rpc('advance_workflow', {
        p_booking_id: input.bookingId,
        p_to_stage: input.to,
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast.success('تم تحديث مرحلة الحجز');
      qc.invalidateQueries({ queryKey: ['workflow-progress'] });
      qc.invalidateQueries({ queryKey: ['booking-workspace', v.bookingId] });
    },
    onError: (e: any) => toast.error('فشل التحديث: ' + (e?.message || 'خطأ')),
  });
}
