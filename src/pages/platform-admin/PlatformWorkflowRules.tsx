import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkflowRules, useToggleWorkflowRule, useWorkflowRuleRuns, useRetryWorkflowRuleRun } from '@/hooks/useWorkflowRules';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { RefreshCcw } from 'lucide-react';

const PlatformWorkflowRules = () => {
  const { data, isLoading } = useWorkflowRules();
  const toggle = useToggleWorkflowRule();
  const [inspectId, setInspectId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">قواعد سير العمل</h1>
        <p className="text-sm text-muted-foreground">إدارة القواعد اللامتزامنة التي يستمع لها Event Bus</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">القواعد</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>جاري التحميل…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحدث</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>نجاح</TableHead>
                  <TableHead>فشل</TableHead>
                  <TableHead>آخر تشغيل</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>نشط</TableHead>
                  <TableHead>عرض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell className="text-emerald-600">{r.success_count}</TableCell>
                    <TableCell className="text-destructive">{r.failure_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.last_run_at ? formatDistanceToNow(new Date(r.last_run_at), { addSuffix: true, locale: ar }) : '—'}
                    </TableCell>
                    <TableCell>{r.last_duration_ms != null ? `${r.last_duration_ms}ms` : '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setInspectId(r.id)}>سجل</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data || data.length === 0) && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد قواعد بعد.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!inspectId} onOpenChange={(o) => !o && setInspectId(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader><DialogTitle>سجل تنفيذ القاعدة</DialogTitle></DialogHeader>
          {inspectId && <RuleRuns ruleId={inspectId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const RuleRuns = ({ ruleId }: { ruleId: string }) => {
  const { data } = useWorkflowRuleRuns(ruleId);
  const retry = useRetryWorkflowRuleRun();
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">لا يوجد سجل تنفيذ بعد.</p>;
  return (
    <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
      {data.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm border rounded p-2">
          <Badge variant={r.status === 'succeeded' ? 'secondary' : 'destructive'}>{r.status}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(r.ran_at), { addSuffix: true, locale: ar })}
          </span>
          {r.duration_ms != null && <span className="text-xs">{r.duration_ms}ms</span>}
          {r.error && <span className="text-xs text-destructive truncate max-w-[280px]">{r.error}</span>}
          <div className="flex-1" />
          {r.event_id && (
            <Button
              size="sm"
              variant="ghost"
              disabled={retry.isPending}
              onClick={() => retry.mutate({ ruleId, eventId: r.event_id! })}
            >
              <RefreshCcw className="h-3.5 w-3.5 ml-1" /> إعادة
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlatformWorkflowRules;
