import { useDomainEventsForAggregate } from '@/hooks/useEventBus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  aggregateId: string;
  title?: string;
}

export const BusinessTimeline = ({ aggregateId, title = 'السجل الزمني الموحد' }: Props) => {
  const { data, isLoading } = useDomainEventsForAggregate(aggregateId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>
        ) : (
          <ol className="relative border-r pr-4 space-y-3">
            {data.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -right-[7px] top-2 h-3 w-3 rounded-full bg-primary/70" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true, locale: ar })}
                  </span>
                </div>
                {e.enriched_payload && Object.keys(e.enriched_payload).length ? (
                  <pre className="mt-1 text-[11px] bg-muted/30 rounded p-2 overflow-x-auto max-h-24">
                    {JSON.stringify(e.enriched_payload, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
