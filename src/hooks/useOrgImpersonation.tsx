import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'platform_impersonating_org';

interface ImpersonationData {
  org_id: string;
  org_name: string;
  started_at: string;
}

const readStorage = (): ImpersonationData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationData) : null;
  } catch {
    return null;
  }
};

export const useOrgImpersonation = () => {
  const [data, setData] = useState<ImpersonationData | null>(() => readStorage());

  // Sync across tabs and listen for our own custom event
  useEffect(() => {
    const sync = () => setData(readStorage());
    window.addEventListener('storage', sync);
    window.addEventListener('platform-impersonation-changed', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('platform-impersonation-changed', sync as EventListener);
    };
  }, []);

  const start = useCallback(async (orgId: string, orgName: string) => {
    const payload: ImpersonationData = {
      org_id: orgId,
      org_name: orgName,
      started_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setData(payload);
    window.dispatchEvent(new Event('platform-impersonation-changed'));

    // Best-effort audit log (non-blocking)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_log').insert({
          user_id: user.id,
          organization_id: orgId,
          action: 'platform_impersonation_start',
          target_table: 'organizations',
          target_id: orgId,
          details: { org_name: orgName },
        } as any);
      }
    } catch (e) {
      console.warn('audit log start failed', e);
    }

    toast.success(`دخلت كمؤسسة: ${orgName}`);
    window.location.href = '/dashboard';
  }, []);

  const stop = useCallback(async () => {
    const current = readStorage();
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    window.dispatchEvent(new Event('platform-impersonation-changed'));

    if (current) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('admin_audit_log').insert({
            user_id: user.id,
            organization_id: current.org_id,
            action: 'platform_impersonation_end',
            target_table: 'organizations',
            target_id: current.org_id,
            details: { org_name: current.org_name },
          } as any);
        }
      } catch (e) {
        console.warn('audit log end failed', e);
      }
    }

    toast.info('عدت إلى لوحة المنصة');
    window.location.href = '/platform';
  }, []);

  return {
    isImpersonating: !!data,
    impersonatingOrgId: data?.org_id ?? null,
    impersonatingOrgName: data?.org_name ?? null,
    impersonatingSince: data?.started_at ?? null,
    start,
    stop,
  };
};

export const getImpersonatingOrgId = (): string | null => {
  return readStorage()?.org_id ?? null;
};
