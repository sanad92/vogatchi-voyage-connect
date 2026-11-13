import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isMissingNotificationOrganization, notificationOrganizationMissingLabel, useEventBusStats, useEventDeliveries } from '@/hooks/useEventBus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
});
const timeWindow = 24 * 60 * 60 * 1000;

function useTelemetrySummary() {
  return useQuery({
    queryKey: ['platform-telemetry-summary'],
    queryFn: async ({ signal }) => {
      const since = new Date(Date.now() - timeWindow).toISOString();
      const [errors, unresolved, performance, calls, failedCalls, recentErrors, recentApiFailures] = await Promise.all([
        supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since).abortSignal(signal),
        supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('resolved', false).abortSignal(signal),
        supabase.from('performance_logs').select('load_time_ms').gte('created_at', since).not('load_time_ms', 'is', null)
          .order('created_at', { ascending: false }).limit(100).abortSignal(signal),
        supabase.from('api_logs').select('id', { count: 'exact', head: true }).gte('created_at', since).abortSignal(signal),
        supabase.from('api_logs').select('id', { count: 'exact', head: true }).gte('created_at', since)
          .or('status_code.gte.400,status_code.is.null').abortSignal(signal),
        supabase.from('error_logs').select('id,component_name,created_at').gte('created_at', since)
          .order('created_at', { ascending: false }).limit(5).abortSignal(signal),
        supabase.from('api_logs').select('id,function_name,status_code,created_at').gte('created_at', since)
          .or('status_code.gte.400,status_code.is.null').order('created_at', { ascending: false }).limit(5).abortSignal(signal),
      ]);
      for (const result of [errors, unresolved, performance, calls, failedCalls, recentErrors, recentApiFailures]) {
        if (result.error) throw result.error;
      }
      const samples = (performance.data ?? []).flatMap(row => row.load_time_ms === null ? [] : [row.load_time_ms]);
      return {
        errors: errors.count ?? 0,
        unresolved: unresolved.count ?? 0,
        performanceSamples: samples.length,
        averageMs: samples.length ? Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length) : null,
        calls: calls.count ?? 0,
        failedCalls: failedCalls.count ?? 0,
        recentErrors: recentErrors.data ?? [],
        recentApiFailures: recentApiFailures.data ?? [],
      };
    },
    refetchInterval: 60_000,
  });
}

export default function PlatformMonitoringDashboard() {
  const queue = useEventBusStats();
  const stopped = useEventDeliveries('dead', 10);
  const telemetry = useTelemetrySummary();
  const metrics = queue.data;
  const samples = telemetry.data;

  const refresh = () => {
    void Promise.all([queue.refetch(), stopped.refetch(), telemetry.refetch()]);
  };

  return (
    <section className="mx-auto space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Activity className="h-6 w-6 text-primary" aria-hidden="true" /> مراقبة المنصة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">طوابير الأحداث وقياسات التشغيل الواردة من الجلسات المسجّلة.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={queue.isFetching || stopped.isFetching || telemetry.isFetching}>
          <RefreshCw className="ms-0 me-2 h-4 w-4" aria-hidden="true" /> تحديث
        </Button>
      </header>

      <Card>
        <CardHeader><CardTitle>طابور الأحداث</CardTitle></CardHeader>
        <CardContent>
          {queue.isError ? <p role="alert">تعذّر تحميل مؤشرات الطابور.</p>
            : !metrics ? <p role="status">جارٍ تحميل مؤشرات الطابور...</p>
            : <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">أحداث آخر ٢٤ ساعة</dt><dd className="text-2xl font-semibold">{metrics.events_24h}</dd></div>
              <div className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">في الانتظار</dt><dd className="text-2xl font-semibold">{metrics.pending}</dd></div>
              <div className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground"><Link className="underline underline-offset-4" to="/platform/event-bus?tab=failed">عمليات فاشلة قابلة لإعادة المحاولة</Link></dt>
                <dd className="text-2xl font-semibold">{metrics.failed}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground"><Link className="underline underline-offset-4" to="/platform/event-bus?tab=dead">عمليات متوقفة بعد استنفاد المحاولات</Link></dt>
                <dd className="text-2xl font-semibold">{metrics.dead}</dd>
              </div>
            </dl>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>أحدث العمليات المتوقفة</CardTitle>
          <Link className="text-sm text-primary underline underline-offset-4" to="/platform/event-bus?tab=dead">عرض قائمة العمليات المتوقفة</Link>
        </CardHeader>
        <CardContent>
          {stopped.isError ? <p role="alert">تعذّر تحميل العمليات المتوقفة.</p>
            : stopped.isPending ? <p role="status">جارٍ تحميل العمليات المتوقفة...</p>
            : !stopped.data.length ? <p className="text-muted-foreground">لا توجد عمليات متوقفة في الطابور.</p>
            : <ul className="divide-y">
              {stopped.data.map(delivery => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0" key={delivery.id}>
                  <div className="min-w-0">
                    <bdi className="block break-all font-medium" data-no-translate>{delivery.handler_key}</bdi>
                    {isMissingNotificationOrganization(delivery) && <p className="text-sm text-muted-foreground">{notificationOrganizationMissingLabel}</p>}
                    <p className="text-sm text-muted-foreground">
                      <time dateTime={delivery.updated_at}>{dateFormat.format(new Date(delivery.updated_at))}</time>
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm"><Link to={`/platform/event-bus/${delivery.event_id}`}>تفاصيل العملية</Link></Button>
                </li>
              ))}
            </ul>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قياسات التشغيل خلال آخر ٢٤ ساعة</CardTitle>
          <p className="text-sm text-muted-foreground">الأرقام مبنية على عينات من الجلسات المسجّلة.</p>
        </CardHeader>
        <CardContent>
          {telemetry.isError ? <p role="alert">تعذّر تحميل قياسات التشغيل.</p>
            : !samples ? <p role="status">جارٍ تحميل القياسات...</p>
            : <dl className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="font-medium">أخطاء التطبيق</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {samples.errors > 0
                    ? <><span className="text-lg font-semibold text-foreground">{samples.errors}</span> خطأ مسجّل، منها {samples.unresolved} غير محلول</>
                    : samples.calls || samples.performanceSamples ? 'لم تُسجّل أخطاء خلال فترة القياس.' : 'لم تصل بيانات أخطاء خلال الفترة.'}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="font-medium">أداء تحميل الصفحات</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {samples.averageMs !== null
                    ? <><span className="text-lg font-semibold text-foreground">{samples.averageMs} ms</span> متوسط أحدث {samples.performanceSamples} عينة</>
                    : 'لم تصل قياسات تحميل خلال الفترة.'}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="font-medium">طلبات Edge Functions</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {samples.calls > 0
                    ? <><span className="text-lg font-semibold text-foreground">{samples.calls}</span> عينة، منها {samples.failedCalls} فاشلة</>
                    : 'لم تصل عينات طلبات خلال الفترة.'}
                </dd>
              </div>
            </dl>}
          {samples && !telemetry.isError && (samples.recentErrors.length > 0 || samples.recentApiFailures.length > 0) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {samples.recentErrors.length > 0 && <div className="min-w-0 rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">أحدث أخطاء التطبيق</h3>
                <ul className="divide-y text-sm">
                  {samples.recentErrors.map(error => (
                    <li className="flex flex-wrap justify-between gap-2 py-2" key={error.id}>
                      <bdi className="break-all" data-no-translate>{error.component_name ?? '—'}</bdi>
                      <time className="text-muted-foreground" dateTime={error.created_at}>{dateFormat.format(new Date(error.created_at))}</time>
                    </li>
                  ))}
                </ul>
              </div>}
              {samples.recentApiFailures.length > 0 && <div className="min-w-0 rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-medium">أحدث طلبات Edge Functions الفاشلة</h3>
                <ul className="divide-y text-sm">
                  {samples.recentApiFailures.map(call => (
                    <li className="flex flex-wrap justify-between gap-2 py-2" key={call.id}>
                      <bdi className="break-all" data-no-translate>{call.function_name}</bdi>
                      <span>{call.status_code ?? 'تعذّر الاتصال'}</span>
                      <time className="text-muted-foreground" dateTime={call.created_at}>{dateFormat.format(new Date(call.created_at))}</time>
                    </li>
                  ))}
                </ul>
              </div>}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
