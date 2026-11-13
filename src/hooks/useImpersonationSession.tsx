import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export interface ActiveImpersonation {
  session_id: string;
  target_org_id: string;
  target_user_id: string | null;
  reason: string;
  started_at: string;
}

export const useImpersonationSession = () => {
  const qc = useQueryClient();
  const { user, session } = useOptimizedAuth();

  const query = useQuery({
    queryKey: ['active-impersonation', user?.id, session?.access_token ? session.expires_at : null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_impersonation');
      if (error) throw error;
      return (data?.[0] ?? null) as ActiveImpersonation | null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const start = useMutation({
    mutationFn: async (input: {
      target_org_id: string;
      org_pin: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc('start_impersonation', {
        _target_org_id: input.target_org_id,
        _org_pin: input.org_pin,
        _reason: input.reason,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success('تم بدء جلسة الدعم');
      qc.invalidateQueries({ queryKey: ['active-impersonation'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'فشل بدء الجلسة'),
  });

  const stop = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('stop_impersonation');
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('تم إنهاء جلسة الدعم');
      await qc.cancelQueries({ queryKey: ['active-impersonation'] });
      qc.setQueriesData({ queryKey: ['active-impersonation'] }, null);
      qc.invalidateQueries({ queryKey: ['active-impersonation'] });
    },
    onError: () => toast.error('تعذّر إنهاء الجلسة. حاول مرة أخرى.'),
  });

  const expiresAt = query.data ? Date.parse(query.data.started_at) + 30 * 60 * 1000 : 0;
  useEffect(() => {
    if (!expiresAt) return;
    const timeout = window.setTimeout(() => {
      qc.setQueriesData({ queryKey: ['active-impersonation'] }, null);
      qc.invalidateQueries({ queryKey: ['active-impersonation'] });
    }, Math.max(expiresAt - Date.now(), 0));
    return () => window.clearTimeout(timeout);
  }, [expiresAt, qc]);

  return { active: expiresAt > Date.now() && !query.isError ? query.data : null, loading: query.isLoading, start, stop };
};
