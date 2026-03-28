import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name: string | null;
  company_name_ar: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  footer_text: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export function useOrganizationSettings() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['organization-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as OrganizationSettings | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: Partial<OrganizationSettings>) => {
      if (!orgId) throw new Error('No organization selected');

      const payload = { ...values, organization_id: orgId };

      // Check if settings exist
      const { data: existing } = await supabase
        .from('organization_settings')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_settings')
          .update(payload)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings', orgId] });
      toast.success('تم حفظ إعدادات المؤسسة بنجاح');
    },
    onError: (error: any) => {
      toast.error('فشل حفظ الإعدادات: ' + error.message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    saveSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
