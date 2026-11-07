import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpLeft, BellRing, Clock3, RefreshCcw, UserRoundX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSafarFlowFollowups } from '@/hooks/useSafarFlowFollowups';

const fmtDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? 'موعد غير صالح' : date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Existing quote-followup health, surfaced in Safar Flow Studio.
 * Data comes from the current organization only. No execution controls.
 */
export const SafarFlowLiveFollowups = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useSafarFlowFollowups();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="w-4 h-4" /> متابعة عروض الأسعار الحالية
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            قراءة فعلية من نظام المتابعات الموجود — الإشعارات داخلية وليست رسائل واتساب تلقائية.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل حالة المتابعات...</p>
        ) : isError ? (
          <div role="alert" className="p-3 rounded-lg border border-destructive/30 space-y-2">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> تعذر قراءة متابعات الشركة الحالية.
            </p>
            <p className="text-xs text-muted-foreground">
              {(error as Error)?.message || 'قد تكون قاعدة البيانات غير متاحة أو تحتاج صلاحية.'}
            </p>
            <p className="text-xs text-muted-foreground">عدم ظهور البيانات لا يعني عدم وجود متابعات.</p>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { title: 'مستحقة ولم تُبلّغ', value: data.due, icon: Clock3 },
                { title: 'مجدولة للمستقبل', value: data.upcoming, icon: BellRing },
                { title: 'تم إخطار الموظف', value: data.notified, icon: BellRing },
                { title: 'بدون مسؤول', value: data.unassigned, icon: UserRoundX },
              ] as const).map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="h-4 w-4" /> {stat.title}</div>
                    <div className="font-bold text-2xl mt-1">{stat.value}</div>
                  </div>
                );
              })}
            </div>
            {(data.due > 0 || data.unassigned > 0) && (
              <div className="rounded-md border border-amber-500/40 p-3 text-xs text-amber-700 dark:text-amber-400">
                توجد متابعات تحتاج مراجعة. العدادات لا تثبت وحدها أن مهمة الجدولة مفعّلة أو متوقفة.
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">أقرب 12 متابعة مفتوحة</p>
              {!data.items.length ? (
                <p className="text-xs text-muted-foreground">لا توجد متابعات مفتوحة ضمن الشركة المحددة.</p>
              ) : data.items.map(f => (
                <div key={f.id} className="rounded-md border p-3 flex flex-wrap gap-2 items-center text-sm">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span>المتابعة {f.step}</span>
                      <Badge variant={f.status === 'notified' ? 'secondary' : 'outline'}>
                        {f.status === 'notified' ? 'أُخطر الموظف' : 'مجدولة'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{fmtDate(f.due_at)}</p>
                    {!f.owner_user_id && <p className="text-xs text-amber-700">لا يوجد موظف مسؤول</p>}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/quotes/${f.quote_id}`}>
                      <ArrowUpLeft className="h-3.5 w-3.5 ml-1" /> فتح العرض
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              المتابعات المغلقة والردود القديمة غير داخلة في العدادات؛ كل متابعة مرتبطة بالشركة الحالية فقط.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
