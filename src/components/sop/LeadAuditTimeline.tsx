import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useLeadAuditRealtime, useLeadAuditTimeline } from '@/hooks/useLeadAudit';
import { actionLabel, AUDIT_ACTION_TONE, formatDateTime, formatDuration } from '@/lib/leadAudit';

interface Props {
  leadId?: string | null;
  title?: string;
  compact?: boolean;
}

/** Reusable audit timeline: milestone, exact time, actor, and time spent in the previous step. */
export const LeadAuditTimeline = ({ leadId, title = 'مسار العميل — التوقيتات', compact }: Props) => {
  useLeadAuditRealtime();
  const { data, isLoading } = useLeadAuditTimeline(leadId);

  if (!leadId) return null;

  const items = data || [];

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد أحداث مسجلة لهذا الملف.</p>
        ) : (
          <ol className="relative border-r-2 border-border pr-5 space-y-3">
            {items.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -right-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-current ${
                    AUDIT_ACTION_TONE[e.action] || 'text-muted-foreground'
                  }`}
                />
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{actionLabel(e.action)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(e.occurred_at)}
                      {e.actor_name ? ` · ${e.actor_name}` : ''}
                    </p>
                    {!compact && e.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">السبب: {e.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {e.is_reconstructed && (
                      <Badge variant="outline" className="text-[10px]">مُستنتج</Badge>
                    )}
                    <Badge variant={e.is_open ? 'secondary' : 'outline'} className="text-[10px] whitespace-nowrap">
                      {e.is_open ? `مستمر منذ ${formatDuration(e.duration_minutes)}` : formatDuration(e.duration_minutes)}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadAuditTimeline;
