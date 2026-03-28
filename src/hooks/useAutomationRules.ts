import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export type TriggerType = 'booking_created' | 'payment_confirmed' | 'before_travel' | 'booking_status_changed' | 'invoice_created' | 'customer_registered';
export type ActionType = 'send_email' | 'send_whatsapp' | 'create_invoice' | 'send_reminder';

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
};

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'إرسال بريد إلكتروني',
  send_whatsapp: 'إرسال رسالة واتساب',
  create_invoice: 'إنشاء فاتورة',
  send_reminder: 'إرسال تذكير',
};

export const TRIGGER_ICONS: Record<TriggerType, string> = {
  booking_created: '📋',
  payment_confirmed: '💳',
  before_travel: '✈️',
  booking_status_changed: '🔄',
};

export const ACTION_ICONS: Record<ActionType, string> = {
  send_email: '📧',
  send_whatsapp: '💬',
  create_invoice: '🧾',
  send_reminder: '⏰',
};

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
    mutationFn: async (input: {
      name: string;
      description?: string;
      trigger_type: TriggerType;
      trigger_config?: Record<string, any>;
      actions: Omit<AutomationAction, 'id' | 'rule_id'>[];
    }) => {
      if (!orgId) throw new Error('No organization');
      const { data: user } = await supabase.auth.getUser();

      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description || null,
          trigger_type: input.trigger_type,
          trigger_config: input.trigger_config || {},
          created_by: user.user?.id || null,
        })
        .select()
        .single();
      if (ruleError) throw ruleError;

      if (input.actions.length > 0) {
        const actionsToInsert = input.actions.map((a, i) => ({
          rule_id: rule.id,
          action_type: a.action_type,
          action_config: a.action_config || {},
          sort_order: i,
          is_active: a.is_active ?? true,
        }));
        const { error: actError } = await supabase
          .from('automation_actions')
          .insert(actionsToInsert);
        if (actError) throw actError;
      }
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', orgId] });
      toast.success('تم إنشاء قاعدة الأتمتة بنجاح');
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ'),
  });

  const updateRule = useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string;
      trigger_type?: TriggerType;
      trigger_config?: Record<string, any>;
      is_active?: boolean;
      actions?: Omit<AutomationAction, 'id' | 'rule_id'>[];
    }) => {
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.trigger_type !== undefined) updates.trigger_type = input.trigger_type;
      if (input.trigger_config !== undefined) updates.trigger_config = input.trigger_config;
      if (input.is_active !== undefined) updates.is_active = input.is_active;

      const { error } = await supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;

      if (input.actions) {
        await supabase.from('automation_actions').delete().eq('rule_id', input.id);
        if (input.actions.length > 0) {
          const actionsToInsert = input.actions.map((a, i) => ({
            rule_id: input.id,
            action_type: a.action_type,
            action_config: a.action_config || {},
            sort_order: i,
            is_active: a.is_active ?? true,
          }));
          const { error: actErr } = await supabase
            .from('automation_actions')
            .insert(actionsToInsert);
          if (actErr) throw actErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules', orgId] });
      toast.success('تم تحديث القاعدة بنجاح');
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id);
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
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id);
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
    updateRule,
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
