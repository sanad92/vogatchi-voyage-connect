import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from '@/hooks/use-toast';

export interface PriceCatalogRow {
  id: string;
  destination: string;
  category: string;
  name: string;
  rating: string | null;
  board: string | null;
  valid_from: string | null;
  valid_to: string | null;
  price_single: number | null;
  price_double: number | null;
  price_triple: number | null;
  currency: string;
  unit: string;
  notes: string | null;
  synced_at: string;
}

export const usePriceCatalog = (destination?: string) => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const rows = useQuery({
    queryKey: ['ai-price-catalog', orgId, destination || 'all'],
    queryFn: async (): Promise<PriceCatalogRow[]> => {
      if (!orgId) return [];
      let query = (supabase as any).from('ai_price_catalog')
        .select('*').eq('organization_id', orgId)
        .order('destination').order('name').limit(500);
      if (destination) query = query.eq('destination', destination);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const lastSync = useQuery({
    queryKey: ['ai-price-catalog-sync', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await (supabase as any).from('ai_price_catalog_syncs')
        .select('*').eq('organization_id', orgId)
        .order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const sync = useMutation({
    mutationFn: async (sheet: string) => {
      if (!orgId) throw new Error('no org');
      const { data, error } = await supabase.functions.invoke('sales-price-catalog-sync', {
        body: { organization_id: orgId, sheet },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { rows: number; tabs: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-price-catalog', orgId] });
      qc.invalidateQueries({ queryKey: ['ai-price-catalog-sync', orgId] });
      qc.invalidateQueries({ queryKey: ['whatsapp-chatbot-settings', orgId] });
      toast({ title: 'تم تحديث دليل الأسعار', description: `${data.rows} سعر من ${data.tabs} وجهة` });
    },
    onError: (e: any) => toast({ title: 'تعذّر تحديث الأسعار', description: e.message, variant: 'destructive' }),
  });

  const destinations = Array.from(new Set((rows.data || []).map((r) => r.destination)));

  return {
    rows: rows.data || [],
    destinations,
    isLoading: rows.isLoading,
    lastSync: lastSync.data,
    sync: sync.mutateAsync,
    isSyncing: sync.isPending,
  };
};
