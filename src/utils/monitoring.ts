import { supabase } from '@/integrations/supabase/client';
import { setApiReporter } from '@/lib/monitoringFetch';

const applicationRoutes = new Set([
  'dashboard', 'team', 'customers', 'suppliers', 'quotes', 'invoices', 'bookings',
  'hotel-bookings', 'flight-bookings', 'transport-bookings', 'payments', 'subscription',
  'organization', 'monitoring', 'reports', 'whatsapp', 'pilgrimage', 'login', 'signup',
]);
const platformRoutes = new Set([
  'login', 'organizations', 'subscriptions', 'plans', 'transfers', 'finance',
  'accounts', 'audit', 'event-bus', 'analytics', 'settings', 'database', 'support',
  'global-data', 'monitoring', 'act-as', 'workflow-rules',
]);
const errorNames = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'AggregateError']);
const navigationPath = location.pathname;
let sampledNavigation = false;
let loggedEvents = 0;
let reportedWriteFailure = false;
const recentEvents = new Map<string, number>();

function routeLabel(pathname: string) {
  const [, first, second] = pathname.split('/');
  if (!first) return '/';
  if (first === 'platform') return platformRoutes.has(second) ? '/platform/' + second : '/platform';
  return applicationRoutes.has(first) ? '/' + first : '/other';
}

function allowEvent(key: string) {
  const now = Date.now();
  if (loggedEvents >= 40 || now - (recentEvents.get(key) ?? 0) < 60_000) return false;
  recentEvents.set(key, now);
  loggedEvents += 1;
  return true;
}

function reportWriteFailure(error: unknown) {
  if (!reportedWriteFailure) {
    reportedWriteFailure = true;
    console.warn('Operational telemetry could not be saved.', error);
  }
}

export function startMonitoring(organizationId: string | null, userId: string) {
  const context = { organization_id: organizationId, user_id: userId };
  const reportError = (source: string, error: unknown) => {
    const name = error instanceof Error && errorNames.has(error.name) ? error.name : 'Error';
    const route = routeLabel(location.pathname);
    if (!allowEvent(['error', source, name, route].join(':'))) return;
    void supabase.from('error_logs').insert({
      ...context, error_type: 'client', severity: 'error', component_name: source, error_message: name, url: route,
    }).then(({ error: failure }) => { if (failure) reportWriteFailure(failure.code); }, reportWriteFailure);
  };
  const onError = (event: ErrorEvent) => reportError('window', event.error);
  const onRejection = (event: PromiseRejectionEvent) => reportError('promise', event.reason);
  const onRenderError = (event: Event) => reportError('react', (event as CustomEvent<Error>).detail);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('safar:render-error', onRenderError);

  setApiReporter(({ functionName, method, status, durationMs }) => {
    if (!allowEvent(['api', functionName, method, status].join(':'))) return;
    void supabase.from('api_logs').insert({
      ...context, function_name: functionName, method, status_code: status, response_time_ms: durationMs,
    }).then(({ error }) => { if (error) reportWriteFailure(error.code); }, reportWriteFailure);
  });

  const recordNavigation = () => {
    if (sampledNavigation) return;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!navigation || navigation.loadEventEnd <= 0) return;
    sampledNavigation = true;
    const fcp = performance.getEntriesByName('first-contentful-paint', 'paint')[0];
    void supabase.from('performance_logs').insert({
      ...context,
      page_url: routeLabel(navigationPath),
      load_time_ms: Math.round(navigation.loadEventEnd - navigation.startTime),
      ttfb_ms: Math.round(navigation.responseStart - navigation.requestStart),
      fcp_ms: fcp ? Math.round(fcp.startTime) : null,
    }).then(({ error }) => { if (error) reportWriteFailure(error.code); }, reportWriteFailure);
  };
  let timer: number | undefined;
  const afterLoad = () => { timer = window.setTimeout(recordNavigation, 0); };
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('safar:render-error', onRenderError);
    window.removeEventListener('load', afterLoad);
    window.clearTimeout(timer);
    setApiReporter(null);
  };
}
