
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProfitAnalytics } from '@/hooks/useProfitAnalytics';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl" dir="rtl">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-primary">
        الإيرادات: <span className="font-bold">{payload[0]?.value?.toLocaleString()} ج.م</span>
      </p>
      {payload[1] && (
        <p className="text-sm text-green-600">
          الربح: <span className="font-bold">{payload[1]?.value?.toLocaleString()} ج.م</span>
        </p>
      )}
    </div>
  );
};

const RevenueChart = () => {
  const currentYear = new Date().getFullYear();
  const { monthlyProfits, isLoading } = useProfitAnalytics(`${currentYear}-01-01`, `${currentYear}-12-31`);

  const chartData = monthlyProfits.map(m => ({
    month: m.monthName,
    revenue: m.revenue,
    profit: m.profit,
  }));

  return (
    <Card className="col-span-full xl:col-span-2 shadow-md border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          الإيرادات الشهرية
        </CardTitle>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{currentYear}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGradientMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(231, 48%, 48%)" strokeWidth={2.5} fill="url(#revenueGradient)" dot={{ r: 4, fill: 'hsl(231, 48%, 48%)', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="profit" stroke="hsl(152, 60%, 42%)" strokeWidth={2} fill="url(#profitGradientMain)" dot={{ r: 3, fill: 'hsl(152, 60%, 42%)', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
