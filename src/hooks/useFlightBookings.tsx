
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { FlightBooking, NewFlightBooking, Airport, Airline, FlightClass } from '@/types/flightBooking';
import { useOrgId } from './useOrgId';

export const useFlightBookings = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: flightData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['flight-bookings-unified', orgId],
    queryFn: async (): Promise<{ bookings: FlightBooking[]; totalCount: number }> => {
      if (!orgId) return { bookings: [], totalCount: 0 };

      const [{ data, error, count }, airportsRes, airlinesRes, classesRes, statusesRes] = await Promise.all([
        (supabase as any)
          .from('flight_bookings_unified')
          .select('*', { count: 'exact' })
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase.from('airports').select('*'),
        supabase.from('airlines').select('*'),
        supabase.from('flight_classes').select('*'),
        supabase.from('booking_statuses').select('*'),
      ]);
      if (error) throw error;

      const airportsList = (airportsRes.data || []) as any[];
      const airlinesList = (airlinesRes.data || []) as any[];
      const classesList = (classesRes.data || []) as any[];
      const statusesList = (statusesRes.data || []) as any[];

      const findAirport = (code?: string | null) =>
        code ? airportsList.find(a => a.iata_code === code || a.icao_code === code || a.name === code) : null;
      const findAirline = (name?: string | null) =>
        name ? airlinesList.find(a => a.name === name || a.name_ar === name || a.iata_code === name) : null;
      const findClass = (name?: string | null) =>
        name ? classesList.find(c => c.name === name || c.name_ar === name) : null;

      const bookings = (data || []).map((booking: any) => ({
        ...booking,
        departure_airport: findAirport(booking.departure_airport_code),
        arrival_airport: findAirport(booking.arrival_airport_code),
        airline: findAirline(booking.airline_name),
        flight_class: findClass(booking.flight_class_name),
        booking_status: statusesList.find(s => s.id === booking.status_id) || null,
        passenger_details: [],
        baggage_info: undefined,
        ticket_numbers: booking.ticket_number ? [booking.ticket_number] : [],
      })) as unknown as FlightBooking[];
      return { bookings, totalCount: count || 0 };
    },
    enabled: !!orgId,
  });


  const { data: airports = [] } = useQuery({
    queryKey: ['airports', orgId],
    queryFn: async (): Promise<Airport[]> => {
      const { data, error } = await supabase.from('airports').select('*').eq('is_active', true).order('name').range(0, 19999);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines', orgId],
    queryFn: async (): Promise<Airline[]> => {
      const { data, error } = await supabase.from('airlines').select('*').eq('is_active', true).order('name').range(0, 9999);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: flightClasses = [] } = useQuery({
    queryKey: ['flight-classes', orgId],
    queryFn: async (): Promise<FlightClass[]> => {
      const { data, error } = await supabase.from('flight_classes').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { mutateAsync: addFlightBooking, isPending: isAddingBooking } = useMutation({
    mutationFn: async (booking: NewFlightBooking) => {
      const dbBooking = {
        ...booking,
        organization_id: orgId,
        passenger_details: booking.passenger_details ? JSON.stringify(booking.passenger_details) : null,
        baggage_info: booking.baggage_info ? JSON.stringify(booking.baggage_info) : null,
        ticket_numbers: booking.ticket_numbers || []
      };
      const { data, error } = await supabase.from('flight_bookings').insert([dbBooking]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flight-bookings'] }); toast({ title: "تم إنشاء حجز الطيران", description: "تم إضافة حجز الطيران بنجاح" }); },
    onError: (error) => { console.error('Error adding flight booking:', error); toast({ title: "خطأ", description: "فشل في إضافة حجز الطيران", variant: "destructive" }); }
  });

  const { mutateAsync: updateFlightBooking, isPending: isUpdatingBooking } = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FlightBooking> & { id: string }) => {
      const dbUpdates = { ...updates, passenger_details: updates.passenger_details ? JSON.stringify(updates.passenger_details) : undefined, baggage_info: updates.baggage_info ? JSON.stringify(updates.baggage_info) : undefined };
      delete (dbUpdates as any).departure_airport; delete (dbUpdates as any).arrival_airport; delete (dbUpdates as any).airline; delete (dbUpdates as any).flight_class; delete (dbUpdates as any).booking_status;
      const { data, error } = await supabase.from('flight_bookings').update(dbUpdates).eq('id', id).eq('organization_id', orgId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flight-bookings'] }); toast({ title: "تم تحديث حجز الطيران" }); },
    onError: (error) => { console.error('Error updating flight booking:', error); toast({ title: "خطأ", description: "فشل في تحديث حجز الطيران", variant: "destructive" }); }
  });

  const { mutateAsync: deleteFlightBooking, isPending: isDeletingBooking } = useMutation({
    mutationFn: async (id: string) => { if (!orgId) throw new Error('لا توجد منظمة نشطة'); const { error } = await supabase.from('flight_bookings').delete().eq('id', id).eq('organization_id', orgId); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['flight-bookings'] }); toast({ title: "تم حذف حجز الطيران" }); },
    onError: (error) => { console.error('Error deleting flight booking:', error); toast({ title: "خطأ", description: "فشل في حذف حجز الطيران", variant: "destructive" }); }
  });

  return {
    flightBookings: flightData?.bookings || [],
    totalFlightCount: flightData?.totalCount || 0,
    bookingsLoading,
    airports,
    airlines,
    flightClasses,
    addFlightBooking,
    updateFlightBooking,
    deleteFlightBooking,
    isAddingBooking,
    isUpdatingBooking,
    isDeletingBooking,
  };
};
