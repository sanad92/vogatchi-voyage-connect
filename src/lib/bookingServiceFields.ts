export interface FlightCatalogEntry {
  id: string;
  name: string;
  name_ar?: string | null;
  iata_code?: string | null;
  icao_code?: string | null;
  code?: string | null;
  city?: string | null;
}

export function findFlightCatalogEntry(value: string | null | undefined, entries: readonly FlightCatalogEntry[] = []) {
  const match = value?.trim().toLowerCase();
  if (!match) return undefined;
  return entries.find((entry) =>
    [entry.id, entry.name, entry.name_ar, entry.iata_code, entry.icao_code, entry.code]
      .some(candidate => candidate?.trim().toLowerCase() === match));
}

/** Preserve older manual values, but never display internal directory IDs. */
export function resolveFlightCatalogLabel(value: string | null | undefined, entries: readonly FlightCatalogEntry[] = []) {
  const entry = findFlightCatalogEntry(value, entries);
  if (entry) return entry.name_ar || entry.name;
  const text = value?.trim();
  return text && !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(text) ? text : undefined;
}

const storedDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const millisecondsPerDay = 86_400_000;

export function bookingDayCount(start: unknown, end: unknown, allowSameDay = false) {
  if (typeof start !== 'string' || typeof end !== 'string' || !storedDatePattern.test(start) || !storedDatePattern.test(end)) return null;
  const from = new Date(start);
  const to = new Date(end);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return null;
  if (from.toISOString().slice(0, 10) !== start || to.toISOString().slice(0, 10) !== end) return null;
  const days = (to.getTime() - from.getTime()) / millisecondsPerDay;
  if (!Number.isInteger(days) || days < 0 || (!allowSameDay && days === 0)) return null;
  return Math.max(days, 1);
}

export function optionalNonnegativeAmount(value: unknown) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function applyCalculatedBookingAmount(current: unknown, previous: number | null, next: number | null) {
  const currentAmount = optionalNonnegativeAmount(current);
  // Service fields can update an empty total or the last calculated total.
  // An explicitly edited shared total remains the price passed to accounting.
  if (currentAmount != null && (previous == null ? currentAmount > 0 : Math.abs(currentAmount - previous) >= 0.005)) return undefined;
  return next == null ? (previous == null ? undefined : 0) : Math.round(next * 100) / 100;
}
