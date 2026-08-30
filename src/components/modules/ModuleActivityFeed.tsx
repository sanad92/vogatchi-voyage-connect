import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PulseActivity } from '@/hooks/useModulePulse';

interface Props {
  activity: PulseActivity[];
  moduleId?: string;
  title?: string;
  limit?: number;
}

const relative = (iso: string) => {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(diffMin)) return '';
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
};

const ModuleActivityFeed = ({ activity, moduleId, title = 'آخر الأحداث', limit = 10 }: Props) => {
  const items = (activity || [])
    .filter((a) => (moduleId ? a.module === moduleId : true))
    .slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد أحداث حديثة.</p>
        ) : (
          items.map((item, i) => (
            <div key={`${item.ref ?? 'x'}-${i}`} className="flex items-start gap-3 rounded-lg border bg-background/60 p-3">
              <Badge variant="outline" className="shrink-0 text-[10px]">{item.type}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.actor && <p className="truncate text-xs text-muted-foreground">{item.actor}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{relative(item.at)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleActivityFeed;
