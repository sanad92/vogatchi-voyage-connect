import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ListChecks,
  Wallet,
  MessageCircle,
  ArrowRightCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import type { Workspace } from './types';
import type { TimelineEvent } from '@/hooks/useBookingWorkspace';

type Filter = 'all' | 'stage' | 'task' | 'finance' | 'whatsapp';

const filterFor = (e: TimelineEvent): Filter[] => {
  const k = (e.kind || '').toLowerCase();
  const arr: Filter[] = ['all'];
  if (k.includes('stage')) arr.push('stage');
  if (k.includes('task')) arr.push('task');
  if (k.includes('invoice') || k.includes('payment') || k.includes('financ')) arr.push('finance');
  if (k.includes('whatsapp') || k.includes('message')) arr.push('whatsapp');
  return arr;
};

const iconFor = (e: TimelineEvent) => {
  const k = (e.kind || '').toLowerCase();
  if (k.includes('stage')) return <ArrowRightCircle className="h-4 w-4 text-primary" />;
  if (k.includes('task')) return <ListChecks className="h-4 w-4 text-emerald-600" />;
  if (k.includes('payment') || k.includes('invoice')) return <Wallet className="h-4 w-4 text-blue-600" />;
  if (k.includes('whatsapp') || k.includes('message')) return <MessageCircle className="h-4 w-4 text-emerald-600" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
};

interface Props {
  workspace: Workspace;
}

export const TimelineTab = ({ workspace }: Props) => {
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(
    () => workspace.timeline.filter((e) => filterFor(e).includes(filter)),
    [workspace.timeline, filter],
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'stage', label: 'المراحل' },
    { key: 'task', label: 'المهام' },
    { key: 'finance', label: 'مالي' },
    { key: 'whatsapp', label: 'واتساب' },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> السجل الزمني
        </CardTitle>
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد أحداث.</p>
        ) : (
          <ol className="relative border-r border-border pr-6 space-y-4">
            {items.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -right-[33px] top-0.5 h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                  {iconFor(e)}
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{e.summary || e.kind}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true, locale: arSA })}
                      {e.actor_label && ` · ${e.actor_label}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                    {e.kind}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
