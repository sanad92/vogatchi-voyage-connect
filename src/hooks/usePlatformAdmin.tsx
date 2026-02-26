import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const usePlatformAdmin = () => {
  const { user, loading: authLoading } = useOptimizedAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', user.id)
        .maybeSingle();

      setIsPlatformAdmin(data?.is_platform_admin === true);
      setLoading(false);
    };

    check();
  }, [user?.id, authLoading]);

  return { isPlatformAdmin, loading: loading || authLoading };
};
