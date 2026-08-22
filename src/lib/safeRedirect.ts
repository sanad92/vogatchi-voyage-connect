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

