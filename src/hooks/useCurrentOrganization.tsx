import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface CurrentOrgInfo {
  id: string;
  name: string;
  name_en?: string | null;
  name_ar?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  tax_number?: string | null;
  commercial_registration?: string | null;
  website?: string | null;
  footer_text?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  currency?: string | null;
}

/**
 * Returns the current active organization profile (name, logo, contact info)
 * for use in invoices, vouchers, and other branded documents.
 */
export const useCurrentOrganization = () => {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ['current-organization', orgId],
    queryFn: async (): Promise<CurrentOrgInfo | null> => {
      if (!orgId) return null;
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, email, phone, address, logo_url, tax_number, commercial_registration')
        .eq('id', orgId)
        .maybeSingle();
      if (orgError) {
        console.error('useCurrentOrganization org error:', orgError);
        return null;
      }

      const { data: settings, error: settingsError } = await supabase
        .from('organization_settings')
        .select('company_name, company_name_ar, phone, email, website, address, logo_url, tax_number, commercial_register, footer_text, primary_color, secondary_color, accent_color, currency')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (settingsError) {
        console.error('useCurrentOrganization settings error:', settingsError);
      }

      if (!org) return null;

      return {
        id: org.id,
        name: settings?.company_name_ar || settings?.company_name || org.name,
        name_en: settings?.company_name || org.name,
        name_ar: settings?.company_name_ar,
        email: settings?.email || org.email,
        phone: settings?.phone || org.phone,
        address: settings?.address || org.address,
        logo_url: settings?.logo_url || org.logo_url,
        tax_number: settings?.tax_number || org.tax_number,
        commercial_registration: settings?.commercial_register || org.commercial_registration,
        website: settings?.website,
        footer_text: settings?.footer_text,
        primary_color: settings?.primary_color,
        secondary_color: settings?.secondary_color,
        accent_color: settings?.accent_color,
        currency: settings?.currency,
      } as CurrentOrgInfo;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
};
