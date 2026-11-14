/**
 * Trip File AIR: read-only record-locator checks. No secrets/network/DB.
 * Travelport TripServices Air v11 Reservation Retrieve:
 * https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/Air11/Book/APIRef_ReservationRetrieve.htm
 *
 * Amadeus Self-Service was retired July 2026. Enterprise PoweredPNR requires
 * an agency-specific contract. This adapter deliberately has NO Amadeus URL.
 */
export type AirProvider = 'travelport' | 'amadeus_enterprise' | 'sabre';
export type ProviderEnvironment = 'preproduction' | 'production';
export type AirReservationState =
  | 'confirmed' | 'cancelled' | 'pending' | 'modified'
  | 'rejected' | 'waitlisted' | 'mixed' | 'unknown';

export interface AirSourceBooking {
  organization_id: string | null;
  booking_id: string | null;
  booking_reference: string | null;
  supplier_reference: string | null;
  supplier_name: string | null;
}

export function safeAirLocator(v: unknown): v is string {
  // Provider reservation record locator, NOT a customer-entered URL/order ID.
  return typeof v === 'string' && /^[A-Z0-9]{6}$/.test(v);
}

export function providerFromSupplier(name: unknown): AirProvider | null {
  if (typeof name !== 'string') return null;
  const n = name.trim().toLowerCase();
  if (/^(travelport\+?|galileo)(?:\s|$)/.test(n)) {
    return 'travelport';
  }
  if (/^(amadeus|amadeus enterprise)(?:\s|$)/.test(n)) {
    return 'amadeus_enterprise';
  }
  if (/^sabre(?:\s|$)/.test(n)) return 'sabre';
  return null;
}

export function sameAirBookingReference(
  source: AirSourceBooking,
  organizationId: string,
  bookingId: string,
  reference: string,
  provider: AirProvider,
): boolean {
  if (!safeAirLocator(reference)) return false;
  return source.organization_id === organizationId && source.booking_id === bookingId
    && (source.supplier_reference === reference || source.booking_reference === reference)
    && providerFromSupplier(source.supplier_name) === provider;
}

const airUrls: Record<ProviderEnvironment, string> = {
  preproduction: 'https://api.pp.travelport.net/11/air/book/reservation/reservations/',
  production: 'https://api.travelport.net/11/air/book/reservation/reservations/',
};
const oauthUrls: Record<ProviderEnvironment, string> = {
  preproduction: 'https://auth.pp.travelport.net/oauth/token',
  production: 'https://auth.travelport.net/oauth/token',
};

export function travelportRetrieveUrl(env: ProviderEnvironment, locator: string): string {
  if (!Object.prototype.hasOwnProperty.call(airUrls,env) || !safeAirLocator(locator)) {
    throw new Error('invalid_travelport_locator');
  }
  return airUrls[env] + locator;
}

export function travelportOAuthUrl(env: ProviderEnvironment): string {
  if (!Object.prototype.hasOwnProperty.call(oauthUrls,env)) {
    throw new Error('invalid_travelport_environment');
  }
  return oauthUrls[env];
}

const object = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];

function normalizeAirStatus(value: unknown): AirReservationState {
  const s = String(value || '').toLowerCase();
  if (s === 'confirmed' || s === 'hk') return 'confirmed';
  if (s === 'cancelled' || s === 'canceled' || s === 'xx') return 'cancelled';
  if (s === 'pending' || s === 'hn') return 'pending';
  if (s === 'modified') return 'modified';
  if (s === 'rejected') return 'rejected';
  if (s === 'waitlisted') return 'waitlisted';
  return 'unknown';
}

/** Deliberately omit itinerary, passenger details, ticket numbers, prices. */
export interface AirReservationObservation {
  provider: 'travelport' | 'sabre';
  bookingLocatorMatched: true;
  airStatus: AirReservationState;
  statusSampleCount: number;
  ticketIssuanceVerified: false;
  amendmentExecutionVerified: false;
}

export function parseTravelportReservation(
  payload: unknown, expectedLocator: string,
): AirReservationObservation {
  if (!safeAirLocator(expectedLocator)) throw new Error('unsafe_expected_locator');
  const top = object(payload);
  const reservation = object(top?.ReservationResponse) ?
    object(object(top?.ReservationResponse)?.Reservation) : object(top?.Reservation);
  if (!reservation) throw new Error('missing_reservation');
  const receipts = list(reservation.Receipt).map(object).filter(
    (x): x is Record<string,unknown> => x !== null
  );
  // Travelport's own receipt contains its locator. Airline "VendorLocator"
  // is not a Travelport booking identifier even if its six digits match.
  const matching = receipts.filter(r => {
    if (r['@type'] !== 'ReceiptConfirmation') return false;
    if (object(r.Identifier)?.authority !== 'Travelport') return false;
    const loc = object(object(r.Confirmation)?.Locator);
    return loc?.value === expectedLocator && loc?.sourceContext !== 'VendorLocator';
  });
  if (matching.length !== 1) throw new Error('travelport_locator_missing_or_ambiguous');

  const conf = object(matching[0].Confirmation);
  const statuses = list(object(conf?.OfferStatus)?.StatusAir).map(object)
    .filter((x): x is Record<string,unknown> => x !== null)
    .map(x => normalizeAirStatus(x.value || x.code));
  const nonUnknown = statuses.filter(s => s !== 'unknown');
  const allSame = nonUnknown.length === statuses.length
    && nonUnknown.every(s => s === nonUnknown[0]);
  return {
    provider: 'travelport',
    bookingLocatorMatched: true,
    airStatus: !nonUnknown.length ? 'unknown' :
      allSame ? nonUnknown[0] : 'mixed',
    statusSampleCount: Math.min(statuses.length, 30),
    ticketIssuanceVerified: false,
    amendmentExecutionVerified: false,
  };
}

// Sabre Booking Management v1 uses POST for the read-only getBooking operation.
const sabreHosts: Record<ProviderEnvironment, string> = {
  preproduction: 'https://api.cert.platform.sabre.com',
  production: 'https://api.platform.sabre.com',
};

export function sabreEndpoints(environment: ProviderEnvironment) {
  if (!Object.prototype.hasOwnProperty.call(sabreHosts, environment)) throw new Error('invalid_sabre_environment');
  const host = sabreHosts[environment];
  return { token: host + '/v2/auth/token', retrieve: host + '/v1/trip/orders/getBooking' };
}

export function parseSabreReservation(payload: unknown, expectedLocator: string): AirReservationObservation {
  const booking = object(payload);
  // Bind to the Sabre booking ID, never to an echoed request or airline locator.
  if (!safeAirLocator(expectedLocator) || booking?.bookingId !== expectedLocator
    || !Array.isArray(booking.flights) || booking.flights.length === 0
    || !booking.flights.every(flight => object(flight) !== null)
    || (booking.errors !== undefined && (!Array.isArray(booking.errors) || booking.errors.length > 0))) {
    throw new Error('sabre_booking_not_verified');
  }

  // getBooking proves record retrieval. Do not infer segment/ticket status from
  // the presence of flights or from the booking-level isTicketed flag.
  return {
    provider: 'sabre',
    bookingLocatorMatched: true,
    airStatus: 'unknown',
    statusSampleCount: 0,
    ticketIssuanceVerified: false,
    amendmentExecutionVerified: false,
  };
}
