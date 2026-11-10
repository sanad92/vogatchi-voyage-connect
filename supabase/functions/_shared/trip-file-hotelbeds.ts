/**
 * HOTELBEDS HOTEL booking-detail, READ-ONLY.
 * These helpers are pure: no credentials, network, DB, status writes or PII.
 * Source: Hotelbeds Booking API /bookings GET and published Postman BookingDetail.
 */
export type HotelbedsEnvironment = 'test' | 'production';

export interface HotelbedsObservation {
  reference: string;
  providerStatus: 'CONFIRMED' | 'CANCELLED' | 'MODIFIED' | 'UNKNOWN';
  rawStatusRecognized: boolean;
  bookingObserved: true;
  amendmentExecutionVerified: false;
}

const BOOKING_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9-]{5,39}$/;
const BOOKING_ENDPOINT: Record<HotelbedsEnvironment, string> = {
  test: 'https://api.test.hotelbeds.com/hotel-api/1.0/bookings/',
  production: 'https://api.hotelbeds.com/hotel-api/1.0/bookings/',
};

export function isSafeHotelbedsReference(value: unknown): value is string {
  return typeof value === 'string' && BOOKING_REFERENCE.test(value);
}

export function hotelbedsDetailUrl(environment: HotelbedsEnvironment, ref: string): string {
  if (!(environment in BOOKING_ENDPOINT) || !isSafeHotelbedsReference(ref)) {
    throw new Error('invalid_reference_or_environment');
  }
  // No caller-controlled host, scheme, query string or URL path separators.
  return BOOKING_ENDPOINT[environment] + encodeURIComponent(ref);
}

export function matchesRegisteredHotelbedsService(service: {
  organization_id: string | null;
  booking_id: string | null;
  booking_reference_supplier: string | null;
  booking_source: string | null;
  supplier_name: string | null;
}, orgId: string, bookingId: string, reference: string): boolean {
  if (!isSafeHotelbedsReference(reference)) return false;
  const isHotelbeds = (service.booking_source || '').trim().toLowerCase() === 'hotelbeds'
    || /^(hotelbeds|hbx group)(?:\s|$)/i.test((service.supplier_name || '').trim());
  return service.organization_id === orgId && service.booking_id === bookingId
    && service.booking_reference_supplier === reference && isHotelbeds;
}

function obj(x: unknown): Record<string, unknown> | null {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
    ? x as Record<string, unknown> : null;
}

/**
 * Deliberately discards holder names, contact details, prices and room data.
 * A booking lookup cannot establish that a proposed amendment was fulfilled.
 */
export function parseHotelbedsBookingObservation(
  payload: unknown, expectedReference: string,
): HotelbedsObservation {
  const parent = obj(payload);
  const booking = obj(parent?.booking);
  if (!booking || typeof booking.reference !== 'string'
    || booking.reference !== expectedReference) {
    throw new Error('provider_reference_mismatch_or_missing');
  }
  const raw = typeof booking.status === 'string' ? booking.status.toUpperCase() : '';
  const recognized = raw === 'CONFIRMED' || raw === 'CANCELLED' || raw === 'MODIFIED';
  return {
    reference: expectedReference,
    providerStatus: recognized ? raw as HotelbedsObservation['providerStatus'] : 'UNKNOWN',
    rawStatusRecognized: recognized,
    bookingObserved: true,
    amendmentExecutionVerified: false,
  };
}
