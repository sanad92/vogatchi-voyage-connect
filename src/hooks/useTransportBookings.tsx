
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TransportBooking, VehicleType, TransportRoute } from '@/types/transport';

export const useTransportBookings = () => {
  const queryClient = useQueryClient();

  // جلب حجوزات النقل
  const { data: transportBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['transport-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_bookings')
        .select(`
          *,
          customer:customers(name),
          route:transport_routes(route_name, route_name_ar),
          vehicle_type:vehicle_types(name, name_ar),
          status:booking_statuses(name, name_ar, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TransportBooking[];
    },
  });

  // جلب أنواع المركبات
  const { data: vehicleTypes, isLoading: vehicleTypesLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as VehicleType[];
    },
  });

  // جلب الطرق
  const { data: transportRoutes, isLoading: routesLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_routes')
        .select('*')
        .eq('is_active', true)
        .order('route_name');

      if (error) throw error;
      return data as TransportRoute[];
    },
  });

  // إضافة حجز نقل جديد
  const addTransportBookingMutation = useMutation({
    mutationFn: async (booking: Omit<TransportBooking, 'id' | 'created_at' | 'updated_at' | 'booking_reference'>) => {
      const { data, error } = await supabase
        .from('transport_bookings')
        .insert(booking)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bookings'] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة حجز النقل بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error adding transport booking:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء إضافة حجز النقل",
        variant: "destructive",
      });
    },
  });

  const addTransportBooking = (booking: Omit<TransportBooking, 'id' | 'created_at' | 'updated_at' | 'booking_reference'>) => {
    addTransportBookingMutation.mutate(booking);
  };

  return {
    transportBookings,
    bookingsLoading,
    vehicleTypes,
    vehicleTypesLoading,
    transportRoutes,
    routesLoading,
    addTransportBooking,
    isAddingBooking: addTransportBookingMutation.isPending,
  };
};
