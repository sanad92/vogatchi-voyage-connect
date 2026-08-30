import { ArrowLeftRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { FlowDef } from '@/config/modulePulse';
import { formatMetric } from './ModuleKpiStrip';

interface Props {
  flow: FlowDef;
  receives: string;
  delivers: string;
  current: Record<string, number>;
}

const ModuleFlowCard = ({ flow, receives, delivers, current }: Props) => (
  <Card className="overflow-hidden border-primary/15 bg-gradient-to-l from-primary/[0.08] via-card to-card">
    <CardContent className="p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-xl border bg-background/75 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">يستلم — {receives}</p>
          <p className="text-2xl font-bold tabular-nums">{formatMetric(Number(current?.[flow.inKey] ?? 0))}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{flow.inLabel}</p>
        </div>
        <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full border bg-background text-primary">
          <ArrowLeftRight className="h-4 w-4" />
        </div>
        <div className="rounded-xl border bg-background/75 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">يسلّم — {delivers}</p>
          <p className="text-2xl font-bold tabular-nums">{formatMetric(Number(current?.[flow.outKey] ?? 0))}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{flow.outLabel}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ModuleFlowCard;
