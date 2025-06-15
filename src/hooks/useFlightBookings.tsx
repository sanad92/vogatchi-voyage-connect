
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { FlightBooking, NewFlightBooking, Airport, Airline, FlightClass } from '@/types/flightBooking';

export const useFlightBookings = () => {
  const queryClient = useQueryClient();

  // Fetch flight bookings
  const { data: flightBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['flight-bookings'],
    queryFn: async (): Promise<FlightBooking[]> => {
      const { data, error } = await supabase
        .from('flight_bookings')
        .select(`
          *,
          departure_airport:airports!departure_airport_id(*),
          arrival_airport:airports!arrival_airport_id(*),
          airline:airlines(*),
          flight_class:flight_classes(*),
          booking_status:booking_statuses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our TypeScript interfaces
      return (data || []).map(booking => ({
        ...booking,
        passenger_details: Array.isArray(booking.passenger_details) 
          ? booking.passenger_details 
          : booking.passenger_details 
            ? JSON.parse(booking.passenger_details as string) 
            : [],
        baggage_info: booking.baggage_info 
          ? (typeof booking.baggage_info === 'string' 
              ? JSON.parse(booking.baggage_info) 
              : booking.baggage_info)
          : undefined,
        ticket_numbers: Array.isArray(booking.ticket_numbers) 
          ? booking.ticket_numbers 
          : []
      })) as FlightBooking[];
    }
  });

  // Fetch airports
  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: async (): Promise<Airport[]> => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch airlines
  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async (): Promise<Airline[]> => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch flight classes
  const { data: flightClasses = [] } = useQuery({
    queryKey: ['flight-classes'],
    queryFn: async (): Promise<FlightClass[]> => {
      const { data, error } = await supabase
        .from('flight_classes')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Add flight booking mutation
  const { mutateAsync: addFlightBooking, isPending: isAddingBooking } = useMutation({
    mutationFn: async (booking: NewFlightBooking) => {
      // Prepare data for database insertion, converting complex types to JSON
      const dbBooking = {
        ...booking,
        passenger_details: booking.passenger_details ? JSON.stringify(booking.passenger_details) : null,
        baggage_info: booking.baggage_info ? JSON.stringify(booking.baggage_info) : null,
        ticket_numbers: booking.ticket_numbers || []
      };

      const { data, error } = await supabase
        .from('flight_bookings')
        .insert([dbBooking])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      toast({
        title: "تم إنشاء حجز الطيران",
        description: "تم إضافة حجز الطيران بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error adding flight booking:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة حجز الطيران",
        variant: "destructive",
      });
    }
  });

  // Update flight booking mutation
  const { mutateAsync: updateFlightBooking, isPending: isUpdatingBooking } = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FlightBooking> & { id: string }) => {
      // Prepare updates for database, converting complex types to JSON
      const dbUpdates = {
        ...updates,
        passenger_details: updates.passenger_details ? JSON.stringify(updates.passenger_details) : undefined,
        baggage_info: updates.baggage_info ? JSON.stringify(updates.baggage_info) : undefined
      };

      // Remove properties that shouldn't be updated directly
      delete (dbUpdates as any).departure_airport;
      delete (dbUpdates as any).arrival_airport;
      delete (dbUpdates as any).airline;
      delete (dbUpdates as any).flight_class;
      delete (dbUpdates as any).booking_status;

      const { data, error } = await supabase
        .from('flight_bookings')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      toast({
        title: "تم تحديث حجز الطيران",
        description: "تم تحديث حجز الطيران بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error updating flight booking:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حجز الطيران",
        variant: "destructive",
      });
    }
  });

  // Delete flight booking mutation
  const { mutateAsync: deleteFlightBooking, isPending: isDeletingBooking } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flight_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      toast({
        title: "تم حذف حجز الطيران",
        description: "تم حذف حجز الطيران بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error deleting flight booking:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف حجز الطيران",
        variant: "destructive",
      });
    }
  });

  return {
    flightBookings,
    bookingsLoading,
    airports,
    airlines,
    flightClasses,
    addFlightBooking,
    updateFlightBooking,
    deleteFlightBooking,
    isAddingBooking,
    isUpdatingBooking,
    isDeletingBooking
  };
};
