import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';

export function useWhatsAppChannels() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  return useQuery({
    queryKey: ['wa-inbox-channels', orgId, user?.id],
    enabled: !!orgId && !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('wa_inbox_channels', { _org: orgId! });
      if (error) throw error;
      return data ?? [];
    },
  });
}
