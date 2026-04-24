import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { toast } from 'sonner';

export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  parent_id: string | null;
  manager_employee_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCenterPnL {
  cost_center_id: string;
  cost_center_code: string;
  cost_center_name: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export const useCostCenters = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cost-centers', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.from as any)('cost_centers')
        .select('*')
        .eq('organization_id', orgId)
        .order('code');
      if (error) throw error;
      return (data || []) as CostCenter[];
    },
    enabled: !!orgId,
  });
};

export const useCostCenterPnL = (startDate: string, endDate: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cost-center-pnl', orgId, startDate, endDate],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase.rpc as any)('get_cost_center_pnl', {
        _org_id: orgId, _start_date: startDate, _end_date: endDate,
      });
      if (error) throw error;
      return (data || []) as CostCenterPnL[];
    },
    enabled: !!orgId && !!startDate && !!endDate,
  });
};

export const useCreateCostCenter = () => {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: async (input: { code: string; name: string; name_ar?: string; description?: string }) => {
      if (!orgId) throw new Error('No organization');
      const { data, error } = await (supabase.from as any)('cost_centers')
        .insert({ ...input, organization_id: orgId })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('تم إنشاء مركز التكلفة');
    },
    onError: (e: any) => toast.error(e.message),
  });
};
