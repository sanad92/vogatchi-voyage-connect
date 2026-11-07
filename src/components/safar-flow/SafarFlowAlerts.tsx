import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Bell, ExternalLink, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSafarFlowAlerts } from '@/hooks/useSafarFlowAlerts';

const fmt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
};
const kindLabel = (kind: string) =>
  kind === 'dead' ? 'فشل نهائي' : kind === 'overdue' ? 'تأخير تنفيذ' : 'تنبيه أتمتة';
const templateLabel = (template: string) =>
  template === 'supplier_confirmation' ? 'تأكيد المورد'
  : template === 'pretravel_checklist' ? 'مستندات ما قبل السفر' : 'مهمة تشغيل';

export function SafarFlowAlerts() {
  const { data, isLoading, isError, error, refetch, isFetching } = useSafarFlowAlerts();
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> تنبيهات Safar Flow
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            سجل إشعارات الأعطال والتأخير الخاصة بشركتك. لا توجد إجراءات تشغيل أو إعادة محاولة من هذه الشاشة.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل التنبيهات...</p>
        ) : isError ? (
          <div className="border border-destructive/30 rounded-md p-3 space-y-1" role="alert">
            <p className="text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> تعذر قراءة التنبيهات
            </p>
            <p className="text-xs text-muted-foreground">
              {(error as Error)?.message || 'قد تكون خدمة قاعدة البيانات غير متاحة'}
            </p>
            <p className="text-xs text-muted-foreground">
              تعذر التحميل لا يعني عدم وجود أعطال.
            </p>
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">إجمالي التنبيهات المسجلة</p>
                <p className="text-2xl font-semibold">{data.counts.total.toLocaleString('ar-EG')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">أعطال نهائية</p>
                <p className="text-2xl font-semibold">{data.counts.dead.toLocaleString('ar-EG')}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">تنبيهات تأخير</p>
                <p className="text-2xl font-semibold">{data.counts.overdue.toLocaleString('ar-EG')}</p>
              </div>
            </div>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد تنبيهات مسجلة في هذا القسم. ده مش دليل على تفعيل الجدولة.
              </p>
            ) : (
              <div className="space-y-2">
                {data.alerts.map(alert => (
                  <div key={alert.id} className="border rounded-md p-3 flex flex-wrap items-center gap-3">
                    {alert.alert_kind === 'dead'
                      ? <AlertOctagon className="h-5 w-5 text-destructive" />
                      : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    <div className="flex-1 min-w-[185px] space-y-1">
                      <p className="font-medium text-sm">{templateLabel(alert.template_key)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(alert.created_at)}</p>
                    </div>
                    <Badge variant={alert.alert_kind === 'dead' ? 'destructive' : 'outline'}>
                      {kindLabel(alert.alert_kind)}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/bookings/${alert.booking_id}/workspace`}>
                        <ExternalLink className="h-3.5 w-3.5 ml-1" /> الحجز
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              التنبيهات دي أحداث تاريخية مسجلة، ومش بالضرورة كلها أعطال ما زالت مفتوحة حاليًا.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
