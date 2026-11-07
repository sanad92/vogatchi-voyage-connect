import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Clock3, ExternalLink, RefreshCcw, RotateCcw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSafarFlowJobHealth, type SafarFlowJobStatus, type SafarFlowJobTemplate } from '@/hooks/useSafarFlowJobHealth';

const statusLabels: Record<SafarFlowJobStatus, string> = {
  scheduled: 'مجدولة',
  retrying: 'إعادة محاولة',
  succeeded: 'نجحت',
  skipped: 'تجاوزها المحرك',
  dead: 'فشلت نهائيًا',
  cancelled: 'ملغاة',
};
const templateLabels: Record<SafarFlowJobTemplate, string> = {
  supplier_confirmation: 'متابعة تأكيد المورد',
  pretravel_checklist: 'مراجعة ما قبل السفر',
};
const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
};

export function SafarFlowQueueHealth() {
  const { data, isLoading, isError, error, refetch, isFetching } = useSafarFlowJobHealth();
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> مراقبة تنفيذ Safar Flow
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            المهام الداخلية حسب الشركة الحالية. عرض فقط، ولا يسمح بتنفيذ أو إعادة تشغيل مهمة.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل سجل الأتمتة...</p>
        ) : isError ? (
          <div role="alert" className="border border-destructive/30 rounded-lg p-3 space-y-2">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> تعذر قراءة سجل تنفيذ Safar Flow.
            </p>
            <p className="text-xs text-muted-foreground">{(error as Error)?.message || 'خدمة المراقبة غير متاحة'}</p>
            <p className="text-xs text-muted-foreground">
              غياب السجل هنا لا يعني أن المهام مكتملة أو أن الجدولة مفعّلة.
            </p>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'scheduled', label: 'مجدولة', icon: Clock3 },
                { key: 'retrying', label: 'إعادة محاولة', icon: RotateCcw },
                { key: 'succeeded', label: 'نجحت', icon: CheckCircle2 },
                { key: 'dead', label: 'فشلت نهائيًا', icon: ShieldAlert },
              ].map(item => {
                const Icon = item.icon;
                const value = data.counts[item.key as SafarFlowJobStatus] ?? 0;
                return (
                  <div key={item.key} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground flex gap-2 items-center">
                      <Icon className="h-4 w-4" /> {item.label}
                    </p>
                    <p className="text-2xl font-semibold mt-1">{value.toLocaleString('ar-EG')}</p>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>إجمالي السجلات: {data.counts.all ?? 0}</span>
              <span>مستحقة الآن: {data.counts.due ?? 0}</span>
              <span>تجاوزها المحرك: {data.counts.skipped ?? 0}</span>
              <span>آخر تحديث: {formatDate(data.generated_at)}</span>
            </div>
            {(data.counts.dead > 0 || data.counts.due > 0) && (
              <div className="border border-amber-500/40 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400">
                توجد مهام متأخرة أو فشلت نهائيًا. يحتاج الأمر مراجعة المسؤول؛ لا توجد إعادة تشغيل من واجهة المشترك.
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">آخر {data.jobs.length} مهمة (من الشركة الحالية)</p>
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مهام مسجلة، أو لم يتم تفعيل المحرك بعد.</p>
              ) : data.jobs.map(job => (
                <div key={job.id} className="rounded-md border p-3 flex flex-wrap gap-3 items-center text-sm">
                  <div className="flex-1 min-w-[195px] space-y-1">
                    <p className="font-medium">{templateLabels[job.template_key] || 'مهمة تشغيل'}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabels[job.status] || job.status} · محاولة {job.attempts} من {job.max_attempts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.status === 'scheduled' || job.status === 'retrying'
                        ? 'الموعد المحدد: ' + formatDate(job.available_at)
                        : 'آخر تحديث: ' + formatDate(job.updated_at)}
                    </p>
                  </div>
                  <Badge variant={job.status === 'dead' ? 'destructive' : job.status === 'succeeded' ? 'secondary' : 'outline'}>
                    {statusLabels[job.status] || job.status}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/bookings/${job.booking_id}/workspace`}>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" /> الحجز
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              لا تُعرض رسائل الخطأ الداخلية أو بيانات العملاء هنا. ظهور المهام لا يعني أن الـCron يعمل حاليًا.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
