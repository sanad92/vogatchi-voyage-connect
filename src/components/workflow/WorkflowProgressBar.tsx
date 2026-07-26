import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertTriangle, ListChecks } from 'lucide-react';
import { useWorkflowProgress } from '@/hooks/useWorkflowEngine';
import { STAGE_LABELS } from '@/lib/bookingWorkflow';

interface Props {
  bookingId: string;
}

const missingLabel: Record<string, string> = {
  invoice: 'فاتورة',
  customer_payment: 'دفعة عميل',
  voucher: 'فاوتشر',
};

const blockerLabel: Record<string, string> = {
  outstanding_balance: 'رصيد متأخر على العميل',
};

export const WorkflowProgressBar = ({ bookingId }: Props) => {
  const { data, isLoading } = useWorkflowProgress('booking', bookingId);
  if (isLoading || !data) return null;

  const currentLabel = STAGE_LABELS[data.current as keyof typeof STAGE_LABELS] ?? data.current;
  const prevLabel = data.previous ? STAGE_LABELS[data.previous as keyof typeof STAGE_LABELS] ?? data.previous : null;
  const nextLabel = data.next ? STAGE_LABELS[data.next as keyof typeof STAGE_LABELS] ?? data.next : null;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {prevLabel ? (
              <>
                <span className="text-muted-foreground">{prevLabel}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </>
            ) : null}
            <Badge className="text-sm">{currentLabel}</Badge>
            {nextLabel ? (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{nextLabel}</span>
              </>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.progress_pct}% — {data.stages.length} مراحل
          </div>
        </div>
        <Progress value={data.progress_pct} className="h-2" />
        {(data.missing.length > 0 || data.blockers.length > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {data.missing.map((m) => (
              <Badge key={m} variant="outline" className="gap-1">
                <ListChecks className="h-3 w-3" /> ناقص: {missingLabel[m] ?? m}
              </Badge>
            ))}
            {data.blockers.map((b) => (
              <Badge key={b} variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {blockerLabel[b] ?? b}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
