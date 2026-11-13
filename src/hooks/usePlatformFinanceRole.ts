import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformFinanceRole() {
  const { user } = useOptimizedAuth();
  const query = useQuery({
    queryKey: ['platform-finance-role', user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('get_platform_finance_role').abortSignal(signal);
      if (error) throw error;
      return data === 'owner' || data === 'accountant' || data === 'auditor' ? data : null;
    },
  });
  return { role: query.data ?? null, loading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
