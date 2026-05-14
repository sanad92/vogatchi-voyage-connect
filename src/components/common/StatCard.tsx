import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** number = % delta, e.g. +12.4 */
  delta?: number;
  /** displayed beside delta, e.g. "vs last month" */
  deltaLabel?: string;
  /** value uses monospace font for numeric clarity */
  numeric?: boolean;
  className?: string;
}

const toneRing: Record<Tone, string> = {
  default: 'text-muted-foreground bg-muted/50 border-border',
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  danger:  'text-destructive bg-destructive/10 border-destructive/20',
  info:    'text-info bg-info/10 border-info/20',
};

/**
 * Unified KPI card. Replaces the 5+ stat-card variants scattered around the app.
 * Linear-style: muted label, large numeric value (mono), optional delta arrow.
 */
const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  delta,
  deltaLabel,
  numeric = true,
  className,
}: StatCardProps) => {
  const DeltaIcon = delta == null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor =
    delta == null ? '' : delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className={cn('surface-card hover-lift', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                'mt-2 text-2xl font-semibold tracking-tight text-foreground truncate',
                numeric && 'font-mono',
              )}
            >
              {value}
            </p>
            {(hint || delta != null) && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {DeltaIcon && (
                  <span className={cn('inline-flex items-center gap-1 font-medium', deltaColor)}>
                    <DeltaIcon className="h-3 w-3" />
                    {Math.abs(delta!).toFixed(1)}%
                  </span>
                )}
                {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
                {hint && !delta && <span className="text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', toneRing[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
