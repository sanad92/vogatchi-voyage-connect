
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export const useOnboardingStatus = () => {
  const orgId = useOrgId();

  const { data: needsOnboarding, isLoading } = useQuery({
    queryKey: ['onboarding-status', orgId],
    queryFn: async () => {
      if (!orgId) return false;
      const { data, error } = await supabase
        .from('organizations')
        .select('onboarding_completed')
        .eq('id', orgId)
        .single();
      if (error || !data) return false;
      return !data.onboarding_completed;
    },
    enabled: !!orgId,
    staleTime: 30 * 60 * 1000,
  });

  return { needsOnboarding: needsOnboarding ?? false, isLoading };
};
