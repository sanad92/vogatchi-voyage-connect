import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { toast } from 'sonner';

export function useAutomationEngine() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const executeTrigger = useCallback(async (customerId: string) => {
    if (!orgId) return;

    try {
      const { error } = await callUntypedRpc<number>('queue_customer_registration_automation', {
        p_org_id: orgId,
        p_customer_id: customerId,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['automation-logs', orgId] });
    } catch (error) {
      console.error('Customer registration automation failed', error);
      toast.error('تم حفظ العميل وتعذّر إضافة رسالة الترحيب إلى قائمة الانتظار.');
    }
  }, [orgId, queryClient]);

  return { executeTrigger };
}
