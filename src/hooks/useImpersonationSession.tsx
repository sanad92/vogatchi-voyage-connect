import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ActiveImpersonation {
  session_id: string;
  target_org_id: string;
  target_user_id: string | null;
  reason: string;
  started_at: string;
}

export const useImpersonationSession = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['active-impersonation'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_active_impersonation');
      if (error) throw error;
      return (data?.[0] ?? null) as ActiveImpersonation | null;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const start = useMutation({
    mutationFn: async (input: {
      target_org_id: string;
      target_user_id?: string | null;
      org_pin: string;
      reason: string;
      mfa_verified: boolean;
    }) => {
      const { data, error } = await (supabase.rpc as any)('start_impersonation', {
        _target_org_id: input.target_org_id,
        _target_user_id: input.target_user_id ?? null,
        _org_pin: input.org_pin,
        _reason: input.reason,
        _mfa_verified: input.mfa_verified,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      toast.success('تم بدء جلسة الانتحال');
      qc.invalidateQueries({ queryKey: ['active-impersonation'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'فشل بدء الجلسة'),
  });

  const stop = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('stop_impersonation');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إنهاء جلسة الانتحال');
      qc.invalidateQueries({ queryKey: ['active-impersonation'] });
    },
  });

  return { active: query.data, loading: query.isLoading, start, stop };
};
