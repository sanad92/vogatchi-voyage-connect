const recoveryKey = 'safar:asset-recovery';
const retryWindowMs = 60_000;
const assetLoadError = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading chunk .+ failed/i;

export const installPageAssetRecovery = () => {
  window.addEventListener('vite:preloadError', event => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (!navigator.onLine || !(payload instanceof Error) || !assetLoadError.test(payload.message)) return;

    try {
      const previousAttempt = sessionStorage.getItem(recoveryKey);
      const now = Date.now();
      if (previousAttempt && now - Number(previousAttempt) < retryWindowMs) return;
      sessionStorage.setItem(recoveryKey, String(now));
    } catch {
      // Without a persistent retry guard, let the error boundary handle the failure.
      return;
    }

    event.preventDefault();
    window.location.reload();
  });
};
