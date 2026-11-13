import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Banknote, Building2, CalendarClock, CreditCard, LifeBuoy,
  RefreshCw, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { cn } from '@/lib/utils';
import {
  loadPendingTransfers, loadPlatformCollections, loadPlatformCompanies,
  loadPlatformGrowth, loadPlatformSubscriptions, loadSupportBacklog, loadUpcomingRenewals,
} from '@/lib/platformOverview';

const PLAN_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
const PANEL = 'min-w-0 rounded-2xl border border-border bg-card shadow-sm';
const LINK_ARROW = 'h-3.5 w-3.5 shrink-0 ltr:rotate-180';

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1.5 rounded text-sm font-semibold text-primary hover:underline">
      {children}<ArrowLeft className={LINK_ARROW} aria-hidden="true" />
    </Link>
  );
}

function PanelHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function LoadState({ query, empty, children }: {
  query: { isPending: boolean; isError: boolean; data: unknown; refetch: () => unknown };
  empty?: string;
  children: ReactNode;
}) {
  if (query.isPending) return <Skeleton className="h-24 w-full rounded-xl" aria-label="جارٍ تحميل البيانات" />;
  if (query.isError && !query.data) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        <span>تعذّر تحميل البيانات</span>
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }
  if (empty) return <p className="rounded-xl bg-muted/50 px-4 py-5 text-sm text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}

function Metric({ icon: Icon, label, value, detail, tone, to, loading }: {
  icon: LucideIcon;
  label: string;
  value?: string;
  detail?: ReactNode;
  tone: string;
  to: string;
  loading: boolean;
}) {
  return (
    <Link to={to} className={cn(PANEL, 'group block p-4 transition-colors hover:border-primary/35 sm:p-5')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tone)}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <ArrowLeft className={cn(LINK_ARROW, 'text-muted-foreground transition-colors group-hover:text-primary')} aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium leading-snug text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-12" aria-label="جارٍ تحميل البيانات" /> : (
        <p className="mt-1 text-3xl font-bold tabular-nums">{value ?? <span aria-label="تعذّر تحميل البيانات">—</span>}</p>
      )}
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </Link>
  );
}

function QueueLink({ icon: Icon, label, detail, count, to, tone }: {
  icon: LucideIcon;
  label: string;
  detail: ReactNode;
  count?: string;
  to: string;
  tone: string;
}) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/35 hover:bg-muted/40">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tone)}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="text-lg font-bold tabular-nums">{count ?? '—'}</span>
      <ArrowLeft className={cn(LINK_ARROW, 'text-muted-foreground')} aria-hidden="true" />
    </Link>
  );
}

function PlatformAdminDashboard() {
  const { language, dir, t } = useLanguage();
  const { user } = useOptimizedAuth();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#platform-follow-up') document.getElementById('platform-follow-up')?.focus();
  }, [hash]);
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  const formatNumber = new Intl.NumberFormat(locale);
  const number = (value: number | undefined) => value === undefined ? undefined : formatNumber.format(value);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(value));
  const month = (value: number) => new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(value);
  const money = (amount: number) => amount.toLocaleString(locale, { maximumFractionDigits: 2 });
  const [months, setMonths] = useState(6);

  const key = ['platform-overview', user?.id];
  const queryOptions = { staleTime: 60_000, refetchOnMount: 'always' } as const;
  const companies = useQuery({ ...queryOptions, queryKey: [...key, 'companies'], queryFn: ({ signal }) => loadPlatformCompanies(signal) });
  const subscriptions = useQuery({ ...queryOptions, queryKey: [...key, 'subscriptions'], queryFn: ({ signal }) => loadPlatformSubscriptions(signal) });
  const transfers = useQuery({ ...queryOptions, queryKey: [...key, 'transfers'], queryFn: ({ signal }) => loadPendingTransfers(signal) });
  const renewals = useQuery({ ...queryOptions, queryKey: [...key, 'renewals'], queryFn: ({ signal }) => loadUpcomingRenewals(signal) });
  const support = useQuery({ ...queryOptions, queryKey: [...key, 'support'], queryFn: ({ signal }) => loadSupportBacklog(signal) });
  const growth = useQuery({ ...queryOptions, queryKey: [...key, 'growth', months], queryFn: ({ signal }) => loadPlatformGrowth(months, signal) });
  const collections = useQuery({ ...queryOptions, queryKey: [...key, 'collections'], queryFn: ({ signal }) => loadPlatformCollections(signal) });
  const queries = [companies, subscriptions, transfers, renewals, support, growth, collections];
  const refreshing = queries.some((query) => query.isFetching);
  const hasErrors = queries.some((query) => query.isError);
  const refresh = () => Promise.all(queries.map((query) => query.refetch()));
  const currencyName = (currency: string) => currency || t('عملة غير محددة');
  const planName = (ar: string | null | undefined, en: string | null | undefined) =>
    (language === 'ar' ? ar || en : en || ar) || t('خطة غير محددة');
  const plans = subscriptions.data?.plans ?? [];
  const currentSubscriptions = (subscriptions.data?.active ?? 0) + (subscriptions.data?.trialing ?? 0);
  const growthData = growth.data?.periods.map((period) => ({ ...period, label: month(period.start) })) ?? [];

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7" dir={dir}>
      <div className="relative isolate overflow-hidden rounded-2xl bg-sidebar px-5 py-6 text-sidebar-foreground sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--sidebar-primary)/0.22),transparent_62%)]" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">نظرة عامة على المنصة</h1>
            <p className="mt-2 text-sm leading-relaxed text-sidebar-foreground/75">تابع نمو الشركات والاشتراكات والطلبات التي تحتاج إلى إجراء.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={refreshing}
            className="gap-2 border-white/20 bg-white/10 text-sidebar-foreground hover:bg-white/20 hover:text-sidebar-foreground">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'motion-safe:animate-spin')} aria-hidden="true" />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {hasErrors && (
        <p role="status" className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          تعذّر تحديث بعض المؤشرات. قد تعرض الأقسام المتأثرة آخر بيانات متاحة.
        </p>
      )}

      <section aria-label="مؤشرات المنصة" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Metric icon={Building2} label="إجمالي الشركات" value={number(companies.data?.total)} to="/platform/organizations"
          loading={companies.isPending} tone="bg-primary/10 text-primary"
          detail={companies.data && <><bdi>{number(companies.data.active)}</bdi> <span>شركة نشطة</span></>} />
        <Metric icon={CreditCard} label="الاشتراكات النشطة" value={number(subscriptions.data?.active)} to="/platform/subscriptions"
          loading={subscriptions.isPending} tone="bg-success/10 text-success" />
        <Metric icon={CalendarClock} label="الاشتراكات التجريبية" value={number(subscriptions.data?.trialing)} to="/platform/subscriptions"
          loading={subscriptions.isPending} tone="bg-info/10 text-info" />
        <Metric icon={Users} label="عضويات الشركات" value={number(companies.data?.memberships)} to="/platform/organizations"
          loading={companies.isPending} tone="bg-warning/15 text-foreground" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section id="platform-follow-up" tabIndex={-1} aria-label="يحتاج إلى متابعة" className={cn(PANEL, 'scroll-mt-20 xl:col-start-2 xl:row-start-1')}>
          <PanelHeading title="يحتاج إلى متابعة" />
          <div className="grid gap-2.5 p-5 sm:px-6">
            <QueueLink icon={Banknote} label="تحويلات بنكية معلّقة" detail="طلبات دفع بانتظار المراجعة"
              count={number(transfers.data?.count)} to="/platform/transfers" tone="bg-warning/15 text-foreground" />
            <QueueLink icon={CalendarClock} label="اشتراكات تنتهي قريبًا" detail="اشتراكات وتجارب خلال ٧ أيام"
              count={number(renewals.data?.count)} to="/platform/subscriptions?view=renewals" tone="bg-info/10 text-info" />
            <QueueLink icon={LifeBuoy} label="تذاكر دعم مفتوحة" count={number(support.data?.open)} to="/platform/support"
              detail={support.data
                ? <><bdi>{number(support.data.overdue)}</bdi> <span>تجاوزت وقت أول رد</span></>
                : 'متابعة وقت أول رد'}
              tone="bg-success/10 text-success" />
          </div>
        </section>
        <section className={cn(PANEL, 'xl:col-start-1 xl:row-start-1')}>
          <PanelHeading title="نمو الشركات" description="الشركات المسجلة في كل شهر">
            <div role="group" aria-label="فترة نمو الشركات" className="flex rounded-lg bg-muted p-0.5">
              {[3, 6, 12].map((period) => (
                <button key={period} type="button" aria-pressed={months === period} onClick={() => setMonths(period)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', months === period ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {number(period)} <span>أشهر</span>
                </button>
              ))}
            </div>
          </PanelHeading>
          <div className="px-5 pb-5 pt-4 sm:px-6">
            <LoadState query={growth} empty={growth.data?.total === 0 ? 'لا توجد تسجيلات في هذه الفترة.' : undefined}>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
                <strong className="text-xl tabular-nums">{number(growth.data?.total)}</strong>
                <span className="text-xs text-muted-foreground">شركة جديدة خلال الفترة</span>
              </div>
              <div dir="ltr" className="h-48 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={growthData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={14} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickFormatter={formatNumber.format} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => [formatNumber.format(value), t('شركات جديدة')]}
                      contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '10px' }} />
                    <Bar dataKey="count" fill="hsl(var(--sidebar-primary))" maxBarSize={42} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="sr-only">
                {growthData.map((point) => <li key={point.start}>{point.label} <bdi>{number(point.count)}</bdi></li>)}
              </ul>
            </LoadState>
          </div>
        </section>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={PANEL}>
          <PanelHeading title="الاشتراكات والتجارب التي تنتهي قريبًا" description="أقرب مواعيد الانتهاء خلال ٧ أيام">
            <SectionLink to="/platform/subscriptions?view=renewals">متابعة التجديد</SectionLink>
          </PanelHeading>
          <div className="p-5 sm:px-6">
            <LoadState query={renewals} empty={renewals.data?.rows.length === 0 ? 'لا توجد اشتراكات تنتهي خلال ٧ أيام.' : undefined}>
              <ul className="divide-y divide-border">
                {renewals.data?.rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold"><bdi data-no-translate>{row.organizations?.name || t('شركة غير معروفة')}</bdi></p>
                      <p className="mt-1 truncate text-xs text-muted-foreground"><bdi data-no-translate>{planName(row.subscription_plans?.name_ar, row.subscription_plans?.name)}</bdi></p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
                      <Badge variant="secondary">{row.status === 'trialing' ? 'تجريبي' : 'نشط'}</Badge>
                      {row.expires_at && <time dateTime={row.expires_at} className="text-muted-foreground">{date(row.expires_at)}</time>}
                    </div>
                  </li>
                ))}
              </ul>
            </LoadState>
          </div>
        </section>
        <section className={PANEL}>
          <PanelHeading title="التحويلات بانتظار المراجعة" description="أقدم الطلبات المعلّقة">
            <SectionLink to="/platform/transfers">مراجعة التحويلات</SectionLink>
          </PanelHeading>
          <div className="p-5 sm:px-6">
            <LoadState query={transfers} empty={transfers.data?.rows.length === 0 ? 'لا توجد تحويلات معلّقة.' : undefined}>
              <ul className="divide-y divide-border">
                {transfers.data?.rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold"><bdi data-no-translate>{row.organizations?.name || t('شركة غير معروفة')}</bdi></p>
                      {row.created_at && <time dateTime={row.created_at} className="mt-1 block text-xs text-muted-foreground">{date(row.created_at)}</time>}
                    </div>
                    <bdi className="shrink-0 text-sm font-semibold tabular-nums">{money(row.amount)} {currencyName(row.currency.trim().toUpperCase())}</bdi>
                  </li>
                ))}
              </ul>
            </LoadState>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <section className={PANEL}>
          <PanelHeading title="التحويلات البنكية المعتمدة" description="حسب تاريخ اعتماد التحويل وبكل عملة على حدة" />
          <div className="p-5 sm:px-6">
            <LoadState query={collections} empty={collections.data?.length === 0 ? 'لا توجد تحويلات معتمدة في الشهر الحالي أو السابق.' : undefined}>
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2 text-start font-medium">العملة</th>
                    <th scope="col" className="pb-2 text-end font-medium">هذا الشهر</th>
                    <th scope="col" className="pb-2 text-end font-medium">الشهر السابق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border tabular-nums">
                  {collections.data?.map(({ currency, current, previous }) => (
                    <tr key={currency}>
                      <th scope="row" className="py-2.5 text-start font-semibold"><bdi>{currencyName(currency)}</bdi></th>
                      <td className="py-2.5 text-end font-semibold"><bdi>{money(current)}</bdi></td>
                      <td className="py-2.5 text-end text-muted-foreground"><bdi>{money(previous)}</bdi></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LoadState>
          </div>
        </section>

        <section className={PANEL}>
          <PanelHeading title="توزيع خطط الاشتراك" description="الاشتراكات النشطة والتجارب الحالية" />
          <div className="p-5 sm:px-6">
            <LoadState query={subscriptions} empty={plans.length === 0 ? 'لا توجد اشتراكات أو تجارب حالية.' : undefined}>
              <ul className="space-y-3">
                {plans.map((plan, index) => (
                  <li key={plan.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <bdi data-no-translate className="min-w-0 truncate">{planName(plan.nameAr, plan.name)}</bdi>
                      <bdi className="font-semibold tabular-nums">{number(plan.count)}</bdi>
                    </div>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full', PLAN_COLORS[index % PLAN_COLORS.length])}
                        style={{ width: `${plan.count / currentSubscriptions * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </LoadState>
          </div>
        </section>

        <section className={PANEL}>
          <PanelHeading title="أحدث الشركات">
            <SectionLink to="/platform/organizations">إدارة الشركات</SectionLink>
          </PanelHeading>
          <div className="p-5 sm:px-6">
            <LoadState query={companies} empty={companies.data?.latest?.length === 0 ? 'لا توجد شركات مسجلة.' : undefined}>
              <ul className="divide-y divide-border">
                {companies.data?.latest?.map((company) => (
                  <li key={company.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <p className="min-w-0 truncate text-sm font-semibold"><bdi data-no-translate>{company.name}</bdi></p>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
                      <Badge variant="outline" className={company.is_active ? 'border-success/30 text-success' : undefined}>
                        {company.is_active ? 'نشطة' : 'غير نشطة'}
                      </Badge>
                      {company.created_at && <time dateTime={company.created_at} className="text-muted-foreground">{date(company.created_at)}</time>}
                    </div>
                  </li>
                ))}
              </ul>
            </LoadState>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PlatformAdminDashboard;
