import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface WhatsAppInbox {
  id: string;
  label: string | null;
  business_name: string | null;
  phone_number_id: string | null;
  display_phone_number: string | null;
  waba_id: string | null;
  webhook_url: string | null;
  is_active: boolean | null;
  is_default: boolean;
  api_version: string | null;
  rate_limit_per_minute: number | null;
  auto_assignment_enabled: boolean | null;
  business_description: string | null;
  business_website: string | null;
  business_email: string | null;
  onboarding_status: string | null;
  connected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ACTIVE_KEY = 'vgt.whatsapp.activeInboxId';

interface UpdatableFields {
  business_name?: string;
  label?: string;
  webhook_url?: string;
  is_active?: boolean;
  api_version?: string;
  rate_limit_per_minute?: number;
  auto_assignment_enabled?: boolean;
  business_description?: string;
  business_website?: string;
  business_email?: string;
}

export const useWhatsAppSettings = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const { data: inboxes = [], isLoading, error } = useQuery({
    queryKey: ['whatsapp-settings', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select(
          'id, label, business_name, phone_number_id, display_phone_number, waba_id, webhook_url, is_active, is_default, api_version, rate_limit_per_minute, auto_assignment_enabled, business_description, business_website, business_email, onboarding_status, connected_at, created_at, updated_at',
        )
        .eq('organization_id', orgId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as WhatsAppInbox[];
    },
    staleTime: 60_000,
  });

  const [activeInboxId, setActiveInboxIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACTIVE_KEY);
  });

  const activeSettings = useMemo(() => {
    if (!inboxes.length) return null;
    return (
      inboxes.find((s) => s.id === activeInboxId) ??
      inboxes.find((s) => s.is_default) ??
      inboxes[0]
    );
  }, [inboxes, activeInboxId]);

  // Keep localStorage aligned when the active row is resolved from a fallback.
  useEffect(() => {
    if (activeSettings?.id && activeSettings.id !== activeInboxId) {
      setActiveInboxIdState(activeSettings.id);
      try { window.localStorage.setItem(ACTIVE_KEY, activeSettings.id); } catch { /* ignore */ }
    }
  }, [activeSettings?.id, activeInboxId]);

  const setActiveInboxId = (id: string | null) => {
    setActiveInboxIdState(id);
    try {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch { /* ignore */ }
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch: Record<string, any> & { id?: string }) => {
      const targetId = patch.id ?? activeSettings?.id;
      if (!targetId) throw new Error('لا يوجد رقم واتساب لتحديثه');
      const { id: _id, ...rest } = patch;
      // Never wipe secrets by sending blanks from a UI form.
      if (rest.access_token === '' || rest.access_token == null) delete rest.access_token;
      if (rest.webhook_verify_token === '' || rest.webhook_verify_token == null) delete rest.webhook_verify_token;
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', orgId] });
      toast.success('تم حفظ الإعدادات');
    },
    onError: (e: any) => {
      toast.error(e?.message || 'فشل حفظ الإعدادات');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (params: { phone_number_id: string; access_token: string }) => {
      try {
        const res = await fetch(`https://graph.facebook.com/v22.0/${params.phone_number_id}`, {
          headers: { Authorization: `Bearer ${params.access_token}` },
        });
        if (res.ok) return { success: true, data: await res.json() } as const;
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err?.error?.message || 'فشل الاتصال' } as const;
      } catch (e: any) {
        return { success: false, error: e?.message || 'خطأ في الشبكة' } as const;
      }
    },
    onSuccess: (result) => {
      if (result.success) toast.success('تم اختبار الاتصال بنجاح');
      else toast.error(`فشل الاتصال: ${result.error}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_settings')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', orgId] });
      toast.success('تم تعيين الرقم كافتراضي');
    },
    onError: (e: any) => toast.error(e?.message || 'فشل تعيين الافتراضي'),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase
        .from('whatsapp_settings')
        .update({ label, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', orgId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل تعديل التسمية'),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-disconnect', {
        body: { organization_id: orgId, whatsapp_settings_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', orgId] });
      toast.success('تم فصل الرقم');
    },
    onError: (e: any) => toast.error(e?.message || 'فشل فصل الرقم'),
  });

  return {
    // multi-inbox surface
    inboxes,
    activeSettings,
    activeInboxId: activeSettings?.id ?? null,
    setActiveInboxId,
    setDefault: setDefaultMutation.mutate,
    isSettingDefault: setDefaultMutation.isPending,
    renameInbox: renameMutation.mutate,
    disconnectInbox: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,

    // legacy compatibility (single settings row -> active inbox)
    settings: activeSettings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,
  };
};
