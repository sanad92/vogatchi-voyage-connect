import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowRule {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  event_type: string;
  action: Record<string, unknown>;
  condition: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  last_run_at: string | null;
  last_duration_ms: number | null;
  failure_count: number;
  success_count: number;
}

export interface WorkflowRuleRun {
  id: string;
  rule_id: string;
  event_id: string | null;
  status: 'succeeded' | 'failed' | 'skipped';
  duration_ms: number | null;
  error: string | null;
  ran_at: string;
}

export function useWorkflowRules() {
  return useQuery({
    queryKey: ['workflow-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('workflow_rules')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkflowRule[];
    },
    refetchInterval: 30_000,
  });
}

export function useWorkflowRuleRuns(ruleId?: string, limit = 50) {
  return useQuery({
    queryKey: ['workflow-rule-runs', ruleId, limit],
    enabled: !!ruleId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('workflow_rule_runs')
        .select('*')
        .eq('rule_id', ruleId)
        .order('ran_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WorkflowRuleRun[];
    },
  });
}

export function useToggleWorkflowRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('workflow_rules')
        .update({ is_active: input.is_active, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم التحديث');
      qc.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useRetryWorkflowRuleRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ruleId: string; eventId: string }) => {
      const { error } = await (supabase as any).rpc('retry_workflow_rule_run', {
        p_rule_id: input.ruleId,
        p_event_id: input.eventId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إعادة التنفيذ');
      qc.invalidateQueries({ queryKey: ['workflow-rule-runs'] });
      qc.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useUpsertWorkflowRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<WorkflowRule> & { id?: string }) => {
      const payload: any = {
        name: rule.name,
        description: rule.description ?? null,
        event_type: rule.event_type,
        condition: rule.condition ?? {},
        action: rule.action ?? {},
        priority: rule.priority ?? 100,
        is_active: rule.is_active ?? true,
        organization_id: rule.organization_id ?? null,
        updated_at: new Date().toISOString(),
      };
      if (rule.id) {
        const { error } = await (supabase as any).from('workflow_rules').update(payload).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('workflow_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useDeleteWorkflowRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('workflow_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}
