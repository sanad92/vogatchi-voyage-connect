import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from './useOrgId';
import { useOptimizedAuth } from './useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export type CurrencyAmount = { currency: string; amount: number };

export interface OpsCommandCenter {
  date: string;
  timezone: string;
  arrivals_today: number;
  departures_today: number;
  checkins_next_7: number;
  overdue_tasks: number;
  today_tasks: number;
  edit_requests: number;
  failed_events: number | null;
  whatsapp_failures_24h: number | null;
  finance: {
    receivables: CurrencyAmount[];
    receipts: CurrencyAmount[];
    pending_supplier_pos: number;
    refund_approvals: number;
  } | null;
}

export type QueueFilter = 'today' | 'overdue' | 'unscheduled' | 'assigned_to_me' | 'edit_requests'
  | 'waiting_customer' | 'waiting_supplier' | 'waiting_payment' | 'completed_today';
export type TaskWaiting = 'customer' | 'supplier' | 'payment';
export const opsQueuePageSize = 30;

export type OpsQueueItem = {
  id: string;
  title: string;
  status: string;
  waiting_on: TaskWaiting | null;
  due_at: string | null;
  completed_at: string | null;
  priority: string | null;
  booking_id: string | null;
  booking_number: string | null;
  customer_name: string | null;
  customer_id: string | null;
  kind: 'task' | 'edit_request';
  can_act: boolean;
  total_count: number;
};

export function useOpsCommandCenter(date?: string) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  return useQuery({
    queryKey: ['ops-command-center', orgId, user?.id, date],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<OpsCommandCenter>('get_ops_command_center_for_org', {
        _org: orgId, _day: date ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('تعذر تحميل بيانات العمليات');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useOpsQueue(filter: QueueFilter, page: number) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  return useQuery({
    queryKey: ['ops-queue', orgId, user?.id, filter, page],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<OpsQueueItem[]>('list_operations_queue', {
        _org: orgId, _filter: filter, _page_size: opsQueuePageSize, _skip: (page - 1) * opsQueuePageSize,
      });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 45_000,
  });
}

export function useUpdateOpsTask(orgId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, waiting }: { id: string; action: 'complete' | 'waiting'; waiting?: TaskWaiting | null }) => {
      if (!orgId) throw new Error('تعذر تحديد الشركة');
      const { data, error } = await callUntypedRpc<string>('update_operations_task', {
        _org: orgId, _task: id, _action: action, _waiting: waiting ?? null,
      });
      if (error) throw error;
      if (data !== id) throw new Error('تعذر تأكيد حفظ المهمة');
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['ops-queue', orgId] }),
        qc.invalidateQueries({ queryKey: ['ops-command-center', orgId] }),
        qc.invalidateQueries({ queryKey: ['workspace-tasks'] }),
        qc.invalidateQueries({ queryKey: ['workspace-timeline'] }),
      ]);
    },
  });
}
