export interface BookingCreationRequest {
  id: string;
  fingerprint: string;
  storageKey: string;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export async function getBookingCreationRequest(
  orgId: string, userId: string, payload: unknown, previous: BookingCreationRequest | null,
): Promise<BookingCreationRequest> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(payload)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `booking-save:${orgId}:${userId}`;
  const fingerprint = `${storageKey}:${hash}`;
  if (previous?.fingerprint === fingerprint) return previous;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved?.fingerprint === fingerprint && typeof saved.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)) {
      return { id: saved.id, fingerprint, storageKey };
    }
  } catch { /* Storage may be unavailable; the mounted form still keeps its key. */ }
  const request = { id: crypto.randomUUID(), fingerprint, storageKey };
  try { sessionStorage.setItem(storageKey, JSON.stringify(request)); } catch { /* In-memory fallback. */ }
  return request;
}

export function finishBookingCreationRequest(request: BookingCreationRequest) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(request.storageKey) || 'null');
    if (saved?.id === request.id) sessionStorage.removeItem(request.storageKey);
  } catch { /* A successful save must not fail because local storage is blocked. */ }
}
