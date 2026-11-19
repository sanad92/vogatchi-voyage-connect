import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface JourneyStep {
  id: string;
  journey_id: string;
  step_order: number;
  step_type: 'send_whatsapp' | 'send_email' | 'wait' | 'condition' | 'tag' | 'emit_event' | 'exit';
  config: Record<string, any>;
  delay_minutes: number;
}

export interface MarketingJourney {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  category: string;
  trigger_event: string;
  enrollment_condition: Record<string, any>;
  goal_event: string | null;
  is_active: boolean;
  is_template: boolean;
  stats: { enrolled?: number; completed?: number; goal_hit?: number; exited?: number };
}

export function useMarketingJourneys() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['marketing-journeys', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
  return useQuery({
    queryKey: ['marketing-journey', journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      const [{ data: j, error: journeyError }, { data: steps, error: stepsError }] = await Promise.all([
        (supabase as any).from('marketing_journeys').select('*').eq('id', journeyId).maybeSingle(),
        (supabase as any).from('journey_steps').select('*').eq('journey_id', journeyId).order('step_order'),
      ]);
      if (journeyError || stepsError) throw journeyError ?? stepsError;
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
        is_active: false,
        is_template: false,
      };
      const { data, error } = await (supabase as any).from('marketing_journeys').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success('تم حفظ الرحلة');
      qc.invalidateQueries({ queryKey: ['marketing-journeys'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ'),
  });
}

export function useCloneJourneyTemplate() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!orgId) throw new Error('لا توجد شركة نشطة');
      const { data, error } = await (supabase as any).rpc('clone_marketing_journey_template', {
        p_template_id: templateId,
        p_org_id: orgId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success('تم نسخ القالب');
      qc.invalidateQueries({ queryKey: ['marketing-journeys'] });
    },
    onError: () => toast.error('تعذّر نسخ القالب'),
  });
}

export function usePauseJourney() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('marketing_journeys')
        .update({ is_active: false }).eq('id', id).eq('organization_id', orgId).eq('is_template', false)
        .select('id').single();
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-journeys'] }),
    onError: () => toast.error('تعذّر إيقاف الرحلة'),
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
      const { error } = await (supabase as any).rpc('save_marketing_journey_draft', {
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

export function useEnrollInJourney() {
  return useMutation({
    mutationFn: async ({ journeyId, customerId, context }: { journeyId: string; customerId: string; context?: any }) => {
      const { data, error } = await (supabase as any).rpc('enroll_in_journey', {
        p_journey_id: journeyId,
        p_customer_id: customerId,
        p_context: context ?? {},
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => toast.success('تم تسجيل العميل في الرحلة'),
    onError: (e: any) => toast.error(e?.message || 'فشل التسجيل'),
  });
}

export function useJourneyAnalytics(journeyId?: string) {
  return useQuery({
    queryKey: ['journey-analytics', journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('journey_enrollments')
        .select('status')
        .eq('journey_id', journeyId);
      if (error) throw error;
      const rows = (data ?? []) as { status: string }[];
      const by = (s: string) => rows.filter(r => r.status === s).length;
      return {
        total: rows.length,
        active: by('active'),
        completed: by('completed'),
        goal_hit: by('goal_hit'),
        exited: by('exited'),
        failed: by('failed'),
      };
    },
  });
}
