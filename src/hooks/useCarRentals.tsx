
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { CarRental } from '@/types/transport';
import { useOrgId } from './useOrgId';

export const useCarRentals = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data, isLoading: rentalsLoading } = useQuery({
    queryKey: ['car-rentals', orgId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('car_rentals')
        .select(`*, customer:customers(name), vehicle_type:vehicle_types(name, name_ar), status:booking_statuses(name, name_ar, color)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return { rentals: data as CarRental[], totalCount: count || 0 };
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
