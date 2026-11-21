const storageKey = 'safar:custom-plan-inquiry:pending';
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const digestPattern = /^[0-9a-f]{64}$/;

type PendingAttempt = { fingerprint: string; id: string };

function storedAttempts(): PendingAttempt[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((item): item is PendingAttempt =>
      item && typeof item.fingerprint === 'string' && digestPattern.test(item.fingerprint) &&
      typeof item.id === 'string' && uuid.test(item.id),
    ).map(({ fingerprint, id }) => ({ fingerprint, id }));
  } catch {
    return [];
  }
}

function saveAttempts(attempts: PendingAttempt[]) {
  try {
    if (attempts.length) {
      sessionStorage.setItem(storageKey, JSON.stringify(attempts));
    } else {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Storage is optional. The current form still keeps its request IDs in memory.
  }
}

export async function getCustomPlanInquiryRequestId(payload: string, attempts: Map<string, string>) {
  let fingerprint: string;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    // Without a digest, keep the retry key in memory only.
    const id = attempts.get(payload) ?? crypto.randomUUID();
    attempts.set(payload, id);
    return id;
  }

  const inMemory = attempts.get(fingerprint);
  if (inMemory) return inMemory;

  const pending = storedAttempts();
  const previous = pending.find(item => item.fingerprint === fingerprint);
  const id = previous?.id ?? crypto.randomUUID();
  if (!previous) saveAttempts([...pending, { fingerprint, id }]);
  attempts.set(fingerprint, id);
  return id;
}

export function finishCustomPlanInquiryRequest(id: string, attempts: Map<string, string>) {
  for (const [key, requestId] of attempts) {
    if (requestId === id) attempts.delete(key);
  }
  saveAttempts(storedAttempts().filter(item => item.id !== id));
}
