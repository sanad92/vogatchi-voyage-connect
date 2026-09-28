import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export interface SalesBriefRow {
  id: string;
  destination: string | null;
  travel_from: string | null;
  travel_to: string | null;
  adults: number | null;
  children: number | null;
  children_ages: string | null;
  budget_range: string | null;
  trip_type: string | null;
  board_preference: string | null;
  notes: string | null;
  readiness: string;
  handed_off_at: string | null;
  updated_at: string;
}

export const useSalesBrief = (conversationId?: string) => {
  const orgId = useOrgId();

  const query = useQuery({
    queryKey: ['ai-sales-brief', orgId, conversationId],
    queryFn: async (): Promise<SalesBriefRow | null> => {
      if (!orgId || !conversationId) return null;
      const { data, error } = await (supabase as any).from('ai_sales_briefs')
        .select('*').eq('organization_id', orgId).eq('conversation_id', conversationId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!conversationId,
    staleTime: 15_000,
  });

  return { brief: query.data ?? null, isLoading: query.isLoading, error: query.error };
};
