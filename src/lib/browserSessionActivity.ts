export const BROWSER_SESSION_INACTIVITY_MINUTES = 60;
const inactivityTimeoutMs = BROWSER_SESSION_INACTIVITY_MINUTES * 60 * 1000;
const activityWriteIntervalMs = 10 * 1000;
const storagePrefix = 'safarerp.session.activity.';
const fallbackActivity = new Map<string, string>();
const activityEvents = ['pointerdown', 'keydown', 'wheel'] as const;

interface SessionClaims {
  session_id?: unknown;
  amr?: unknown;
}

function readSessionClaims(accessToken: string): SessionClaims | null {
  try {
    const payload = atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    // These claims only coordinate the browser timer. Auth validates the token separately.
    return null;
  }
}

function activityKeyForSession(id: unknown): string | null {
  if (typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return storagePrefix + id;
  }
  return null;
}

export function getBrowserSessionActivityKey(accessToken: string): string | null {
  return activityKeyForSession(readSessionClaims(accessToken)?.session_id);
}

function readActivity(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? fallbackActivity.get(key);
  } catch {
    return fallbackActivity.get(key);
  }
}

function writeActivity(key: string, value: string) {
  fallbackActivity.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the timer working in this tab when browser storage is unavailable.
  }
}

export function startBrowserSessionActivity(accessToken: string): string | null {
  const claims = readSessionClaims(accessToken);
  const key = activityKeyForSession(claims?.session_id);
  if (!key || readActivity(key) !== undefined) return key;

  // A restored session may predate activity tracking. Use the authentication time
  // for that session so reloading or refreshing its token cannot grant a new hour.
  let authenticatedAt = 0;
  if (Array.isArray(claims?.amr)) {
    for (const entry of claims.amr) {
      if (typeof entry?.method === 'string' && entry.method !== 'token_refresh'
          && Number.isSafeInteger(entry.timestamp) && entry.timestamp > 0) {
        authenticatedAt = Math.max(authenticatedAt, entry.timestamp * 1000);
      }
    }
  }
  const now = Date.now();
  writeActivity(key, String(authenticatedAt > 0 ? Math.min(authenticatedAt, now) : now));
  return key;
}

export function closeBrowserSessionActivity(key: string) {
  writeActivity(key, 'closed');
}

export function browserSessionTimeRemaining(key: string, now = Date.now()): number {
  const stored = readActivity(key);
  if (stored === 'closed') return 0;
  const lastActivity = Number(stored);
  const elapsed = Number.isFinite(lastActivity) ? Math.max(now - lastActivity, 0) : 0;
  return Math.max(inactivityTimeoutMs - elapsed, 0);
}

export function watchBrowserSessionActivity(key: string, onExpired: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  let expired = false;

  const check = () => {
    clearTimeout(timer);
    if (expired) return;
    const remaining = browserSessionTimeRemaining(key);
    if (remaining === 0) {
      expired = true;
      onExpired();
      return;
    }
    timer = setTimeout(check, remaining);
  };

  const onActivity = (event: Event) => {
    if (!event.isTrusted || document.hidden || expired) return;
    const now = Date.now();
    // The first click after waking a device must not revive an expired session.
    if (browserSessionTimeRemaining(key, now) === 0) {
      check();
      return;
    }
    const lastActivity = Number(readActivity(key));
    if (!Number.isFinite(lastActivity) || now - lastActivity >= activityWriteIntervalMs) {
      writeActivity(key, String(now));
      check();
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) check();
  };

  for (const event of activityEvents) window.addEventListener(event, onActivity, { passive: true });
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', check);
  check();

  return () => {
    clearTimeout(timer);
    for (const event of activityEvents) window.removeEventListener(event, onActivity);
    window.removeEventListener('focus', check);
    window.removeEventListener('pageshow', check);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', check);
  };
}
