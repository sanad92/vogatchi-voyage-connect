
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAutomationRules, useAutomationLogs, TRIGGER_LABELS, type TriggerType } from '@/hooks/useAutomationRules';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CRMAutomation = () => {
  const { rules } = useAutomationRules();
  const { data: logs = [] } = useAutomationLogs();
  const navigate = useNavigate();

  const activeRules = rules.filter(r => r.is_active).length;
  const completedLogs = (logs as any[]).filter((l: any) => l.status === 'completed').length;
  const failedLogs = (logs as any[]).filter((l: any) => l.status === 'failed').length;
  const recentLogs = (logs as any[]).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          نظام الأتمتة
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate('/automation')}>
          إدارة القواعد
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{activeRules}</div>
            <div className="text-xs text-muted-foreground">قواعد نشطة</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-emerald-600">{completedLogs}</div>
            <div className="text-xs text-muted-foreground">تنفيذ ناجح</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-destructive">{failedLogs}</div>
            <div className="text-xs text-muted-foreground">فشل</div>
          </div>
        </div>

        {/* Recent Logs */}
        {recentLogs.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">آخر التنفيذات</h4>
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div className="flex items-center gap-2">
                  {log.status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span className="truncate max-w-[200px]">
                    {TRIGGER_LABELS[log.trigger_type as TriggerType] || log.trigger_type}
                  </span>
                </div>
                <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                  {log.status === 'completed' ? 'ناجح' : log.status === 'failed' ? 'فشل' : 'قيد التنفيذ'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد تنفيذات بعد</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CRMAutomation;
