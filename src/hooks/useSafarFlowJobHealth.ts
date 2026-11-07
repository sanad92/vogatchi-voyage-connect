import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export type SafarFlowJobStatus = 'scheduled' | 'retrying' | 'succeeded' | 'skipped' | 'dead' | 'cancelled';
export type SafarFlowJobTemplate = 'supplier_confirmation' | 'pretravel_checklist';

export interface SafarFlowJob {
  id: string;
  booking_id: string;
  template_key: SafarFlowJobTemplate;
  status: SafarFlowJobStatus;
  attempts: number;
  max_attempts: number;
  available_at: string;
  updated_at: string;
  processed_at: string | null;
}
export interface SafarFlowJobHealth {
  counts: Record<SafarFlowJobStatus | 'due' | 'all', number>;
  jobs: SafarFlowJob[];
  generated_at: string;
}

/**
 * Tenant-scoped, read-only RPC. Does not expose the private queue to Data API,
 * or expose untrusted job error details to the browser.
 */
export function useSafarFlowJobHealth() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['safar-flow-job-health', orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async (): Promise<SafarFlowJobHealth> => {
      if (!orgId) throw new Error('يجب تحديد الشركة أولًا');
      const { data, error } = await (supabase as any).rpc('get_safar_flow_job_health', {
        p_organization_id: orgId,
        p_limit: 15,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          throw new Error('لم يتم تثبيت تحديث مراقبة Safar Flow على قاعدة البيانات الحالية');
        }
        if (error.code === '42501') {
          throw new Error('ليست لديك صلاحية عرض مراقبة الأتمتة لهذه الشركة');
        }
        throw error;
      }
      if (!data || !data.counts || !Array.isArray(data.jobs)) {
        throw new Error('استجابة غير متوقعة من خدمة مراقبة Safar Flow');
      }
      return data as SafarFlowJobHealth;
    },
  });
}
