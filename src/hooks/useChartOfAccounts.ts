import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { toast } from '@/hooks/use-toast';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

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
  const { hasPermission } = usePermissionCheck();

  const { data: accounts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['chart-of-accounts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .order('account_code');
      if (error) throw error;
      return (data || []) as ChartOfAccount[];
    },
    enabled: !!orgId && hasPermission('financial_view'),
  });

  const createAccount = useMutation({
    mutationFn: async (payload: Partial<ChartOfAccount>) => {
      if (!orgId) throw new Error('No organization');
      if (!hasPermission('financial_edit')) throw new Error('لا تملك صلاحية تعديل الحسابات');
      const code = payload.account_code?.trim();
      const name = payload.account_name?.trim();
      if (!code || !name) throw new Error('أدخل كود الحساب واسمه');
      if (accounts.some(account => account.account_code === code)) throw new Error('كود الحساب مستخدم بالفعل');
      if (payload.parent_id && !accounts.some(account => account.id === payload.parent_id && account.organization_id === orgId && account.account_type === payload.account_type && account.is_active)) {
        throw new Error('اختر حسابًا رئيسيًا نشطًا من نفس الشركة ونفس النوع');
      }
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          organization_id: orgId,
          account_code: code,
          account_name: name,
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
    onError: (e: Error) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  return { accounts, isLoading, error, refetch, createAccount };
};
