
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from './useOrgId';
import { toast } from "sonner";

export type BookingType = 'hotel' | 'flight' | 'car_rental' | 'transport';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface UnifiedBooking {
  id: string;
  organization_id: string;
  booking_number: string;
  booking_type: BookingType;
  customer_id: string | null;
  customer_name: string | null;
  employee_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  status: BookingStatus;
  status_id: string | null;
  selling_price: number;
  cost_price: number;
  profit: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  quote_id: string | null;
  legacy_table: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: { name: string } | null;
  employees?: { full_name: string } | null;
  booking_statuses?: { name: string; name_ar: string; color: string } | null;
}

export interface BookingFilters {
  type?: BookingType;
  status?: BookingStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface NewBookingData {
  booking_type: BookingType;
  customer_id?: string;
  customer_name?: string;
  employee_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  selling_price?: number;
  cost_price?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  quote_id?: string;
  // Detail data
  hotelDetails?: Record<string, any>;
  flightDetails?: Record<string, any>;
  carDetails?: Record<string, any>;
  transportDetails?: Record<string, any>;
}

export const useUnifiedBookings = (filters: BookingFilters = {}) => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { type, status, search, startDate, endDate, page = 1, pageSize = 20 } = filters;

  const bookingsQuery = useQuery({
    queryKey: ['unified-bookings', orgId, type, status, search, startDate, endDate, page, pageSize],
    queryFn: async () => {
      let q = supabase
        .from('bookings')
        .select('*, customers(name), employees(full_name), booking_statuses(name, name_ar, color)', { count: 'exact' }) as any;

      if (type) q = q.eq('booking_type', type);
      if (status) q = q.eq('status', status);
      if (startDate) q = q.gte('start_date', startDate);
      if (endDate) q = q.lte('start_date', endDate);
      if (search) {
        q = q.or(`customer_name.ilike.%${search}%,booking_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await q
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data as UnifiedBooking[], count: count || 0 };
    },
    enabled: !!orgId,
  });

  const createBooking = useMutation({
    mutationFn: async (input: NewBookingData) => {
      // Generate booking number
      const { data: numData } = await supabase.rpc('generate_booking_number');
      const bookingNumber = numData || `BK-${Date.now()}`;

      const profit = (input.selling_price || 0) - (input.cost_price || 0);

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          organization_id: orgId!,
          booking_number: bookingNumber,
          booking_type: input.booking_type,
          customer_id: input.customer_id || null,
          customer_name: input.customer_name || null,
          employee_id: input.employee_id || null,
          supplier_id: input.supplier_id || null,
          supplier_name: input.supplier_name || null,
          selling_price: input.selling_price || 0,
          cost_price: input.cost_price || 0,
          profit,
          currency: input.currency || 'EGP',
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          notes: input.notes || null,
          quote_id: input.quote_id || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Insert details based on type
      const bookingId = (booking as any).id;

      if (input.booking_type === 'hotel' && input.hotelDetails) {
        await supabase.from('booking_hotel_details').insert({
          booking_id: bookingId,
          ...input.hotelDetails,
        } as any);
      } else if (input.booking_type === 'flight' && input.flightDetails) {
        await supabase.from('booking_flight_details').insert({
          booking_id: bookingId,
          ...input.flightDetails,
        } as any);
      } else if (input.booking_type === 'car_rental' && input.carDetails) {
        await supabase.from('booking_car_details').insert({
          booking_id: bookingId,
          ...input.carDetails,
        } as any);
      } else if (input.booking_type === 'transport' && input.transportDetails) {
        await supabase.from('booking_transport_details').insert({
          booking_id: bookingId,
          ...input.transportDetails,
        } as any);
      }

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-bookings'] });
      toast.success('تم إنشاء الحجز بنجاح');
    },
    onError: (err: any) => {
      toast.error('خطأ في إنشاء الحجز: ' + err.message);
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-bookings'] });
      toast.success('تم تحديث الحالة');
    },
  });

  return {
    bookings: bookingsQuery.data?.data || [],
    totalCount: bookingsQuery.data?.count || 0,
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    createBooking,
    updateBookingStatus,
  };
};

export const useBookingDetails = (bookingId: string) => {
  return useQuery({
    queryKey: ['unified-booking-detail', bookingId],
    queryFn: async () => {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, customers(name, phone, email), employees(full_name), booking_statuses(name, name_ar, color)')
        .eq('id', bookingId)
        .single() as any;

      if (error) throw error;

      let details = null;
      const type = booking.booking_type;

      if (type === 'hotel') {
        const { data } = await supabase.from('booking_hotel_details').select('*').eq('booking_id', bookingId).single() as any;
        details = data;
      } else if (type === 'flight') {
        const { data } = await supabase.from('booking_flight_details').select('*').eq('booking_id', bookingId).single() as any;
        details = data;
      } else if (type === 'car_rental') {
        const { data } = await supabase.from('booking_car_details').select('*').eq('booking_id', bookingId).single() as any;
        details = data;
      } else if (type === 'transport') {
        const { data } = await supabase.from('booking_transport_details').select('*').eq('booking_id', bookingId).single() as any;
        details = data;
      }

      return { ...booking, details };
    },
    enabled: !!bookingId,
  });
};
