import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { toast } from 'sonner';
import { DEFAULT_BUSINESS_HOURS, BusinessHours } from '@/lib/businessHours';

export interface SLASettings {
  id?: string;
  organization_id: string;
  timezone: string;
  business_hours: BusinessHours;
  sla_first_response_minutes: number;
  sla_resolution_minutes: number;
  out_of_hours_message: string | null;
  auto_reply_enabled: boolean;
}

export const useWhatsAppSLASettings = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['wa-sla-settings', orgId],
    queryFn: async (): Promise<SLASettings | null> => {
      if (!orgId) return null;
      const { data, error } = await (supabase
        .from('whatsapp_sla_settings' as any)
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle() as any);
      if (error) throw error;
      return data as SLASettings | null;
    },
    enabled: !!orgId,
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<SLASettings>) => {
      if (!orgId) throw new Error('لا توجد مؤسسة');
      const base = {
        organization_id: orgId,
        timezone: 'Asia/Riyadh',
        business_hours: DEFAULT_BUSINESS_HOURS,
        sla_first_response_minutes: 15,
        sla_resolution_minutes: 1440,
        auto_reply_enabled: false,
        out_of_hours_message: null,
        ...query.data,
        ...payload,
      };
      const { data, error } = await (supabase
        .from('whatsapp_sla_settings' as any)
        .upsert(base, { onConflict: 'organization_id' })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-sla-settings'] });
      toast.success('تم حفظ الإعدادات');
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ'),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    save: save.mutate,
    isSaving: save.isPending,
  };
};
