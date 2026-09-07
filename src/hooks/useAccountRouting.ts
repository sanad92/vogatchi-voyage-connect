import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useOrgId } from '@/hooks/useOrgId';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export type AccountRoutingGroup = 'control' | 'treasury' | 'revenue' | 'cost' | 'expense' | 'equity';
export type RoutedAccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountRoute {
  routing_key: string;
  label_ar: string;
  label_en: string;
  group_key: AccountRoutingGroup;
  expected_account_type: RoutedAccountType;
  fallback_account_code: string;
  account_id: string | null;
  account_code: string | null;
  account_name: string | null;
  account_name_ar: string | null;
  configured: boolean;
}

const routingKey = (orgId: string | undefined) => ['account-routing', orgId] as const;

export const useAccountRouting = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('financial_edit');

  const query = useQuery({
    queryKey: routingKey(orgId),
    queryFn: async () => {
      if (!orgId) return [] as AccountRoute[];
      const { data, error } = await callUntypedRpc<unknown>('list_org_account_routing', { _org_id: orgId });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as AccountRoute[];
    },
    enabled: Boolean(orgId && hasPermission('financial_view')),
    staleTime: 30_000,
  });

  const setRoute = useMutation({
    mutationFn: async (input: { routingKey: string; accountId: string; notes?: string }) => {
      if (!orgId) throw new Error('لم يتم تحديد الشركة');
      if (!canEdit) throw new Error('لا تملك صلاحية تعديل توجيه الحسابات');
      const { data, error } = await callUntypedRpc<string>('set_org_account_route', {
        _org_id: orgId,
        _routing_key: input.routingKey,
        _account_id: input.accountId,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routingKey(orgId) });
      qc.invalidateQueries({ queryKey: ['chart-of-accounts', orgId] });
      toast({ title: 'تم حفظ توجيه الحساب' });
    },
    onError: (error: Error) => toast({ title: 'تعذر حفظ التوجيه', description: error.message, variant: 'destructive' }),
  });

  const resetRoute = useMutation({
    mutationFn: async (routingKeyValue: string) => {
      if (!orgId) throw new Error('لم يتم تحديد الشركة');
      if (!canEdit) throw new Error('لا تملك صلاحية تعديل توجيه الحسابات');
      const { error } = await callUntypedRpc('reset_org_account_route', {
        _org_id: orgId,
        _routing_key: routingKeyValue,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routingKey(orgId) });
      toast({ title: 'تمت إعادة الحساب للبديل الافتراضي' });
    },
    onError: (error: Error) => toast({ title: 'تعذر إعادة التوجيه', description: error.message, variant: 'destructive' }),
  });

  return {
    routes: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    canEdit,
    setRoute,
    resetRoute,
  };
};
