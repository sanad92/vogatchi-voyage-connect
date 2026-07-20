import { Play, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBookingAutomation, STEP_LABELS, type AutomationStep } from '@/hooks/useBookingAutomation';

interface Props {
  bookingId: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: any; icon: any; className?: string }> = {
    completed: { label: 'مكتمل', variant: 'default', icon: CheckCircle2, className: 'bg-green-600 hover:bg-green-600' },
    failed: { label: 'فشل', variant: 'destructive', icon: XCircle },
    pending: { label: 'قيد التنفيذ', variant: 'secondary', icon: Clock },
    skipped: { label: 'متجاوز', variant: 'outline', icon: AlertTriangle },
  };
  const it = map[s] || map.pending;
  const Icon = it.icon;
  return (
    <Badge variant={it.variant} className={it.className}>
      <Icon className="h-3 w-3 ml-1" /> {it.label}
    </Badge>
  );
};

export const AutomationCenter = ({ bookingId }: Props) => {
  const { run, steps, completed, failed, pending, isLoading, runAll, retryStep } = useBookingAutomation(bookingId);

  const totalSteps = steps.length || 6;
  const score = run?.completion_score ?? Math.round((completed / totalSteps) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">مركز أتمتة الحجز</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              الفواتير، أوامر دفع الموردين، الفاوتشر، والاقتراحات المرتبطة بهذا الحجز
            </p>
          </div>
          <Button size="sm" onClick={() => runAll.mutate()} disabled={runAll.isPending || !bookingId}>
            <Play className="h-4 w-4 ml-1" /> تشغيل الأتمتة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">نسبة الاكتمال</span>
              <span className="text-sm font-semibold">{score}%</span>
            </div>
            <Progress value={score} />
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> مكتمل: {completed}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> قيد التنفيذ: {pending}</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> فشل: {failed}</span>
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

          {!isLoading && steps.length === 0 && (
            <div className="text-center py-8 border rounded-md">
              <p className="text-sm text-muted-foreground mb-3">لم يتم تشغيل الأتمتة بعد لهذا الحجز</p>
              <Button size="sm" variant="outline" onClick={() => runAll.mutate()} disabled={runAll.isPending}>
                <Play className="h-4 w-4 ml-1" /> تشغيل الآن
              </Button>
            </div>
          )}

          {steps.length > 0 && (
            <div className="divide-y border rounded-md">
              {steps.map((s: AutomationStep) => (
                <div key={s.id} className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{STEP_LABELS[s.step_key] || s.step_key}</span>
                      {statusBadge(s.status)}
                      {s.attempts > 1 && (
                        <span className="text-xs text-muted-foreground">محاولات: {s.attempts}</span>
                      )}
                    </div>
                    {s.error_message && (
                      <p className="text-xs text-destructive mt-1">{s.error_message}</p>
                    )}
                    {s.last_attempt_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        آخر تشغيل: {new Date(s.last_attempt_at).toLocaleString('ar-EG')}
                      </p>
                    )}
                  </div>
                  {(s.status === 'failed' || s.status === 'skipped') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryStep.mutate(s.id)}
                      disabled={retryStep.isPending}
                    >
                      <RefreshCw className="h-3 w-3 ml-1" /> إعادة
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
