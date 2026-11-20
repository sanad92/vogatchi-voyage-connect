import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useOrgId } from '@/hooks/useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { toast } from 'sonner';

export interface JourneyStep {
  id: string;
  journey_id: string;
  step_order: number;
  step_type: 'send_whatsapp' | 'send_email' | 'wait' | 'condition' | 'tag' | 'emit_event' | 'exit' | 'create_follow_up';
  config: Partial<Record<'notes' | 'subject' | 'body' | 'message' | 'event' | 'tag', string>>;
  delay_minutes: number;
}

export interface MarketingJourney {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  category: string;
  trigger_event: string;
  enrollment_condition: Json;
  goal_event: string | null;
  is_active: boolean;
  is_template: boolean;
  runtime_enabled_at?: string | null;
  stats: { enrolled?: number; completed?: number; goal_hit?: number; exited?: number };
}

export function useMarketingJourneys() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['marketing-journeys', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_journeys')
        .select('*')
        .or(`organization_id.eq.${orgId},is_template.eq.true`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MarketingJourney[];
    },
    enabled: !!orgId,
  });
}

export function useJourney(journeyId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['marketing-journey', journeyId, orgId],
    enabled: Boolean(journeyId && orgId),
    queryFn: async () => {
      const { data: j, error: journeyError } = await supabase
        .from('marketing_journeys').select('*').eq('id', journeyId)
        .or(`organization_id.eq.${orgId},and(is_template.eq.true,organization_id.is.null)`).maybeSingle();
      if (journeyError) throw journeyError;
      if (!j) return { journey: null, steps: [] };
      const { data: steps, error: stepsError } = await supabase
        .from('journey_steps').select('*').eq('journey_id', j.id).order('step_order');
      if (stepsError) throw stepsError;
      return { journey: j as MarketingJourney | null, steps: (steps ?? []) as JourneyStep[] };
    },
  });
}

export function useUpsertJourney() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Pick<MarketingJourney, 'name' | 'trigger_event'> & Partial<MarketingJourney>) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const payload = {
        organization_id: orgId,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? 'custom',
        trigger_event: input.trigger_event,
        enrollment_condition: input.enrollment_condition ?? {},
        goal_event: input.goal_event ?? null,
      };
      const { data, error } = await supabase.from('marketing_journeys').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success('تم حفظ الرحلة');
      qc.invalidateQueries({ queryKey: ['marketing-journeys'] });
    },
    onError: (e: { message?: string }) => toast.error(e.message || 'فشل الحفظ'),
  });
}

export function useCloneJourneyTemplate() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const { data, error } = await callUntypedRpc<string>('clone_marketing_journey_template', {
        p_template_id: templateId,
        p_org_id: orgId,
      });
      if (error) throw error;
      if (!data) throw new Error('تعذّر نسخ القالب');
      return data;
    },
    onSuccess: () => {
      toast.success('تم نسخ القالب');
      qc.invalidateQueries({ queryKey: ['marketing-journeys'] });
    },
    onError: () => toast.error('تعذّر نسخ القالب'),
  });
}

export function useSetJourneyActive() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const { error } = await callUntypedRpc('set_marketing_journey_active', {
        _journey: id, _organization: orgId, _enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: async (_result, { id, enabled }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['marketing-journeys'] }),
        qc.invalidateQueries({ queryKey: ['marketing-journey', id] }),
      ]);
      toast.success(enabled ? 'تم تشغيل تسجيل العملاء الجدد' : 'تم إيقاف الرحلة');
    },
    onError: (error: { code?: string }) => toast.error(
      error.code === '22023'
        ? 'التشغيل يدعم إضافة عميل جديد مع متابعة داخلية وخطوات انتظار أو إنهاء.'
        : 'تعذّر تغيير حالة الرحلة',
    ),
  });
}

export function useSaveJourneyDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      journeyId: string;
      name: string;
      description: string;
      category: string;
      trigger_event: string;
      goal_event: string | null;
      steps: Partial<JourneyStep>[];
    }) => {
      const { error } = await callUntypedRpc('save_marketing_journey_draft', {
        p_journey_id: input.journeyId,
        p_name: input.name,
        p_description: input.description,
        p_category: input.category,
        p_trigger_event: input.trigger_event,
        p_goal_event: input.goal_event,
        p_steps: input.steps.map((step) => ({
          id: step.id ?? null,
          step_type: step.step_type,
          config: step.config ?? {},
          delay_minutes: step.delay_minutes ?? 0,
        })),
      });
      if (error) throw error;
    },
    onSuccess: async (_result, { journeyId }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['marketing-journey', journeyId] }),
        qc.invalidateQueries({ queryKey: ['marketing-journeys'] }),
      ]);
      toast.success('تم حفظ الرحلة وخطواتها');
    },
    onError: (error: { code?: string }) => toast.error(
      error.code === '55000' ? 'توجد تسجيلات جارية في الرحلة' : 'تعذّر حفظ الرحلة وخطواتها',
    ),
  });
}

export function useJourneyAnalytics(journeyId?: string) {
  type RuntimeCounts = { total: number; active: number; completed: number; exited: number; failed: number; retrying: number };
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['journey-analytics', journeyId, orgId],
    enabled: Boolean(journeyId && orgId),
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<RuntimeCounts[]>('get_marketing_journey_runtime_counts', {
        _journey: journeyId, _organization: orgId,
      });
      if (error) throw error;
      if (!data?.[0]) throw new Error('حالة التنفيذ غير متاحة');
      return data[0];
    },
  });
}
