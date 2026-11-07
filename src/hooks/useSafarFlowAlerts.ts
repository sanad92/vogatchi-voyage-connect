import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export type SafarFlowAlertKind = 'dead' | 'overdue';
export interface SafarFlowAlert {
  id: string;
  booking_id: string;
  template_key: string;
  alert_kind: SafarFlowAlertKind;
  created_at: string;
}
export interface SafarFlowAlertHealth {
  counts: { total: number; dead: number; overdue: number };
  alerts: SafarFlowAlert[];
  generated_at: string;
}

/**
 * Read-only, tenant-authorized RPC. Never expose private queue credentials,
 * recipients, source payloads or raw database exception messages.
 */
export function useSafarFlowAlerts() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['safar-flow-alerts', orgId],
    enabled: !!orgId,
    retry: 1,
    refetchInterval: 60_000,
    queryFn: async (): Promise<SafarFlowAlertHealth> => {
      if (!orgId) throw new Error('اختر الشركة أولًا');
      const { data, error } = await (supabase as any).rpc('get_safar_flow_alert_health', {
        p_organization_id: orgId,
        p_limit: 10,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          throw new Error('تحديث تنبيهات Safar Flow لم يتم تثبيته بعد');
        }
        if (error.code === '42501') throw new Error('ليس لديك صلاحية عرض تنبيهات الأتمتة لهذه الشركة');
        throw error;
      }
      if (!data?.counts || !Array.isArray(data.alerts)) {
        throw new Error('استجابة غير صحيحة من خدمة تنبيهات Safar Flow');
      }
      return data as SafarFlowAlertHealth;
    },
  });
}
