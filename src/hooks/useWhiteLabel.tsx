import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface WhiteLabel {
  organization_id: string;
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  custom_domain: string | null;
  email_from_name: string | null;
  support_email: string | null;
}

export const useWhiteLabel = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['white-label', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await (supabase as any)
        .from('white_label_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as WhiteLabel | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Apply theme at runtime
  useEffect(() => {
    const wl = query.data;
    if (!wl) return;
    const root = document.documentElement;
    if (wl.primary_color) root.style.setProperty('--brand-primary', wl.primary_color);
    if (wl.accent_color) root.style.setProperty('--brand-accent', wl.accent_color);
    if (wl.brand_name) document.title = wl.brand_name;
    if (wl.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = wl.favicon_url;
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<WhiteLabel>) => {
      if (!orgId) throw new Error('no org');
      const { error } = await (supabase as any)
        .from('white_label_settings')
        .upsert({ organization_id: orgId, ...patch }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['white-label'] });
      toast.success('تم حفظ الهوية البصرية');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, save };
};
