import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface OpsCommandCenter {
  arrivals_today: number;
  departures_today: number;
  checkins_next_7: number;
  pending_customer_payments: number;
  pending_supplier_pos: number;
  overdue_tasks: number;
  today_tasks: number;
  failed_events: number;
  whatsapp_failures_24h: number;
  refund_approvals: number;
  revenue_today: number;
  profit_today: number;
}

export function useOpsCommandCenter(date?: string) {
  const orgId = useOrgId();
  const d = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['ops-command-center', orgId, d],
    queryFn: async (): Promise<OpsCommandCenter> => {
      const { data, error } = await (supabase as any).rpc('get_ops_command_center', { p_date: d });
      if (error) throw error;
      return data as OpsCommandCenter;
    },
    refetchInterval: 60_000,
  });
}

export type QueueFilter =
  | 'today'
  | 'overdue'
  | 'assigned_to_me'
  | 'waiting_customer'
  | 'waiting_supplier'
  | 'waiting_payment'
  | 'completed_today';

export function useOpsQueue(filter: QueueFilter) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['ops-queue', orgId, filter],
    enabled: !!orgId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const todayEnd = today + 'T23:59:59Z';
      const now = new Date().toISOString();
      let q: any = (supabase as any).from('booking_tasks').select(`
        *, booking:bookings(id, booking_number, customer_name, workflow_stage, customer_id)
      `).order('due_at', { ascending: true }).limit(200);
      if (filter === 'today') q = q.neq('status', 'completed').gte('due_at', today).lte('due_at', todayEnd);
      else if (filter === 'overdue') q = q.neq('status', 'completed').lt('due_at', now);
      else if (filter === 'assigned_to_me') {
        const { data: u } = await supabase.auth.getUser();
        q = q.neq('status', 'completed').eq('assignee_id', u.user?.id ?? '00000000-0000-0000-0000-000000000000');
      } else if (filter === 'waiting_customer') q = q.eq('status', 'pending').ilike('title', '%عميل%');
      else if (filter === 'waiting_supplier') q = q.eq('status', 'pending').ilike('title', '%مورد%');
      else if (filter === 'waiting_payment') q = q.eq('status', 'pending').ilike('title', '%دفع%');
      else if (filter === 'completed_today') q = q.eq('status', 'completed').gte('updated_at', today);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 45_000,
  });
}
