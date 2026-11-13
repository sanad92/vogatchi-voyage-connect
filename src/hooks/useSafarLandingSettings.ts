import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safarLandingDefaults, safarLandingKeys } from '@/lib/safarLandingSettings';

export const safarLandingQueryKey = ['safar-landing-settings'];

export function useSafarLandingSettings() {
  return useQuery({
    queryKey: safarLandingQueryKey,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key,setting_value')
        .in('setting_key', safarLandingKeys)
        .abortSignal(signal);
      if (error) throw error;
      const saved = Object.fromEntries(data.filter(row => row.setting_value).map(row => [row.setting_key, row.setting_value]));
      return { ...safarLandingDefaults, ...saved };
    },
  });
}
