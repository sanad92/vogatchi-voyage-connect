
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProfitAnalytics } from '@/hooks/useProfitAnalytics';

const CustomTooltip = ({ active, payload, label, currency = 'EGP' }: { active?: boolean; payload?: Array<{value?: number}>; label?: string; currency?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl" dir="rtl">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-primary">
        الإيرادات: <span className="font-bold">{payload[0]?.value?.toLocaleString()} {currency}</span>
      </p>
      {payload[1] && (
        <p className="text-sm text-green-600">
          صافي المساهمة: <span className="font-bold">{payload[1]?.value?.toLocaleString()} {currency}</span>
        </p>
      )}
    </div>
  );
};

const RevenueChart = ({ currency = 'EGP' }: { currency?: string }) => {
  const currentYear = new Date().getFullYear();
  const { monthlyProfits, isLoading } = useProfitAnalytics(`${currentYear}-01-01`, new Date().toISOString().slice(0, 10), currency);

  const chartData = monthlyProfits.map(m => ({
    month: m.monthName,
    revenue: m.revenue,
    profit: m.profit,
  }));

  return (
    <Card className="col-span-full xl:col-span-2 border-border/60 shadow-none rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          الإيرادات الشهرية ({currency})
        </CardTitle>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{currentYear}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[300px] sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
