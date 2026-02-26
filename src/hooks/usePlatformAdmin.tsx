import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const usePlatformAdmin = () => {
  const { user, loading: authLoading } = useOptimizedAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsPlatformAdmin(false);
      setPlatformRole(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsPlatformAdmin(!!data);
      setPlatformRole(data?.role ?? null);
      setLoading(false);
    };

    check();
  }, [user?.id, authLoading]);

  return {
    isPlatformAdmin,
    platformRole,
    isPlatformOwner: platformRole === 'platform_owner',
    loading: loading || authLoading,
  };
};
