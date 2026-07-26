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
      const [{ data: j }, { data: steps }] = await Promise.all([
        (supabase as any).from('marketing_journeys').select('*').eq('id', journeyId).maybeSingle(),
        (supabase as any).from('journey_steps').select('*').eq('journey_id', journeyId).order('step_order'),
      ]);
      return { journey: j as MarketingJourney | null, steps: (steps ?? []) as JourneyStep[] };
    },
  });
}

export function useUpsertJourney() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: Partial<MarketingJourney> & { id?: string }) => {
      const payload: any = {
        organization_id: orgId,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? 'custom',
        trigger_event: input.trigger_event,
        enrollment_condition: input.enrollment_condition ?? {},
        goal_event: input.goal_event ?? null,
        is_active: input.is_active ?? false,
        is_template: false,
      };
      if (input.id) {
        const { error } = await (supabase as any).from('marketing_journeys').update(payload).eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
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
      const { data: tpl } = await (supabase as any).from('marketing_journeys').select('*').eq('id', templateId).single();
      const { data: steps } = await (supabase as any).from('journey_steps').select('*').eq('journey_id', templateId).order('step_order');
      const { data: created, error } = await (supabase as any).from('marketing_journeys').insert({
        organization_id: orgId,
        name: `${tpl.name} (نسخة)`,
        description: tpl.description,
        category: tpl.category,
        trigger_event: tpl.trigger_event,
        enrollment_condition: tpl.enrollment_condition,
        goal_event: tpl.goal_event,
        is_active: false,
        is_template: false,
      }).select('id').single();
      if (error) throw error;
      if (steps?.length) {
        await (supabase as any).from('journey_steps').insert(
          steps.map((s: any, i: number) => ({
            journey_id: created.id,
            step_order: i,
            step_type: s.step_type,
            config: s.config,
            delay_minutes: s.delay_minutes,
          })),
        );
      }
      return created.id as string;
    },
    onSuccess: () => {
      toast.success('تم نسخ القالب');
      qc.invalidateQueries({ queryKey: ['marketing-journeys'] });
    },
  });
}

export function useToggleJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from('marketing_journeys').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-journeys'] }),
  });
}

export function useSaveJourneySteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ journeyId, steps }: { journeyId: string; steps: Partial<JourneyStep>[] }) => {
      await (supabase as any).from('journey_steps').delete().eq('journey_id', journeyId);
      if (steps.length) {
        const { error } = await (supabase as any).from('journey_steps').insert(
          steps.map((s, i) => ({
            journey_id: journeyId,
            step_order: i,
            step_type: s.step_type,
            config: s.config ?? {},
            delay_minutes: s.delay_minutes ?? 0,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success('تم حفظ الخطوات');
      qc.invalidateQueries({ queryKey: ['marketing-journey', v.journeyId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ'),
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
      const { data } = await (supabase as any)
        .from('journey_enrollments')
        .select('status')
        .eq('journey_id', journeyId);
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
