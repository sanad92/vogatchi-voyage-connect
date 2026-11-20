interface CalendarFlight {
  departure_date?: string | null;
  departure_time?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  return_departure_date?: string | null;
  return_departure_time?: string | null;
  return_arrival_date?: string | null;
  return_arrival_time?: string | null;
}

interface CalendarTransport {
  pickup_point?: string | null;
  pickup_time?: string | null;
  dropoff_point?: string | null;
}

interface CalendarBooking {
  id: string;
  booking_number?: string | null;
  customer_name?: string | null;
  booking_type: string;
  status?: string | null;
  workflow_stage?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  booking_flight_details?: CalendarFlight[] | CalendarFlight | null;
  booking_transport_details?: CalendarTransport[] | CalendarTransport | null;
}

export interface BookingCalendarEvent {
  id: string;
  kind: 'arrival' | 'departure' | 'checkin' | 'checkout' | 'flight' | 'pickup' | 'dropoff';
  date: string;
  time?: string;
  title: string;
  href: string;
}

export function bookingCalendarEvents(booking: CalendarBooking, from: string, to: string): BookingCalendarEvent[] {
  if (booking.status === 'cancelled' || booking.status === 'canceled' || booking.workflow_stage === 'cancelled') return [];

  const { id, start_date: start, end_date: end } = booking;
  const customer = booking.customer_name || 'عميل';
  const reference = booking.booking_number || id.slice(0, 8);
  const events: BookingCalendarEvent[] = [];
  const add = (suffix: string, kind: BookingCalendarEvent['kind'], date?: string | null, time?: string | null, detail?: string | null) => {
    if (!date || date < from || date > to) return;
    events.push({
      id: `${suffix}-${id}`, kind, date, time: time?.slice(0, 5),
      title: [detail, customer, reference].filter(Boolean).join(' — '),
      href: `/bookings/${id}/workspace`,
    });
  };

  if (booking.booking_type === 'flight') {
    const source = booking.booking_flight_details;
    const flight = Array.isArray(source) ? source[0] : source;
    add('st', 'flight', flight?.departure_date || start, flight?.departure_time);
    add('en', 'arrival', flight?.arrival_date || end, flight?.arrival_time);
    add('return-st', 'flight', flight?.return_departure_date, flight?.return_departure_time, 'رحلة العودة');
    add('return-en', 'arrival', flight?.return_arrival_date, flight?.return_arrival_time, 'وصول العودة');
  } else if (booking.booking_type === 'transport') {
    const source = booking.booking_transport_details;
    const transfer = Array.isArray(source) ? source[0] : source;
    add('st', 'pickup', start, transfer?.pickup_time, transfer?.pickup_point);
    add('en', 'dropoff', end, undefined, transfer?.dropoff_point);
  } else if (booking.booking_type === 'car_rental') {
    add('st', 'pickup', start);
    add('en', 'dropoff', end);
  } else if (booking.booking_type === 'hotel') {
    add('st', 'checkin', start);
    add('en', 'checkout', end);
  } else {
    add('st', 'departure', start);
    add('en', 'arrival', end);
  }

  return events;
}
