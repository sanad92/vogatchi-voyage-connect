import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from '@/hooks/use-toast';

export type AutomationTriggerType =
  | 'message_received' | 'message_sent' | 'conversation_opened' | 'conversation_closed'
  | 'keyword_match' | 'no_reply_timeout' | 'first_message' | 'tag_added' | 'sla_breach';

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'not_equals' | 'in' | 'greater_than' | 'less_than';
  value: any;
}

export interface AutomationAction {
  type: 'send_message' | 'send_template' | 'assign_to' | 'add_tag' | 'set_priority' | 'set_status' | 'create_followup' | 'notify_agent' | 'webhook';
  config: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, any>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  priority: number;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppAutomation = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['whatsapp-automation-rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('whatsapp_automation_rules_v2')
        .select('*')
        .eq('organization_id', orgId)
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data || []) as AutomationRule[];
    },
    enabled: !!orgId,
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['whatsapp-automation-executions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from('whatsapp_automation_executions')
        .select('*, rule:rule_id(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const createRule = useMutation({
    mutationFn: async (input: Partial<AutomationRule>) => {
      if (!orgId) throw new Error('no org');
      const { data, error } = await (supabase as any)
        .from('whatsapp_automation_rules_v2')
        .insert({ ...input, organization_id: orgId })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-automation-rules', orgId] });
      toast({ title: 'تم إنشاء القاعدة' });
    },
    onError: (e: any) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AutomationRule> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('whatsapp_automation_rules_v2').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-automation-rules', orgId] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('whatsapp_automation_rules_v2').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-automation-rules', orgId] });
      toast({ title: 'تم حذف القاعدة' });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('whatsapp_automation_rules_v2').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-automation-rules', orgId] }),
  });

  return {
    rules, executions, isLoading,
    createRule: createRule.mutateAsync,
    updateRule: updateRule.mutateAsync,
    deleteRule: deleteRule.mutateAsync,
    toggleRule: toggleRule.mutateAsync,
  };
};
