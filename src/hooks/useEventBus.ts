import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DomainEvent {
  id: string;
  organization_id: string | null;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  enriched_payload: Record<string, unknown> | null;
  idempotency_key: string;
  occurred_at: string;
  emitted_by?: string | null;
  correlation_id?: string | null;
}

export interface EventDelivery {
  id: string;
  event_id: string;
  handler_key: string;
  status: 'pending' | 'succeeded' | 'failed' | 'dead';
  attempts: number;
  last_error: string | null;
  next_retry_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  processing_ms?: number | null;
}

export interface EventBusStats {
  total_events: number;
  events_24h: number;
  pending: number;
  failed: number;
  dead: number;
  succeeded_24h: number;
  avg_processing_ms: number;
}

export function useEventBusStats() {
  return useQuery({
    queryKey: ['event-bus-stats'],
    queryFn: async (): Promise<EventBusStats> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [total, recent, pending, failed, dead, succeeded, latency] = await Promise.all([
        (supabase as any).from('domain_events').select('*', { count: 'exact', head: true }),
        (supabase as any).from('domain_events').select('*', { count: 'exact', head: true }).gte('occurred_at', since),
        (supabase as any).from('event_deliveries').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        (supabase as any).from('event_deliveries').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        (supabase as any).from('event_deliveries').select('*', { count: 'exact', head: true }).eq('status', 'dead'),
        (supabase as any).from('event_deliveries').select('*', { count: 'exact', head: true }).eq('status', 'succeeded').gte('updated_at', since),
        (supabase as any).from('event_deliveries').select('processing_ms').not('processing_ms', 'is', null).gte('updated_at', since).limit(500),
      ]);
      const times: number[] = (latency.data || []).map((r: any) => r.processing_ms).filter(Boolean);
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      return {
        total_events: total.count || 0,
        events_24h: recent.count || 0,
        pending: pending.count || 0,
        failed: failed.count || 0,
        dead: dead.count || 0,
        succeeded_24h: succeeded.count || 0,
        avg_processing_ms: avg,
      };
    },
    refetchInterval: 15000,
  });
}

export function useEventVolumeHistory(hours = 24) {
  return useQuery({
    queryKey: ['event-volume', hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from('domain_events')
        .select('event_type, occurred_at')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: true })
        .limit(1000);
      if (error) throw error;
      // Bucket by hour
      const buckets: Record<string, number> = {};
      (data || []).forEach((e: any) => {
        const d = new Date(e.occurred_at);
        d.setMinutes(0, 0, 0);
        const key = d.toISOString();
        buckets[key] = (buckets[key] || 0) + 1;
      });
      return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
    },
    refetchInterval: 30000,
  });
}

interface EventFilters {
  search?: string;
  eventType?: string;
  aggregateType?: string;
  organizationId?: string;
  limit?: number;
}

export function useRecentDomainEvents(filters: EventFilters = {}) {
  const { search, eventType, aggregateType, organizationId, limit = 100 } = filters;
  return useQuery({
    queryKey: ['domain-events', search, eventType, aggregateType, organizationId, limit],
    queryFn: async () => {
      let q = (supabase as any).from('domain_events').select('*').order('occurred_at', { ascending: false }).limit(limit);
      if (eventType) q = q.eq('event_type', eventType);
      if (aggregateType) q = q.eq('aggregate_type', aggregateType);
      if (organizationId) q = q.eq('organization_id', organizationId);
      if (search) q = q.or(`event_type.ilike.%${search}%,aggregate_type.ilike.%${search}%,idempotency_key.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DomainEvent[];
    },
    refetchInterval: 15000,
  });
}

export function useDomainEvent(id?: string) {
  return useQuery({
    queryKey: ['domain-event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('domain_events').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as DomainEvent | null;
    },
  });
}

export function useDeliveriesForEvent(eventId?: string) {
  return useQuery({
    queryKey: ['event-deliveries-for-event', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('event_deliveries')
        .select('*')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EventDelivery[];
    },
    refetchInterval: 10000,
  });
}

export function useEventDeliveries(status?: EventDelivery['status'], limit = 200) {
  return useQuery({
    queryKey: ['event-deliveries', status, limit],
    queryFn: async () => {
      let q = (supabase as any).from('event_deliveries').select('*')
        .order('updated_at', { ascending: false }).limit(limit);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EventDelivery[];
    },
    refetchInterval: 15000,
  });
}

export function useDomainEventsForAggregate(aggregateId?: string) {
  return useQuery({
    queryKey: ['domain-events-aggregate', aggregateId],
    enabled: !!aggregateId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data || []) as DomainEvent[];
    },
  });
}

export function useRetryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await (supabase as any).rpc('retry_event_delivery', { p_delivery_id: deliveryId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تمت إعادة الجدولة');
      qc.invalidateQueries({ queryKey: ['event-deliveries'] });
      qc.invalidateQueries({ queryKey: ['event-deliveries-for-event'] });
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}

export function useReplayEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await (supabase as any).rpc('replay_event', { p_event_id: eventId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`تمت إعادة تشغيل ${count} تسليم`);
      qc.invalidateQueries({ queryKey: ['event-deliveries'] });
      qc.invalidateQueries({ queryKey: ['event-deliveries-for-event'] });
      qc.invalidateQueries({ queryKey: ['event-bus-stats'] });
    },
    onError: (e: any) => toast.error('فشل الإعادة: ' + (e?.message || 'خطأ')),
  });
}
