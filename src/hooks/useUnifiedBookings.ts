
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { callUntypedRpc } from "@/lib/supabaseRpc";
import { getBookingCreationRequest, finishBookingCreationRequest, type BookingCreationRequest } from "@/lib/bookingCreationRequest";
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
  customer_phone?: string;
  customer_email?: string;
  employee_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  selling_price?: number;
  cost_price?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  // Detail data
  hotelDetails?: Record<string, unknown>;
  flightDetails?: Record<string, unknown>;
  carDetails?: Record<string, unknown>;
  transportDetails?: Record<string, unknown>;
}

export const useUnifiedBookings = (filters: BookingFilters = {}) => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const creationRequest = useRef<BookingCreationRequest | null>(null);
  const queryClient = useQueryClient();
  const { type, status, search, startDate, endDate, page = 1, pageSize = 20 } = filters;

  const bookingsQuery = useQuery({
    queryKey: ['unified-bookings', orgId, type, status, search, startDate, endDate, page, pageSize],
    queryFn: async () => {
      let q = supabase
        .from('bookings')
        .select('*, customers(name), employees(full_name), booking_statuses(name, name_ar, color)', { count: 'exact' });

      if (orgId) q = q.eq('organization_id', orgId);
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
      if (!orgId || !user?.id) throw new Error('تعذر تحديد الشركة أو المستخدم');
      const payload = JSON.parse(JSON.stringify(input));
      const request = await getBookingCreationRequest(orgId, user.id, payload, creationRequest.current);
      creationRequest.current = request;
      const { data: booking, error } = await callUntypedRpc<UnifiedBooking & { invoice_id: string; already_created: boolean }>(
        'create_booking_atomic', { _org: orgId, _request_id: request.id, _payload: payload },
      );
      if (error) throw new Error(error.message);
      if (!booking || typeof booking.id !== 'string' || !booking.id ||
        typeof booking.invoice_id !== 'string' || !booking.invoice_id) {
        throw new Error('لم يرجع الخادم تأكيد الحفظ؛ أعد المحاولة بنفس البيانات');
      }
      return booking;
    },
    onSuccess: async (booking) => {
      await Promise.all(['unified-bookings', 'bookings', 'invoices', 'supplier-payment-orders',
        'supplier-invoices', 'customers', 'booking-workspace']
        .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(booking.already_created ? 'تم استرجاع نفس الحجز المحفوظ' : 'تم حفظ الحجز وتفاصيله ومستنداته');
    },
    onError: (err: Error) => toast.error('خطأ في إنشاء الحجز: ' + err.message),
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
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
    finishCreation: () => {
      if (creationRequest.current) finishBookingCreationRequest(creationRequest.current);
    },
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
        .single();

      if (error) throw error;

      let details = null;
      const type = booking.booking_type;

      if (type === 'hotel') {
        const { data } = await supabase.from('booking_hotel_details').select('*').eq('booking_id', bookingId).single();
        details = data;
      } else if (type === 'flight') {
        const { data } = await supabase.from('booking_flight_details').select('*').eq('booking_id', bookingId).single();
        details = data;
      } else if (type === 'car_rental') {
        const { data } = await supabase.from('booking_car_details').select('*').eq('booking_id', bookingId).single();
        details = data;
      } else if (type === 'transport') {
        const { data } = await supabase.from('booking_transport_details').select('*').eq('booking_id', bookingId).single();
        details = data;
      }

      return { ...booking, details };
    },
    enabled: !!bookingId,
  });
};
