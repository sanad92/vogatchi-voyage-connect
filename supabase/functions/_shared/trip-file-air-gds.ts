/** Read-only Air GDS validation. No provider credentials or passenger PII.
 * Travelport TripServices v11 Reservation Retrieve; Amadeus requires a
 * currently supported Enterprise PNR contract (old Self-Service retired).
 */
export type AirGdsProvider = 'travelport' | 'amadeus';
export type ProviderStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING' |
  'SCHEDULE_CHANGE' | 'WAITLISTED' | 'UNKNOWN';

export interface AirGdsObservation {
  provider: AirGdsProvider;
  bookingReferenceMatched: true;
  reservationStatus: ProviderStatus;
  scheduleChangeFlag: boolean;
  amendmentExecutionVerified: false;
  ticketingVerified: false;
}

const locatorPattern = /^[A-Z0-9]{5,16}$/;
const travelportUrl: Record<'preproduction' | 'production', string> = {
  preproduction: 'https://api.pp.travelport.net/11/air/book/reservation/reservations/',
  production: 'https://api.travelport.net/11/air/book/reservation/reservations/',
};
export function validTravelportLocator(v: unknown): v is string {
  return typeof v === 'string' && locatorPattern.test(v);
}
export function travelportReservationUrl(
  environment: 'preproduction' | 'production', locator: string,
): string {
  if (!Object.prototype.hasOwnProperty.call(travelportUrl, environment)
    || !validTravelportLocator(locator)) throw new Error('invalid_travelport_locator');
  return travelportUrl[environment] + encodeURIComponent(locator);
}

export function isRegisteredGdsFlight(
  original: {
    organization_id: string | null; booking_id: string | null;
    supplier_reference: string | null; supplier_name: string | null;
  },
  organizationId: string, bookingId: string, reference: string,
  provider: AirGdsProvider,
): boolean {
  const supplierName = (original.supplier_name || '').trim().toLowerCase();
  const providerIdentity = provider === 'travelport'
    ? /^(travelport|galileo|apollo|worldspan)(\b|\s|-)/.test(supplierName)
    : /^amadeus(\b|\s|-)/.test(supplierName);
  return Boolean(providerIdentity
    && original.organization_id === organizationId
    && original.booking_id === bookingId
    && original.supplier_reference === reference);
}
function object(v: unknown): Record<string, unknown> | null {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    ? v as Record<string, unknown> : null;
}
/** Only a Travelport-issued locator is treated as a match. Carrier locator
 * or a different provider response MUST NOT silently pass authorization.
 */
export function parseTravelportAirObservation(
  payload: unknown, expectedLocator: string,
): AirGdsObservation {
  if (!validTravelportLocator(expectedLocator)) throw new Error('invalid_travelport_locator');
  const response = object(object(payload)?.ReservationResponse);
  const reservation = object(response?.Reservation);
  const receipts = reservation?.Receipt;
  if (!Array.isArray(receipts)) throw new Error('travelport_reservation_not_found');

  const matching = receipts
    .map(x => object(x))
    .filter((x): x is Record<string,unknown> => !!x)
    .filter(x => x['@type'] === 'ReceiptConfirmation')
    .filter(x => object(x.Identifier)?.authority === 'Travelport')
    .filter(x => {
      const loc = object(object(x.Confirmation)?.Locator);
      return loc?.value === expectedLocator
        && ['1G','1V','1P','1A','Travelport'].includes(String(loc?.source || ''));
    });

  if (matching.length !== 1) throw new Error('travelport_locator_mismatch_or_ambiguous');
  const confirm = object(matching[0].Confirmation);
  const offerStatus = object(confirm?.OfferStatus);
  const air = offerStatus?.StatusAir;
  const codes = Array.isArray(air)
    ? air.map(x => object(x)?.code).filter((x): x is string => typeof x === 'string')
    : [];
  // Do not infer ticket issuance from "HK", price or ReceiptPayment.
  const scheduleChangeFlag = codes.some(x => x === 'TK' || x === 'UN');
  const reservationStatus: ProviderStatus = scheduleChangeFlag
    ? 'SCHEDULE_CHANGE'
    : codes.some(x => x === 'XX' || x === 'HX')
    ? 'CANCELLED'
    : codes.length > 0 && codes.every(x => x === 'HK')
    ? 'CONFIRMED'
    : codes.some(x => x === 'HL' || x === 'LL')
    ? 'WAITLISTED'
    : codes.some(x => x === 'HN' || x === 'PN')
    ? 'PENDING' : 'UNKNOWN';

  return {
    provider: 'travelport',
    bookingReferenceMatched: true,
    reservationStatus,
    scheduleChangeFlag,
    amendmentExecutionVerified: false,
    ticketingVerified: false,
  };
}

/** Amadeus Enterprise PNR retrieve requires confirmed customer contract
 * and parser. This must remain unavailable until that contract is known.
 * Do not call a retired Self-Service Flight Orders endpoint for a GDS PNR.
 */
export function amadeusEnterpriseContractReady(contract: unknown): false {
  void contract;
  return false;
}
