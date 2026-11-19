import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import type { LibraryRuleKey } from '@/lib/automationLibrary';

export type TriggerType = 'booking_created' | 'payment_confirmed' | 'before_travel' | 'booking_status_changed' | 'invoice_created' | 'customer_registered';
export type ActionType = 'send_email' | 'send_whatsapp' | 'create_invoice' | 'send_reminder';

export function useStarterAutomationRules() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const queryKey = ['starter-automation-settings', orgId];
  const settings = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('starter_automation_settings')
        .select('rule_key').eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const setEnabled = useMutation({
    mutationFn: async ({ key, enabled }: { key: LibraryRuleKey; enabled: boolean }) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const { error } = await supabase.rpc('set_starter_automation', {
        _org: orgId,
        _rule: key,
        _enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: async (_, { enabled }) => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(enabled ? 'تم تشغيل القاعدة' : 'تم إيقاف القاعدة');
    },
    onError: () => toast.error('تعذّر تحديث القاعدة'),
  });

  return { settings, setEnabled };
}

export interface AutomationAction {
  id?: string;
  rule_id?: string;
  action_type: ActionType;
  action_config: Record<string, any>;
  sort_order: number;
  is_active: boolean;
}

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  automation_actions?: AutomationAction[];
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  booking_created: 'عند إنشاء حجز جديد',
  payment_confirmed: 'عند تأكيد الدفع',
  before_travel: 'قبل موعد السفر',
  booking_status_changed: 'عند تغيير حالة الحجز',
  invoice_created: 'عند إنشاء فاتورة',
  customer_registered: 'عند تسجيل عميل جديد',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'إضافة بريد إلى قائمة الانتظار',
  send_whatsapp: 'إرسال رسالة واتساب',
  create_invoice: 'إنشاء فاتورة',
  send_reminder: 'إرسال تذكير',
};

export const TRIGGER_ICONS: Record<TriggerType, string> = {
  booking_created: '📋',
  payment_confirmed: '💳',
  before_travel: '✈️',
  booking_status_changed: '🔄',
  invoice_created: '🧾',
  customer_registered: '👤',
};

export const ACTION_ICONS: Record<ActionType, string> = {
  send_email: '📧',
  send_whatsapp: '💬',
  create_invoice: '🧾',
  send_reminder: '⏰',
};

export function supportsCustomAutomation(rule: Pick<AutomationRule, 'trigger_type' | 'trigger_config' | 'automation_actions'>) {
  const actions = rule.automation_actions?.filter(action => action.is_active) ?? [];
  const config = rule.trigger_config;
  return rule.trigger_type === 'customer_registered' && config?.has_email === true
    && Object.keys(config).length === 1 && actions.length > 0
    && actions.every(action => action.action_type === 'send_email');
}

export function useAutomationRules() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ['automation-rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*, automation_actions(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!orgId,
  });

  const createRule = useMutation({
    mutationFn: async (input: { name: string; description?: string; subject?: string }) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const { data: user } = await supabase.auth.getUser();

      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description || null,
          trigger_type: 'customer_registered',
          trigger_config: { has_email: true },
          is_active: false,
          created_by: user.user?.id || null,
        })
        .select()
        .single();
      if (ruleError) throw ruleError;

      const { error: actionError } = await supabase.from('automation_actions').insert({
        rule_id: rule.id,
        action_type: 'send_email',
        action_config: { subject: input.subject?.trim() ?? '' },
        sort_order: 0,
        is_active: true,
      });
      if (actionError) throw actionError;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', orgId] });
      toast.success('تم حفظ القاعدة. فعّلها من قائمة القواعد لبدء وضع البريد في الانتظار.');
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id).eq('organization_id', orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', orgId] });
      toast.success('تم حذف القاعدة');
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ'),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      if (is_active) {
        const { data, error } = await supabase.from('automation_rules')
          .select('*, automation_actions(*)').eq('id', id).eq('organization_id', orgId).single();
        if (error) throw error;
        if (!supportsCustomAutomation(data as AutomationRule)) throw new Error('تنفيذ هذه القاعدة غير متاح.');
      }
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id).eq('organization_id', orgId).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', orgId] });
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ'),
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    createRule,
    deleteRule,
    toggleRule,
  };
}

export function useAutomationLogs() {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ['automation-logs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
