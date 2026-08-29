
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import { useOrgId } from './useOrgId';
import { parseCurrencyTotals, type CustomerBookingMetricRow } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';

interface CustomerArchiveResult {
  id: string;
  archived_at: string | null;
  archived_by: string | null;
}

export const useCustomers = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: async () => {
      const [customerResult, metricsResult] = await Promise.all([
        supabase
          .from('customers')
          .select(`
          *,
          segment:customer_segments(id, name, name_ar, color, description, minimum_bookings, minimum_total_spent, is_active, created_at, updated_at)
        `, { count: 'exact' })
          .eq('organization_id', orgId!)
          .eq('is_demo', false)
          .order('created_at', { ascending: false })
          .limit(5000),
        callUntypedRpc<CustomerBookingMetricRow[]>('crm_customer_booking_metrics', { _org_id: orgId! }),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (metricsResult.error) throw metricsResult.error;

      const metricsByCustomer = new Map<string, CustomerBookingMetricRow>(
        ((metricsResult.data || []) as CustomerBookingMetricRow[]).map((row) => [row.customer_id, row]),
      );
      const customers = (customerResult.data || []).map((customer) => {
        const metric = metricsByCustomer.get(customer.id);
        const spendByCurrency = parseCurrencyTotals(metric?.spend_by_currency);
        return {
          ...customer,
          total_bookings: Number(metric?.total_bookings || 0),
          total_spent: Number(spendByCurrency.EGP || 0),
          last_booking_date: metric?.last_booking_date || undefined,
          spend_by_currency: spendByCurrency,
          booking_count_by_currency: parseCurrencyTotals(metric?.booking_count_by_currency),
        } as Customer;
      });

      return { customers, totalCount: customerResult.count || 0 };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const archiveCustomerMutation = useMutation({
    mutationFn: async ({ customerId, archived }: { customerId: string; archived: boolean }) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { data: result, error: archiveError } = await callUntypedRpc<CustomerArchiveResult>(
        'set_customer_archived',
        { _org_id: orgId, _customer_id: customerId, _archived: archived },
      );
      if (archiveError) throw new Error(archiveError.message);
      if (!result) throw new Error('لم يتم تحديث حالة العميل');
      return { result, archived };
    },
    onSuccess: ({ archived }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-customers'] });
      toast({
        title: archived ? 'تمت أرشفة العميل' : 'تمت استعادة العميل',
        description: archived
          ? 'يمكن استعادته لاحقًا من تبويب المؤرشفين.'
          : 'عاد العميل إلى قائمة العملاء النشطين.',
      });
    },
    onError: (error) => {
      toast({
        title: 'تعذر تحديث حالة العميل',
        description: error instanceof Error ? error.message : 'حاول مرة أخرى.',
        variant: 'destructive',
      });
    },
  });

  return {
    customers: data?.customers,
    totalCount: data?.totalCount || 0,
    isLoading,
    customersLoading: isLoading,
    error,
    customersError: error,
    refetch,
    setCustomerArchived: archiveCustomerMutation.mutateAsync,
    isArchivingCustomer: archiveCustomerMutation.isPending,
  };
};
