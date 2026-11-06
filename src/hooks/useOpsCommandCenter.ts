import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

// booking_tasks uses 'done' (not 'completed'); keep legacy completed rows readable.
export const ACTIVE_TASK_STATUSES = ['open', 'in_progress', 'pending'] as const;
export const COMPLETED_TASK_STATUSES = ['done', 'completed'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
export const localDayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const localDayWindow = (now = new Date()) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

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
  const d = date ?? localDayKey();
  return useQuery({
    queryKey: ['ops-command-center', orgId, d],
    enabled: !!orgId,
    queryFn: async (): Promise<OpsCommandCenter> => {
      const { data, error } = await (supabase as any).rpc('get_ops_command_center', { p_date: d });
      if (error) throw error;
      if (!data || (data as any).error) {
        throw new Error((data as any)?.error || 'تعذر تحميل مؤشرات العمليات');
      }
      // Legacy RPC selects the first organization membership. A tenant-explicit
      // replacement is needed before multi-organization KPI accuracy is certified.
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
      if (!orgId) throw new Error('لم يتم تحديد الشركة الحالية');
      const { start, end } = localDayWindow();
      const now = new Date().toISOString();

      let q: any = (supabase as any).from('booking_tasks').select(`
        *, booking:bookings(id, booking_number, customer_name, workflow_stage, customer_id)
      `)
        .eq('organization_id', orgId)
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(200);

      if (filter === 'completed_today') {
        q = q.in('status', [...COMPLETED_TASK_STATUSES]).gte('completed_at', start).lt('completed_at', end);
      } else {
        q = q.in('status', [...ACTIVE_TASK_STATUSES]);
        if (filter === 'today') q = q.gte('due_at', start).lt('due_at', end);
        else if (filter === 'overdue') q = q.lt('due_at', now);
        else if (filter === 'assigned_to_me') {
          const { data: u, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          if (!u.user?.id) throw new Error('يجب تسجيل الدخول لعرض مهامك');
          q = q.eq('assignee_id', u.user.id);
        } else if (filter === 'waiting_customer') {
          // Legacy tasks do not have a structured waiting reason yet.
          q = q.ilike('title', '%عميل%');
        } else if (filter === 'waiting_supplier') {
          q = q.ilike('title', '%مورد%');
        } else if (filter === 'waiting_payment') {
          q = q.ilike('title', '%دفع%');
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 45_000,
  });
}
