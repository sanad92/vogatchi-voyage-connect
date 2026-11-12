/**
 * Safar ERP / Trip File air supplier observation adapters (pure, no I/O).
 * Amadeus SELF-SERVICE Flight Order Management accepts its own order ID,
 * not an arbitrary GDS PNR. Travelport JSON Air v11 accepts locator code.
 * Never interpret a reservation response as proof of ticket issuance or
 * amendment fulfillment.
 */
export type AirProvider = 'amadeus_self_service' | 'travelport_json_v11';
export type AirEnvironment = 'test' | 'production';
export type AirObservation = {
  provider: AirProvider;
  referenceMatched: true;
  reservationObserved: true;
  ticketingVerified: false;
  amendmentExecutionVerified: false;
  supplierStatus: 'present' | 'cancelled' | 'unknown';
};

const AMADEUS_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{4,79}$/;
const TRAVELPORT_LOCATOR = /^[A-Za-z0-9]{5,8}$/;

export function validAirReference(provider: AirProvider, reference: unknown): reference is string {
  if (typeof reference !== 'string') return false;
  if (provider === 'amadeus_self_service') return AMADEUS_ID.test(reference);
  if (provider === 'travelport_json_v11') return TRAVELPORT_LOCATOR.test(reference);
  return false;
}

export function airRetrieveUrl(
  provider: AirProvider, environment: AirEnvironment, reference: string,
): string {
  if (!validAirReference(provider, reference) ||
    !['test','production'].includes(environment)) throw new Error('invalid_air_reference');
  const host = provider === 'amadeus_self_service'
    ? environment === 'test' ? 'https://test.api.amadeus.com' : 'https://api.amadeus.com'
    : environment === 'test' ? 'https://api.pp.travelport.net' : 'https://api.travelport.net';
  const route = provider === 'amadeus_self_service'
    ? '/v1/booking/flight-orders/'
    : '/11/air/book/reservation/reservations/';
  return host + route + encodeURIComponent(reference);
}

export function registeredAirServiceMatches(
  source: {
    organization_id: string | null;
    booking_id: string | null;
    booking_reference: string | null;
    supplier_reference: string | null;
    supplier_name: string | null;
  },
  provider: AirProvider, orgId: string, bookingId: string, reference: string,
): boolean {
  if (!validAirReference(provider, reference)) return false;
  const name = (source.supplier_name ?? '').trim().toLowerCase();
  const expected = provider === 'amadeus_self_service'
    ? /^amadeus(?:\s|$)/ : /^travelport(?:\s|$)/;
  // Amadeus order IDs must be explicitly stored in supplier_reference,
  // not inferred from the flight PNR/booking_reference.
  const linked = provider === 'amadeus_self_service'
    ? source.supplier_reference === reference
    : source.supplier_reference === reference || source.booking_reference === reference;
  return source.organization_id === orgId && source.booking_id === bookingId
    && expected.test(name) && linked;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? v as Record<string, unknown> : null;
}

/** Fail closed: never expose names, ticket numbers, prices, contacts or raw PNR. */
export function parseAirObservation(
  provider: AirProvider, payload: unknown, reference: string,
): AirObservation {
  if (!validAirReference(provider, reference)) throw new Error('invalid_reference');
  const top = obj(payload);
  if (!top) throw new Error('invalid_provider_response');
  if (provider === 'amadeus_self_service') {
    const data = obj(top.data);
    if (!data || data.id !== reference) throw new Error('amadeus_order_id_mismatch');
    return {
      provider, referenceMatched: true, reservationObserved: true,
      ticketingVerified: false, amendmentExecutionVerified: false,
      supplierStatus: 'present',
    };
  }
  if (provider === 'travelport_json_v11') {
    const reservation = obj(top.ReservationResponse);
    const body = obj(reservation?.Reservation);
    const identifiers = body?.Identifier;
    const items = Array.isArray(identifiers) ? identifiers : identifiers ? [identifiers] : [];
    const locatorMatches = items.some(item => {
      const id = obj(item);
      return id?.value === reference;
    });
    if (!locatorMatches) throw new Error('travelport_locator_mismatch');
    return {
      provider, referenceMatched: true, reservationObserved: true,
      ticketingVerified: false, amendmentExecutionVerified: false,
      supplierStatus: 'unknown',
    };
  }
  throw new Error('unsupported_provider');
}
