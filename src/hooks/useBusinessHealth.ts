import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface BusinessHealthKpis {
  range: { from: string; to: string };
  leads: number;
  won: number;
  conversion_pct: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  receivables: number;
  payables: number;
  top_consultant: { id: string; name: string; revenue: number } | null;
}

export function useBusinessHealth(from?: string, to?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['business-health', orgId, from, to],
    queryFn: async (): Promise<BusinessHealthKpis> => {
      const { data, error } = await (supabase as any).rpc('get_business_health_kpis', {
        p_from: from ?? null,
        p_to: to ?? null,
      });
      if (error) throw error;
      return data as BusinessHealthKpis;
    },
    refetchInterval: 120_000,
  });
}
