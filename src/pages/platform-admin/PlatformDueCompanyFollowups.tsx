import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TablePager, paginate } from '@/components/platform-admin/TablePager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { allRows } from '@/lib/pagedRows';
import { companyProfilePath, contactChannels, contactOutcomes } from '@/lib/platformCompanyFollowup';

export default function PlatformDueCompanyFollowups() {
  const { user } = useOptimizedAuth();
  const { language } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [page, setPage] = useState(1);
  const due = useQuery({
    queryKey: ['platform-company-due', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: ({ signal }) => allRows((from, to) => supabase.rpc('platform_due_company_followups')
      .order('next_followup_at').order('organization_id').range(from, to).abortSignal(signal)),
  });
  const rows = due.data ?? [];
  const overdue = rows.filter((row) => row.overdue);
  const today = rows.filter((row) => !row.overdue);
  const shown = filter === 'today' ? today : filter === 'overdue' ? overdue : rows;
  const pager = paginate(shown, page);
  const date = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeZone: 'Africa/Cairo' });
  const options = [
    { key: 'all', label: 'الكل', count: rows.length },
    { key: 'today', label: 'اليوم', count: today.length },
    { key: 'overdue', label: 'المتأخرات', count: overdue.length },
  ] as const;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sidebar px-5 py-6 text-sidebar-foreground">
        <h1 className="text-2xl font-bold">متابعات اليوم والمتأخرات</h1>
        <Button asChild variant="secondary" size="sm"><Link to="/platform/organizations">كل الشركات</Link></Button>
      </header>
      <div className="flex flex-wrap gap-2">
        {options.map(({ key, label, count }) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" aria-pressed={filter === key}
            onClick={() => { setFilter(key); setPage(1); }}>
            <span>{label}</span>{due.isSuccess && <bdi>{count.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}</bdi>}
          </Button>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          {due.isPending ? <p role="status">جارٍ تحميل البيانات</p> : due.isError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
              <p>تعذّر تحميل المتابعات</p><Button variant="outline" size="sm" onClick={() => due.refetch()}>إعادة المحاولة</Button>
            </div>
          ) : !shown.length ? <p className="text-sm text-muted-foreground">لا توجد متابعات مستحقة هنا.</p> : (
            <ul className="divide-y divide-border">
              {pager.pageRows.map((row) => (
                <li key={row.organization_id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={companyProfilePath(row.organization_id)} className="break-words font-semibold text-primary hover:underline" data-no-translate>{row.company_name}</Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.overdue ? 'destructive' : 'secondary'}>{row.overdue ? 'متأخرة' : 'اليوم'}</Badge>
                      <time className="text-xs text-muted-foreground" dateTime={row.next_followup_at}>{date.format(new Date(`${row.next_followup_at}T12:00:00Z`))}</time>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {row.assigned_name ? <bdi data-no-translate>{row.assigned_name}</bdi> : <span>بدون مسؤول</span>}
                    {row.last_outcome && <span>{contactOutcomes[row.last_outcome as keyof typeof contactOutcomes]}</span>}
                    {row.last_channel && <span>{contactChannels[row.last_channel as keyof typeof contactChannels]}</span>}
                    {row.last_recorded_at && <time dateTime={row.last_recorded_at}>{date.format(new Date(row.last_recorded_at))}</time>}
                  </div>
                  {row.note && <p className="whitespace-pre-wrap break-words text-sm" data-no-translate>{row.note}</p>}
                </li>
              ))}
            </ul>
          )}
          <TablePager page={pager.current} pageCount={pager.pageCount} total={shown.length} onChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
