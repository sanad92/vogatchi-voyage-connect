import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { useOptimizedAuth } from './useOptimizedAuth';
import { useSupabasePermissions } from './useSupabasePermissions';
import { toast } from 'sonner';

export function useWhatsAppQueue() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const { hasPermission } = useSupabasePermissions();
  const qc = useQueryClient();
  const canWork = hasPermission('whatsapp_view') && (hasPermission('customer_service_edit') || hasPermission('whatsapp_admin'));
  const identity = useQuery({
    queryKey: ['wa-queue-identity', orgId, user?.id], enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data: profile, error } = await supabase.from('profiles').select('linked_employee_id').eq('id', user!.id).single();
      if (error) throw error;
      if (!profile.linked_employee_id) return null;
      const { data: employee, error: employeeError } = await supabase.from('employees').select('id, full_name')
        .eq('id', profile.linked_employee_id).eq('organization_id', orgId!).eq('is_active', true).maybeSingle();
      if (employeeError) throw employeeError;
      return employee;
    },
  });
  const claim = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!identity.data || !orgId || !canWork) throw new Error('يلزم حساب موظف نشط مرتبط بالمؤسسة وصلاحية خدمة العملاء');
      const { data, error } = await (supabase as any).rpc('wa_claim_conversation', {
        _org_id: orgId, _conversation_id: conversationId || null,
      });
      if (error) throw error;
      if (!data) throw new Error('المحادثة لم تعد متاحة');
      return data as string;
    },
    onSuccess: () => toast.success('تم استلام المحادثة وإيقاف الرد الآلي عليها'),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-conversation-detail'] });
    },
  });
  const [available, setAvailable] = useState(false);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  useEffect(() => { setAvailable(false); }, [orgId, user?.id]);
  useEffect(() => {
    if (!identity.data || !user || !orgId || !canWork) return;
    let cancelled = false;
    const heartbeat = async () => {
      const { error } = await (supabase as any).from('wa_queue_agents').upsert({
        organization_id: orgId, user_id: user.id, employee_id: identity.data!.id,
        available, heartbeat_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,user_id' });
      if (cancelled) return;
      setPresenceError(error ? 'تعذر تحديث التواجد؛ تأكد من نشر تحديث قاعدة البيانات' : null);
      if (!error && available) {
        const { error: dispatchError } = await supabase.functions.invoke('whatsapp-queue-dispatch', { body: { organization_id: orgId } });
        if (!cancelled && dispatchError) setPresenceError('تعذر تشغيل التوزيع التلقائي؛ الاستلام اليدوي متاح');
        qc.invalidateQueries({ queryKey: ['whatsapp-conversations', orgId] });
      }
    };
    void heartbeat();
    const timer = setInterval(heartbeat, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [identity.data?.id, user?.id, orgId, available, canWork, qc]);
  return { available, setAvailable, presenceError, employee: identity.data, identityError: identity.error, canWork, claim };
}
