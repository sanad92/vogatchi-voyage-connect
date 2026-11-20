import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import type { LinkedItineraryService, TravelServiceKind } from '@/lib/travelDocuments';

export type ServiceKind = TravelServiceKind;

export interface LinkedServiceBooking extends LinkedItineraryService {
  reference: string;
  title: string;
  supplierName: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  selling: number;
  cost: number;
  currency: string | null;
  detailsPath: string;
  tickets?: string[];
}

const num = (value: number | null) => Number(value ?? 0);
const isCancelled = (status: { name: string } | null) =>
  ['cancelled', 'canceled', 'ملغي', 'ملغى', 'ملغاة'].includes(status?.name.trim().toLowerCase() ?? '');
const textTickets = (value: unknown) => Array.isArray(value) ? value.filter((ticket): ticket is string =>
  typeof ticket === 'string' && Boolean(ticket.trim())) : [];

export const useBookingServices = (bookingId?: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['booking-linked-services', bookingId, orgId],
    enabled: !!bookingId && !!orgId,
    queryFn: async (): Promise<LinkedServiceBooking[]> => {
      if (!bookingId || !orgId) return [];
      const client = supabase;
      const [hotels, flights, transports, cars] = await Promise.all([
        client
          .from('hotel_bookings')
          .select(
            'id, internal_booking_number, hotel_name, hotel_star_rating, destination_city, supplier_name, check_in_date, check_out_date, total_cost_customer, cost_per_night, number_of_nights, number_of_rooms, room_type, room_view, meal_plan, number_of_adults, number_of_children, children_ages, booking_reference_supplier, cancellation_policy, currency, updated_at, status:booking_statuses(name)',
          )
          .eq('booking_id', bookingId).eq('organization_id', orgId).order('created_at').order('id'),
        client
          .from('flight_bookings')
          .select(
            'id, booking_reference, flight_number, supplier_name, departure_date, departure_time, arrival_date, arrival_time, total_cost, supplier_cost, currency, ticket_numbers, number_of_passengers, is_round_trip, confirmation_number, seat_preferences, meal_preferences, airline:airlines(name), departure:airports!flight_bookings_departure_airport_id_fkey(name, iata_code), arrival:airports!flight_bookings_arrival_airport_id_fkey(name, iata_code), flight_class:flight_classes(name, name_ar), updated_at, status:booking_statuses(name)',
          )
          .eq('booking_id', bookingId).eq('organization_id', orgId).order('created_at').order('id'),
        client
          .from('transport_bookings')
          .select(
            'id, booking_reference, pickup_location, dropoff_location, supplier_name, departure_date, departure_time, arrival_date, arrival_time, total_cost, supplier_cost, currency, number_of_passengers, vehicle:vehicle_types(name), updated_at, status:booking_statuses(name)',
          )
          .eq('booking_id', bookingId).eq('organization_id', orgId).order('created_at').order('id'),
        client
          .from('car_rentals')
          .select(
            'id, rental_reference, vehicle_make, vehicle_model, supplier_name, rental_start_date, rental_end_date, total_rental_cost, supplier_total_cost, currency, pickup_location, return_location, insurance_included, updated_at, status:booking_statuses(name)',
          )
          .eq('booking_id', bookingId).eq('organization_id', orgId).order('created_at').order('id'),
      ]);

      // Provider errors must not look like an empty itinerary.
      const failed = [
        { label: 'الفنادق', result: hotels },
        { label: 'الطيران', result: flights },
        { label: 'الانتقالات', result: transports },
        { label: 'السيارات', result: cars },
      ].find(item => item.result.error);
      if (failed) throw new Error(`تعذر تحميل خدمات ${failed.label}: ${failed.result.error.message}`);

      const rows: LinkedServiceBooking[] = [];

      (hotels.data ?? []).forEach(h =>
        rows.push({
          kind: 'hotel',
          id: h.id,
          reference: h.internal_booking_number || '—',
          title: h.hotel_name || 'فندق',
          cancelled: isCancelled(h.status),
          updatedAt: h.updated_at,
          itinerary: { hotel: {
            hotel_name: h.hotel_name, city: h.destination_city, star_rating: h.hotel_star_rating,
            check_in: h.check_in_date, check_out: h.check_out_date, nights: h.number_of_nights,
            rooms: h.number_of_rooms, room_type: h.room_type, room_view: h.room_view, meal_plan: h.meal_plan,
            adults: h.number_of_adults, children: h.number_of_children, children_ages: h.children_ages,
            booking_reference: h.booking_reference_supplier || h.internal_booking_number,
            cancellation_policy: h.cancellation_policy,
          } },
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

      (flights.data ?? []).forEach(f =>
        rows.push({
          kind: 'flight',
          id: f.id,
          reference: f.booking_reference || '—',
          title: f.flight_number ? `رحلة ${f.flight_number}` : 'حجز طيران',
          cancelled: isCancelled(f.status),
          updatedAt: f.updated_at,
          itinerary: { flight: {
            airline: f.airline?.name, flight_class: f.flight_class?.name_ar || f.flight_class?.name,
            departure_airport: f.departure?.iata_code || f.departure?.name,
            arrival_airport: f.arrival?.iata_code || f.arrival?.name,
            departure_date: f.departure_date, departure_time: f.departure_time,
            arrival_date: f.arrival_date, arrival_time: f.arrival_time, flight_number: f.flight_number,
            passengers_count: f.number_of_passengers, is_round_trip: f.is_round_trip,
            pnr: f.confirmation_number || f.booking_reference, ticket_numbers: textTickets(f.ticket_numbers),
            seat_preferences: f.seat_preferences, meal_preferences: f.meal_preferences,
          } },
          supplierName: f.supplier_name,
          dateFrom: f.departure_date,
          dateTo: f.arrival_date,
          selling: num(f.total_cost),
          cost: num(f.supplier_cost),
          currency: f.currency,
          detailsPath: `/flight-bookings`,
          tickets: textTickets(f.ticket_numbers),
        }),
      );

      (transports.data ?? []).forEach(t =>
        rows.push({
          kind: 'transport',
          id: t.id,
          reference: t.booking_reference || '—',
          title: [t.pickup_location, t.dropoff_location].filter(Boolean).join(' ← ') || 'انتقالات',
          cancelled: isCancelled(t.status),
          updatedAt: t.updated_at,
          itinerary: { transport: {
            vehicle_type: t.vehicle?.name, pickup_point: t.pickup_location, dropoff_point: t.dropoff_location,
            pickup_date: t.departure_date, pickup_time: t.departure_time, dropoff_date: t.arrival_date,
            dropoff_time: t.arrival_time, passengers: t.number_of_passengers, reference: t.booking_reference,
          } },
          supplierName: t.supplier_name,
          dateFrom: t.departure_date,
          dateTo: t.arrival_date,
          selling: num(t.total_cost),
          cost: num(t.supplier_cost),
          currency: t.currency,
          detailsPath: `/transport-bookings`,
        }),
      );

      (cars.data ?? []).forEach(c =>
        rows.push({
          kind: 'car',
          id: c.id,
          reference: c.rental_reference || '—',
          title: c.vehicle_model || 'تأجير سيارة',
          cancelled: isCancelled(c.status),
          updatedAt: c.updated_at,
          itinerary: { car: {
            car_type: [c.vehicle_make, c.vehicle_model].filter(Boolean).join(' '),
            pickup_date: c.rental_start_date, dropoff_date: c.rental_end_date, pickup_location: c.pickup_location,
            dropoff_location: c.return_location, insurance_included: c.insurance_included, reference: c.rental_reference,
          } },
          supplierName: c.supplier_name,
          dateFrom: c.rental_start_date,
          dateTo: c.rental_end_date,
          selling: num(c.total_rental_cost),
          cost: num(c.supplier_total_cost),
          currency: c.currency,
          detailsPath: `/car-rentals`,
        }),
      );

      return rows;
    },
  });
};
