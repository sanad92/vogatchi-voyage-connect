import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface FeatureFlag {
  id: string;
  organization_id: string;
  flag_key: string;
  enabled: boolean;
  value: any;
  description: string | null;
  updated_at: string;
}

export const useFeatureFlags = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['feature-flags', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any).from('feature_flags').select('*').eq('organization_id', orgId);
      if (error) throw error;
      return (data ?? []) as FeatureFlag[];
    },
    enabled: !!orgId,
  });
};

export const useFeatureFlag = (key: string): boolean => {
  const { data = [] } = useFeatureFlags();
  return data.find((f) => f.flag_key === key)?.enabled ?? false;
};

export const useFlagMutations = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: async (input: { flag_key: string; enabled: boolean; description?: string }) => {
      if (!orgId) throw new Error('no org');
      const { error } = await (supabase as any).from('feature_flags').upsert(
        { organization_id: orgId, ...input },
        { onConflict: 'organization_id,flag_key' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('تم تحديث الخاصية');
    },
    onError: (e: any) => toast.error(e.message),
  });
  return { upsert };
};
