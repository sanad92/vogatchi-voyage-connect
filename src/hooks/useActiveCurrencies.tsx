import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import type { SupportedCurrency } from '@/types/currency';

export interface ActiveCurrencyRow {
  currency: SupportedCurrency;
  entries_count: number;
}

export const useActiveCurrencies = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['active-currencies', orgId],
    queryFn: async () => {
      if (!orgId) return [] as ActiveCurrencyRow[];
      const { data, error } = await (supabase.rpc as any)('get_active_currencies', { _org_id: orgId });
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        currency: (r.currency || 'EGP') as SupportedCurrency,
        entries_count: Number(r.entries_count || 0),
      }));
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
  });
};
