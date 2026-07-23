import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface SecuritySettings {
  organization_id: string;
  mfa_required: boolean;
  session_timeout_min: number;
  ip_allowlist: string[];
  password_policy: { min_length: number; require_upper: boolean; require_number: boolean; require_symbol: boolean };
  org_pin_set_at: string | null;
}

export const useSecuritySettings = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['security-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await (supabase as any)
        .from('security_settings')
        .select('organization_id,mfa_required,session_timeout_min,ip_allowlist,password_policy,org_pin_set_at')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SecuritySettings | null;
    },
    enabled: !!orgId,
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<SecuritySettings>) => {
      if (!orgId) throw new Error('no org');
      const { error } = await (supabase as any)
        .from('security_settings')
        .upsert({ organization_id: orgId, ...patch }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['security-settings'] }); toast.success('تم حفظ إعدادات الأمان'); },
    onError: (e: any) => toast.error(e.message),
  });

  const setPin = useMutation({
    mutationFn: async (pin: string) => {
      if (!orgId) throw new Error('no org');
      const { error } = await (supabase.rpc as any)('set_org_pin', { _org_id: orgId, _pin: pin });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['security-settings'] }); toast.success('تم تعيين رمز PIN'); },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, save, setPin };
};
