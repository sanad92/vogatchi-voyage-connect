import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { supabase } from '@/integrations/supabase/client';
import { getBrowserSessionActivityKey } from '@/lib/browserSessionActivity';

const signedUrlLifetimeSeconds = 10 * 60;

export const useSignedMediaUrl = (path?: string | null) => {
  const organizationId = useOrgId();
  const { user, session } = useOptimizedAuth();
  const sessionKey = session?.access_token ? getBrowserSessionActivityKey(session.access_token) : null;
  const canRequest = Boolean(user?.id && session && organizationId && path?.startsWith(`${organizationId}/`));

  return useQuery({
    queryKey: ['wa-media-signed', organizationId, user?.id, sessionKey, path],
    enabled: canRequest,
    queryFn: async () => {
      if (!canRequest || !path) return null;
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(path, signedUrlLifetimeSeconds);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: (signedUrlLifetimeSeconds - 60) * 1000,
    gcTime: 0,
  });
};
