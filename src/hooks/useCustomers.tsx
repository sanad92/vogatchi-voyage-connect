
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Customer } from '@/types/customer';

export const useCustomers = () => {
  const queryClient = useQueryClient();

  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          segment:customer_segments(id, name, name_ar, color, description, minimum_bookings, minimum_total_spent, is_active, created_at, updated_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: any) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة العميل بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error adding customer:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء إضافة العميل",
        variant: "destructive",
      });
    },
  });

  const addCustomer = (customer: any) => {
    addCustomerMutation.mutate(customer);
  };

  return {
    customers,
    isLoading,
    customersLoading: isLoading, // إضافة alias للتوافق
    error,
    customersError: error, // إضافة alias للتوافق
    refetch,
    addCustomer,
    isAddingCustomer: addCustomerMutation.isPending,
  };
};
