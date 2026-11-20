/**
 * Accept only same-origin, absolute-path redirects. This keeps invitation and
 * post-auth navigation working without introducing an open-redirect vector.
 */
export function getSafeInternalRedirect(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  try {
    const base = new URL('https://vogantra.local');
    const target = new URL(value, base);
    if (target.origin !== base.origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}


/** Retain the requested page when a company session requires sign-in. */
export function getCompanyLoginPath(location: { pathname: string; search: string; hash: string }): string {
  const target = getSafeInternalRedirect(location.pathname + location.search + location.hash);
  return target ? `/login?${new URLSearchParams({ redirect: target })}` : '/login';
}

const SUBSCRIPTION_PLAN_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Only resume subscription checkout after company creation. */
export function getSubscriptionCheckoutContinuation(value: string | null | undefined): string | null {
  const path = getSafeInternalRedirect(value);
  if (!path) return null;
  const target = new URL(path, 'https://safarerp.com');
  const plan = target.searchParams.get('plan');
  if (target.pathname !== '/payment' || !plan || !SUBSCRIPTION_PLAN_ID.test(plan)) return null;
  const billing = target.searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  return `/payment?${new URLSearchParams({ plan, billing })}`;
}
