import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AutomationStep {
  id: string;
  step_key: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  error_message: string | null;
  attempts: number;
  last_attempt_at: string | null;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  booking_id: string;
  status: string;
  completion_score: number;
  last_run_at: string | null;
  error_message: string | null;
}

export const STEP_LABELS: Record<string, string> = {
  invoice: 'الفاتورة',
  supplier_po: 'أوامر دفع المورد',
  voucher: 'الفاوتشر',
  financial_snapshot: 'الملخص المالي',
  timeline: 'أحداث السجل الزمني',
  messaging_suggestions: 'اقتراحات المراسلة',
};

export function useBookingAutomation(bookingId?: string) {
  const qc = useQueryClient();

  const runQuery = useQuery({
    queryKey: ['booking-automation-run', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('booking_automation_runs')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (error) throw error;
      return data as AutomationRun | null;
    },
  });

  const stepsQuery = useQuery({
    queryKey: ['booking-automation-steps', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('booking_automation_steps')
        .select('*')
        .eq('booking_id', bookingId)
        .order('step_key', { ascending: true });
      if (error) throw error;
      return (data || []) as AutomationStep[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['booking-automation-run', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-automation-steps', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-workspace', bookingId] });
  };

  const runAll = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('run_booking_automation', { p_booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تشغيل الأتمتة');
      invalidate();
    },
    onError: (e: any) => toast.error('فشل التشغيل: ' + (e?.message || 'خطأ')),
  });

  const retryStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await (supabase as any).rpc('retry_booking_automation_step', { p_step_id: stepId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إعادة المحاولة');
      invalidate();
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });

  const steps = stepsQuery.data || [];
  const completed = steps.filter((s) => s.status === 'completed').length;
  const failed = steps.filter((s) => s.status === 'failed').length;
  const pending = steps.filter((s) => s.status === 'pending' || s.status === 'skipped').length;

  return {
    run: runQuery.data,
    steps,
    completed,
    failed,
    pending,
    isLoading: runQuery.isLoading || stepsQuery.isLoading,
    runAll,
    retryStep,
  };
}
