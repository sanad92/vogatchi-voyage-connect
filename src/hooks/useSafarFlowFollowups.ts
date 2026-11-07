import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

/**
 * Observability for the existing quote_followups scheduler.
 * Read-only. Never sends WhatsApp or mutates quotes / tasks / payments.
 */
export interface FlowFollowupItem {
  id: string;
  quote_id: string;
  step: number;
  status: 'pending' | 'notified';
  due_at: string;
  owner_user_id: string | null;
}
export interface FlowFollowupSummary {
  due: number;
  upcoming: number;
  notified: number;
  unassigned: number;
  items: FlowFollowupItem[];
}

export function useSafarFlowFollowups() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['safar-flow-followups', orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FlowFollowupSummary> => {
      if (!orgId) throw new Error('يجب تحديد الشركة أولًا');
      const db = supabase as any;
      const now = new Date().toISOString();
      const base = () => db.from('quote_followups').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      const [due, upcoming, notified, unassigned, items] = await Promise.all([
        base().eq('status', 'pending').lte('due_at', now),
        base().eq('status', 'pending').gt('due_at', now),
        base().eq('status', 'notified'),
        base().eq('status', 'pending').is('owner_user_id', null),
        db.from('quote_followups')
          .select('id, quote_id, step, status, due_at, owner_user_id')
          .eq('organization_id', orgId)
          .in('status', ['pending', 'notified'])
          .order('due_at', { ascending: true })
          .limit(12),
      ]);
      const error = [due, upcoming, notified, unassigned, items].find(r => r.error)?.error;
      if (error) throw error;
      return {
        due: due.count ?? 0,
        upcoming: upcoming.count ?? 0,
        notified: notified.count ?? 0,
        unassigned: unassigned.count ?? 0,
        items: (items.data ?? []) as FlowFollowupItem[],
      };
    },
  });
}
