/** Minimal provider-versus-local comparison for read-only Hotelbeds BookingDetail.
 *
 * Only compares STAY DATES if present at booking.hotel.checkIn/checkOut.
 * There is intentionally no price, occupancy, name, room or amendment-success
 * validation: the provider schema/booking is not live-validated yet.
 */
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : null;

export type DateComparisonState = 'match' | 'mismatch' | 'not_available';

export interface StayDatesComparison {
  checkIn: DateComparisonState;
  checkOut: DateComparisonState;
  allComparableDatesMatch: boolean | null;
  amendmentExecutionVerified: false;
}

const dateValue = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value
    ? null : value;
};

export function compareHotelbedsStayDates(
  payload: unknown,
  originalHotelBooking: { check_in_date: string | null; check_out_date: string | null },
): StayDatesComparison {
  const booking = record(record(payload)?.booking);
  const hotel = record(booking?.hotel);
  const providerIn = dateValue(hotel?.checkIn);
  const providerOut = dateValue(hotel?.checkOut);
  const localIn = dateValue(originalHotelBooking.check_in_date);
  const localOut = dateValue(originalHotelBooking.check_out_date);

  const compare = (provider: string | null, local: string | null): DateComparisonState =>
    !provider || !local ? 'not_available' : provider === local ? 'match' : 'mismatch';
  const checkIn = compare(providerIn, localIn);
  const checkOut = compare(providerOut, localOut);
  return {
    checkIn,
    checkOut,
    allComparableDatesMatch:
      checkIn === 'not_available' || checkOut === 'not_available'
        ? null : checkIn === 'match' && checkOut === 'match',
    // Matching current stored dates does NOT establish that requested
    // amendments were fulfilled or that the provider accepted changes.
    amendmentExecutionVerified: false,
  };
}
