import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isCustomSubscriptionPlan, type SubscriptionSelection } from '@/lib/subscriptionOnboarding';

export function usePublicSubscriptionPlan(selection: SubscriptionSelection | null) {
  const planId = selection?.planId;
  return useQuery({
    queryKey: ['payment-plan', planId],
    enabled: !!planId,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!planId) return null;
      const { data, error } = await supabase.from('subscription_plans')
        .select('*').eq('id', planId).eq('is_active', true).gt('price_monthly', 0)
        .abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data && !isCustomSubscriptionPlan(data.name, data.name_ar) ? data : null;
    },
  });
}
