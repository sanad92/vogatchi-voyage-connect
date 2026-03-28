
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';
import { useOrgId } from './useOrgId';

export const useCustomers = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: async () => {
      // Fetch with count to detect if we're hitting limits
      const { data, error, count } = await supabase
        .from('customers')
        .select(`
          *,
          segment:customer_segments(id, name, name_ar, color, description, minimum_bookings, minimum_total_spent, is_active, created_at, updated_at)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      return { customers: data as Customer[], totalCount: count || 0 };
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
