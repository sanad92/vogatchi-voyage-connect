import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TransportBooking, VehicleType, TransportRoute } from '@/types/transport';
import { useOrgId } from './useOrgId';

export const useTransportBookings = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: transportData, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['transport-bookings', orgId],
    queryFn: async () => {
      const { data, error, count } = await supabase.from('transport_bookings')
        .select(`*, customer:customers(id, name, phone, email), route:transport_routes(route_name, route_name_ar), vehicle_type:vehicle_types(name, name_ar), status:booking_statuses(id, name, name_ar, color)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return { bookings: data as TransportBooking[], totalCount: count || 0 };
    },
    enabled: !!orgId,
  });

  const transportBookings = transportData?.bookings;
  const totalTransportCount = transportData?.totalCount || 0;

  const { data: vehicleTypes, isLoading: vehicleTypesLoading } = useQuery({
    queryKey: ['vehicle-types', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_types').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as VehicleType[];
    },
    enabled: !!orgId,
  });

  const { data: transportRoutes, isLoading: routesLoading } = useQuery({
    queryKey: ['transport-routes', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('transport_routes').select('*').eq('is_active', true).order('route_name');
      if (error) throw error;
      return data as TransportRoute[];
    },
    enabled: !!orgId,
  });

  const addTransportBookingMutation = useMutation({
    mutationFn: async (booking: Omit<TransportBooking, 'id' | 'created_at' | 'updated_at' | 'booking_reference'>) => {
      const { data, error } = await supabase.from('transport_bookings')
        .insert({ ...booking, currency: booking.currency || 'EGP', organization_id: orgId })
        .select().single();
      if (error) throw error;

      // Trigger confirmation notification
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: { bookingId: data.id, bookingType: 'transport' }
        });
      } catch (e) {
        console.warn('Confirmation send failed (non-blocking):', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bookings'] });
      toast({ title: "تم الحفظ بنجاح", description: "تم إضافة حجز النقل بنجاح" });
    },
    onError: (error) => {
      console.error('Error adding transport booking:', error);
      toast({ title: "خطأ في الحفظ", description: "حدث خطأ أثناء إضافة حجز النقل", variant: "destructive" });
    },
  });

  const updateTransportBookingMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TransportBooking>) => {
      const { data, error } = await supabase.from('transport_bookings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bookings'] });
      toast({ title: "تم التحديث", description: "تم تحديث حجز النقل بنجاح" });
    },
    onError: (error) => {
      console.error('Error updating transport booking:', error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث الحجز", variant: "destructive" });
    },
  });

  const deleteTransportBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transport_bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bookings'] });
      toast({ title: "تم الحذف", description: "تم حذف حجز النقل بنجاح" });
    },
    onError: (error) => {
      console.error('Error deleting transport booking:', error);
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف الحجز", variant: "destructive" });
    },
  });

  const markVoucherSent = async (id: string) => {
    updateTransportBookingMutation.mutate({ id, voucher_sent: true, voucher_sent_date: new Date().toISOString() } as any);
  };

  const markInvoiceSent = async (id: string) => {
    updateTransportBookingMutation.mutate({ id, invoice_sent: true, invoice_sent_date: new Date().toISOString() } as any);
  };

  const markSupplierPaid = async (id: string) => {
    updateTransportBookingMutation.mutate({ id, supplier_payment_sent: true, supplier_payment_sent_date: new Date().toISOString() } as any);
  };

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
    updateTransportBooking: updateTransportBookingMutation.mutate,
    deleteTransportBooking: deleteTransportBookingMutation.mutate,
    markVoucherSent,
    markInvoiceSent,
    markSupplierPaid,
    isAddingBooking: addTransportBookingMutation.isPending,
    isUpdating: updateTransportBookingMutation.isPending,
    isDeleting: deleteTransportBookingMutation.isPending,
    refetch,
  };
};
