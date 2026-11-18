const inactivityTimeoutMs = 60 * 60 * 1000;
const activityWriteIntervalMs = 10 * 1000;
const storagePrefix = 'safarerp.session.activity.';
const fallbackActivity = new Map<string, string>();
const activityEvents = ['pointerdown', 'keydown', 'wheel'] as const;

export function getBrowserSessionActivityKey(accessToken: string): string | null {
  try {
    const payload = atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const { session_id: id } = JSON.parse(payload);
    if (typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      return storagePrefix + id;
    }
  } catch {
    // This identifier only coordinates the browser timer. Auth validates the token separately.
  }
  return null;
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

export function startBrowserSessionActivity(key: string) {
  if (readActivity(key) === undefined) writeActivity(key, String(Date.now()));
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
