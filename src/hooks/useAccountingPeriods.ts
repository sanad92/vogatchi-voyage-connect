import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { toast } from 'sonner';

export interface AccountingPeriod {
  id: string;
  organization_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked';
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
}

export const useAccountingPeriods = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['accounting-periods', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.from as any)('accounting_periods')
        .select('*').eq('organization_id', orgId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as AccountingPeriod[];
    },
    enabled: !!orgId,
  });
};

export const useCreatePeriod = () => {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: { period_name: string; start_date: string; end_date: string }) => {
      if (!orgId) throw new Error('No organization');
      const { data, error } = await (supabase.from as any)('accounting_periods')
        .insert({ ...input, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('تم إنشاء الفترة');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useClosePeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await (supabase.rpc as any)('close_accounting_period', { _period_id: periodId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('تم إقفال الفترة');
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useReopenPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await (supabase.rpc as any)('reopen_accounting_period', { _period_id: periodId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('تم فتح الفترة');
    },
    onError: (e: any) => toast.error(e.message),
  });
};
