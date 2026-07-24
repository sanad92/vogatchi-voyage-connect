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
  idempotency_key: string;
  occurred_at: string;
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
}

export function useRecentDomainEvents(limit = 100) {
  return useQuery({
    queryKey: ['domain-events', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('domain_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as DomainEvent[];
    },
    refetchInterval: 15000,
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
    },
    onError: (e: any) => toast.error('فشل: ' + (e?.message || 'خطأ')),
  });
}
