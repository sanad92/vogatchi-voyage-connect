import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { toast } from '@/hooks/use-toast';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartOfAccount {
  id: string;
  organization_id: string;
  account_code: string;
  account_name: string;
  account_name_ar: string | null;
  account_type: AccountType;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export const useChartOfAccounts = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      // Auto-seed defaults on first read
      await supabase.rpc('seed_default_chart_of_accounts', { _org_id: orgId });
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .order('account_code');
      if (error) throw error;
      return (data || []) as ChartOfAccount[];
    },
    enabled: !!orgId,
  });

  const createAccount = useMutation({
    mutationFn: async (payload: Partial<ChartOfAccount>) => {
      if (!orgId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          organization_id: orgId,
          account_code: payload.account_code!,
          account_name: payload.account_name!,
          account_name_ar: payload.account_name_ar,
          account_type: payload.account_type!,
          parent_id: payload.parent_id,
          description: payload.description,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts', orgId] });
      toast({ title: 'تمت إضافة الحساب' });
    },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return { accounts, isLoading, createAccount };
};
