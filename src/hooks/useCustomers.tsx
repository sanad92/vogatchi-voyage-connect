
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import { useOrgId } from './useOrgId';
import { parseCurrencyTotals, type CustomerBookingMetricRow } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';

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

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: any) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, organization_id: orgId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "تم الحفظ بنجاح", description: "تم إضافة العميل بنجاح" });
    },
    onError: (error) => {
      console.error('Error adding customer:', error);
      toast({ title: "خطأ في الحفظ", description: "حدث خطأ أثناء إضافة العميل", variant: "destructive" });
    },
  });

  const addCustomer = (customer: any) => {
    addCustomerMutation.mutate(customer);
  };

  return {
    customers: data?.customers,
    totalCount: data?.totalCount || 0,
    isLoading,
    customersLoading: isLoading,
    error,
    customersError: error,
    refetch,
    addCustomer,
    isAddingCustomer: addCustomerMutation.isPending,
  };
};
