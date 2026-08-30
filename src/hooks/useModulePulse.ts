import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export type PulseRangeKey = 'today' | '7d' | '30d' | '90d';

export const PULSE_RANGES: { key: PulseRangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'اليوم', days: 1 },
  { key: '7d', label: '7 أيام', days: 7 },
  { key: '30d', label: '30 يوم', days: 30 },
  { key: '90d', label: '90 يوم', days: 90 },
];

export interface PulseAlert {
  key: string;
  module: string;
  count: number;
}

export interface PulseActivity {
  at: string;
  module: string;
  type: string;
  title: string;
  actor: string | null;
  ref: string | null;
}

export interface ModulePulse {
  organization_id: string | null;
  generated_at: string;
  range: { from: string; to: string };
  previous_range: { from: string; to: string };
  current: Record<string, number>;
  previous: Record<string, number>;
  alerts: PulseAlert[];
  activity: PulseActivity[];
}

const toDate = (d: Date) => d.toISOString().slice(0, 10);

export function pulseRangeDates(rangeKey: PulseRangeKey) {
  const days = PULSE_RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toDate(from), to: toDate(to) };
}

/** الجداول التي تؤثر على الأرقام — أي تغيير فيها يُبطل الكاش فورًا */
const LIVE_TABLES = [
  'sop_leads',
  'sop_pricing_requests',
  'sop_pricing_options',
  'quotes',
  'bookings',
  'booking_tasks',
  'invoices',
  'customer_payments',
  'supplier_payment_orders',
  'journal_entries',
  'whatsapp_messages',
];

export function useModulePulse(rangeKey: PulseRangeKey = '30d') {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { from, to } = useMemo(() => pulseRangeDates(rangeKey), [rangeKey]);

  const query = useQuery({
    queryKey: ['module-pulse', orgId, from, to],
    enabled: !!orgId,
    staleTime: 30_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ModulePulse> => {
      const { data, error } = await (supabase as any).rpc('get_module_pulse', {
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      const raw = (data || {}) as any;
      return {
        organization_id: raw.organization_id ?? null,
        generated_at: raw.generated_at ?? new Date().toISOString(),
        range: raw.range ?? { from, to },
        previous_range: raw.previous_range ?? { from, to },
        current: (raw.current ?? {}) as Record<string, number>,
        previous: (raw.previous ?? {}) as Record<string, number>,
        alerts: (raw.alerts ?? []) as PulseAlert[],
        activity: (raw.activity ?? []) as PulseActivity[],
      };
    },
  });

  useEffect(() => {
    if (!orgId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['module-pulse', orgId] });
      }, 1500);
    };

    const channel = supabase.channel(`module-pulse-${orgId}`);
    LIVE_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, filter: `organization_id=eq.${orgId}` } as any,
        invalidate,
      );
    });
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return query;
}
