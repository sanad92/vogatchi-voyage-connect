import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MetricDef } from '@/config/modulePulse';

interface Props {
  metrics: MetricDef[];
  current: Record<string, number>;
  previous: Record<string, number>;
  loading?: boolean;
}

export const formatMetric = (value: number, format?: string) => {
  const safe = Number.isFinite(value) ? value : 0;
  if (format === 'currency') {
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(Math.round(safe));
  }
  if (format === 'percent') return `${safe}%`;
  if (format === 'hours') return `${safe} س`;
  return new Intl.NumberFormat('ar-EG').format(safe);
};

const readMetric = (def: MetricDef, source: Record<string, number>) => {
  const raw = def.derive ? def.derive(source) : source?.[def.key];
  return Number(raw ?? 0);
};

const ModuleKpiStrip = ({ metrics, current, previous, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {metrics.map((def) => {
        const value = readMetric(def, current);
        const prev = readMetric(def, previous);
        const diff = value - prev;
        const pct = prev !== 0 ? Math.round((diff / Math.abs(prev)) * 1000) / 10 : null;
        const good = def.goodDirection === 'down' ? diff < 0 : diff > 0;
        const TrendIcon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;

        const body = (
          <Card className="h-full transition-colors hover:border-primary/35">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{def.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {formatMetric(value, def.format)}
              </p>
              <div
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium',
                  diff === 0 ? 'text-muted-foreground' : good ? 'text-emerald-600' : 'text-destructive',
                )}
              >
                <TrendIcon className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  {diff === 0 ? 'بدون تغيير' : `${formatMetric(Math.abs(diff), def.format)}${pct !== null ? ` (${Math.abs(pct)}%)` : ''}`}
                </span>
                <span className="text-muted-foreground">مقابل الفترة السابقة</span>
              </div>
            </CardContent>
          </Card>
        );

        return def.href ? (
          <Link key={def.key} to={def.href} className="block h-full">
            {body}
          </Link>
        ) : (
          <div key={def.key} className="h-full">
            {body}
          </div>
        );
      })}
    </div>
  );
};

export default ModuleKpiStrip;
