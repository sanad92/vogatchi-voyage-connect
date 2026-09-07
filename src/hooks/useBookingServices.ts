import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ServiceKind = 'hotel' | 'flight' | 'transport' | 'car';

export interface LinkedServiceBooking {
  kind: ServiceKind;
  id: string;
  reference: string;
  title: string;
  supplierName: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  selling: number;
  cost: number;
  currency: string | null;
  detailsPath: string;
}

const num = (v: any) => Number(v || 0);

export const useBookingServices = (bookingId?: string) =>
  useQuery({
    queryKey: ['booking-linked-services', bookingId],
    enabled: !!bookingId,
    queryFn: async (): Promise<LinkedServiceBooking[]> => {
      const client = supabase as any;
      const [hotels, flights, transports, cars] = await Promise.all([
        client
          .from('hotel_bookings')
          .select(
            'id, internal_booking_number, hotel_name, supplier_name, check_in_date, check_out_date, total_cost_customer, cost_per_night, number_of_nights, number_of_rooms, currency',
          )
          .eq('booking_id', bookingId),
        client
          .from('flight_bookings')
          .select(
            'id, booking_reference, flight_number, supplier_name, departure_date, return_date, total_cost, supplier_cost, currency',
          )
          .eq('booking_id', bookingId),
        client
          .from('transport_bookings')
          .select(
            'id, booking_reference, vehicle_type, supplier_name, service_date, total_cost, supplier_cost, currency',
          )
          .eq('booking_id', bookingId),
        client
          .from('car_rentals')
          .select(
            'id, rental_reference, vehicle_model, supplier_name, pickup_date, return_date, total_rental_cost, supplier_total_cost, currency',
          )
          .eq('booking_id', bookingId),
      ]);

      const rows: LinkedServiceBooking[] = [];

      (hotels.data || []).forEach((h: any) =>
        rows.push({
          kind: 'hotel',
          id: h.id,
          reference: h.internal_booking_number || '—',
          title: h.hotel_name || 'فندق',
          supplierName: h.supplier_name,
          dateFrom: h.check_in_date,
          dateTo: h.check_out_date,
          selling: num(h.total_cost_customer),
          cost:
            num(h.cost_per_night) *
            Math.max(num(h.number_of_nights) || 1, 1) *
            Math.max(num(h.number_of_rooms) || 1, 1),
          currency: h.currency,
          detailsPath: `/hotel-bookings/${h.id}`,
        }),
      );

      (flights.data || []).forEach((f: any) =>
        rows.push({
          kind: 'flight',
          id: f.id,
          reference: f.booking_reference || '—',
          title: f.flight_number ? `رحلة ${f.flight_number}` : 'حجز طيران',
          supplierName: f.supplier_name,
          dateFrom: f.departure_date,
          dateTo: f.return_date,
          selling: num(f.total_cost),
          cost: num(f.supplier_cost),
          currency: f.currency,
          detailsPath: `/flight-bookings`,
        }),
      );

      (transports.data || []).forEach((t: any) =>
        rows.push({
          kind: 'transport',
          id: t.id,
          reference: t.booking_reference || '—',
          title: t.vehicle_type || 'انتقالات',
          supplierName: t.supplier_name,
          dateFrom: t.service_date,
          dateTo: null,
          selling: num(t.total_cost),
          cost: num(t.supplier_cost),
          currency: t.currency,
          detailsPath: `/transport-bookings`,
        }),
      );

      (cars.data || []).forEach((c: any) =>
        rows.push({
          kind: 'car',
          id: c.id,
          reference: c.rental_reference || '—',
          title: c.vehicle_model || 'تأجير سيارة',
          supplierName: c.supplier_name,
          dateFrom: c.pickup_date,
          dateTo: c.return_date,
          selling: num(c.total_rental_cost),
          cost: num(c.supplier_total_cost),
          currency: c.currency,
          detailsPath: `/car-rentals`,
        }),
      );

      return rows;
    },
  });
