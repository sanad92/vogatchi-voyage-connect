import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface CurrentOrgInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  tax_number?: string | null;
  commercial_registration?: string | null;
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
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, email, phone, address, logo_url, tax_number, commercial_registration')
        .eq('id', orgId)
        .maybeSingle();
      if (error) {
        console.error('useCurrentOrganization error:', error);
        return null;
      }
      return data as CurrentOrgInfo | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
};
