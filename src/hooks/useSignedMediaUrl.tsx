import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a short-lived signed URL for a file in the whatsapp-media bucket.
 * Signed for 1 hour and cached by path.
 */
export const useSignedMediaUrl = (path?: string | null) => {
  return useQuery({
    queryKey: ['wa-media-signed', path],
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
};
