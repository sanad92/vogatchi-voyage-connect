import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpLeft, Banknote, CalendarClock, CreditCard, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TablePager, paginate } from '@/components/platform-admin/TablePager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { allRows } from '@/lib/pagedRows';
import { billingFollowupPath, companyProfilePath } from '@/lib/platformCompanyFollowup';

const filters = [
  { key: 'renewal', label: 'تنتهي خلال ٧ أيام', icon: CalendarClock },
  { key: 'transfer', label: 'تحويلات بانتظار المراجعة', icon: Banknote },
  { key: 'activation', label: 'دفعات مؤكدة بانتظار التفعيل', icon: CreditCard },
] as const;

export default function PlatformBillingFollowup() {
  const { language, dir } = useLanguage();
  const { user } = useOptimizedAuth();
  const [params] = useSearchParams();
  const filter = filters.find(({ key }) => key === params.get('kind'))?.key ?? 'renewal';
  const [pagination, setPagination] = useState({ filter, page: 1 });
  const page = pagination.filter === filter ? pagination.page : 1;
  const queue = useQuery({
    queryKey: ['platform-billing-followup', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: ({ signal }) => allRows((from, to) => supabase.rpc('platform_billing_followup')
      .order('kind').order('event_at').order('id').range(from, to).abortSignal(signal)),
  });
  const rows = (queue.data ?? []).filter((row) => row.kind === filter);
  const pager = paginate(rows, page);
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8" dir={dir}>
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-sidebar px-5 py-6 text-sidebar-foreground">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">متابعة التجديد والتحصيل</h1>
          <p className="text-sm text-sidebar-foreground/80">تابع مواعيد الانتهاء والمدفوعات وافتح ملف الشركة من كل حالة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/platform/subscriptions">إدارة الاشتراكات</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => queue.refetch()} disabled={queue.isFetching}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> تحديث
          </Button>
        </div>
      </header>

      <nav aria-label="حالات التجديد والتحصيل" className="grid gap-3 sm:grid-cols-3">
        {filters.map(({ key, label, icon: Icon }) => (
          <Link key={key} to={`${billingFollowupPath}?kind=${key}`} onClick={() => setPagination({ filter: key, page: 1 })}
            aria-current={filter === key ? 'page' : undefined}
            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-sm font-medium hover:border-primary ${filter === key ? 'border-primary bg-primary/10 text-primary' : 'bg-card'}`}>
            <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}</span>
            {queue.data && <Badge variant="secondary"><bdi>{number.format(queue.data.filter((row) => row.kind === key).length)}</bdi></Badge>}
          </Link>
        ))}
      </nav>

      <Card>
        <CardContent className="p-4 sm:p-5">
          {queue.isPending ? <p role="status">جارٍ تحميل البيانات</p> : queue.isError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
              <p>تعذّر تحميل متابعة التجديد والتحصيل</p>
              <Button variant="outline" size="sm" onClick={() => queue.refetch()}>إعادة المحاولة</Button>
            </div>
          ) : !rows.length ? <p className="py-4 text-sm text-muted-foreground">لا توجد حالات تحتاج متابعة هنا.</p> : (
            <ul className="divide-y divide-border">
              {pager.pageRows.map((row) => {
                const plan = language === 'ar' ? row.plan_name_ar || row.plan_name : row.plan_name || row.plan_name_ar;
                return (
                  <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-1.5">
                      <Link to={companyProfilePath(row.organization_id)} className="break-words font-semibold text-primary hover:underline" data-no-translate>{row.company_name}</Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {plan && <bdi data-no-translate>{plan}</bdi>}
                        {filter === 'renewal' && <Badge variant="outline">{row.status === 'trialing' ? 'تجريبي' : 'نشط'}</Badge>}
                        {row.event_at && <time dateTime={row.event_at}>{date.format(new Date(row.event_at))}</time>}
                        {row.amount !== null && <bdi data-no-translate>{number.format(row.amount)} {row.currency}</bdi>}
                        {row.reference && <bdi className="break-all" data-no-translate>{row.reference}</bdi>}
                      </div>
                    </div>
                    {filter === 'transfer' && <Button asChild variant="outline" size="sm"><Link to={`/platform/transfers?request=${encodeURIComponent(row.id)}`}>
                      مراجعة التحويل <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
                    </Link></Button>}
                  </li>
                );
              })}
            </ul>
          )}
          <TablePager page={pager.current} pageCount={pager.pageCount} total={rows.length} onChange={(next) => setPagination({ filter, page: next })} />
        </CardContent>
      </Card>
    </div>
  );
}
