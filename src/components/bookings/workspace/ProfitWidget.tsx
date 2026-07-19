import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const ProfitWidget = ({ workspace }: Props) => {
  const f = workspace.financials;
  const margin = f.selling > 0 ? (f.profit / f.selling) * 100 : 0;
  const positive = f.profit >= 0;
  const health = !positive ? 'loss' : margin < 8 ? 'thin' : 'healthy';
  const dotColor =
    health === 'healthy' ? 'bg-emerald-500' : health === 'thin' ? 'bg-amber-500' : 'bg-destructive';
  const paidPct = f.invoiced > 0 ? Math.min(100, (f.paid / f.invoiced) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {positive ? (
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          مؤشر الربح
          <span className={`h-2 w-2 rounded-full ${dotColor} mr-1`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className={`text-2xl font-bold ${positive ? 'text-emerald-600' : 'text-destructive'}`}>
            {Math.round(f.profit).toLocaleString()} <span className="text-sm font-normal">{f.currency}</span>
          </p>
          <p className="text-xs text-muted-foreground">هامش {margin.toFixed(1)}%</p>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>محصّل من العميل</span>
            <span>{paidPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
