import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  entity_name?: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  organization_id: string | null;
  created_at: string;
}

interface UseAuditLogOptions {
  targetTable?: string;
  targetId?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  enabled?: boolean;
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const orgId = useOrgId();
  const { targetTable, targetId, action, userId, dateFrom, dateTo, limit = 200, enabled = true } = options;

  return useQuery({
    queryKey: ['audit-log', orgId, targetTable, targetId, action, userId, dateFrom, dateTo, limit],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (targetTable) query = query.eq('target_table', targetTable);
      if (targetId) query = query.eq('target_id', targetId);
      if (action && action !== 'all') query = query.eq('action', action);
      if (userId) query = query.eq('user_id', userId);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!orgId && enabled,
  });
}

// Helper to compute changed fields between old and new values
export function getChangedFields(oldValues: Record<string, any> | null, newValues: Record<string, any> | null): string[] {
  if (!oldValues || !newValues) return [];
  const changed: string[] = [];
  const skipFields = ['updated_at', 'created_at'];
  for (const key of Object.keys(newValues)) {
    if (skipFields.includes(key)) continue;
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changed.push(key);
    }
  }
  return changed;
}
