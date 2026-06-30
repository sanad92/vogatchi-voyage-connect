
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { CarRental } from '@/types/transport';
import { useOrgId } from './useOrgId';

export const useCarRentals = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data, isLoading: rentalsLoading } = useQuery({
    queryKey: ['car-rentals-unified', orgId],
    queryFn: async () => {
      if (!orgId) return { rentals: [] as CarRental[], totalCount: 0 };

      const [{ data, error, count }, customersRes, statusesRes] = await Promise.all([
        (supabase as any)
          .from('car_rentals_unified')
          .select('*', { count: 'exact' })
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase.from('customers').select('id, name').eq('organization_id', orgId),
        supabase.from('booking_statuses').select('*'),
      ]);
      if (error) throw error;

      const customersList = (customersRes.data || []) as any[];
      const statusesList = (statusesRes.data || []) as any[];

      const rentals = (data || []).map((r: any) => ({
        ...r,
        customer: r.customer_id ? customersList.find(c => c.id === r.customer_id) || null : null,
        vehicle_type: r.vehicle_type_name ? { name: r.vehicle_type_name, name_ar: r.vehicle_type_name } : null,
        status: statusesList.find(s => s.id === r.status_id) || null,
      })) as unknown as CarRental[];

      return { rentals, totalCount: count || 0 };
    },
    enabled: !!orgId,
  });


  const addCarRentalMutation = useMutation({
    mutationFn: async (rental: Omit<CarRental, 'id' | 'created_at' | 'updated_at' | 'rental_reference'>) => {
      const { data, error } = await supabase
        .from('car_rentals')
        .insert({ ...rental, currency: rental.currency || 'EGP', organization_id: orgId })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['car-rentals'] }); toast({ title: "تم الحفظ بنجاح", description: "تم إضافة عقد إيجار السيارة بنجاح" }); },
    onError: (error) => { console.error('Error adding car rental:', error); toast({ title: "خطأ في الحفظ", description: "حدث خطأ أثناء إضافة عقد إيجار السيارة", variant: "destructive" }); },
  });

  const addCarRental = (rental: Omit<CarRental, 'id' | 'created_at' | 'updated_at' | 'rental_reference'>) => {
    addCarRentalMutation.mutate(rental);
  };

  return { carRentals: data?.rentals, totalCarRentalCount: data?.totalCount || 0, rentalsLoading, addCarRental, isAddingRental: addCarRentalMutation.isPending };
};
