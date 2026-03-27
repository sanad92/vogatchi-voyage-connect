
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Trophy, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyProfit, ProfitSummary } from '@/hooks/useProfitAnalytics';

interface ProfitOverviewTabProps {
  monthlyProfits: MonthlyProfit[];
  summary: ProfitSummary;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl" dir="rtl">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-primary">الإيرادات: <span className="font-bold">{payload[0]?.value?.toLocaleString()} ج.م</span></p>
      {payload[1] && <p className="text-sm text-green-600">الربح: <span className="font-bold">{payload[1]?.value?.toLocaleString()} ج.م</span></p>}
    </div>
  );
};

const ProfitOverviewTab = ({ monthlyProfits, summary }: ProfitOverviewTabProps) => {
  const chartData = monthlyProfits.map(m => ({
    month: m.monthName,
    revenue: m.revenue,
    profit: m.profit,
  }));

  return (
    <div className="space-y-6">
      {/* Monthly Chart */}
      <Card className="shadow-md border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><TrendingUp className="h-4 w-4 text-primary" /></div>
            الإيرادات والأرباح الشهرية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(231, 48%, 48%)" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: 'hsl(231, 48%, 48%)', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="profit" stroke="hsl(152, 60%, 42%)" strokeWidth={2} fill="url(#profitGrad)" dot={{ r: 3, fill: 'hsl(152, 60%, 42%)', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Employee & Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-md border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> أفضل موظف
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topEmployee ? (
              <div>
                <p className="text-lg font-bold text-foreground">{summary.topEmployee.name}</p>
                <p className="text-sm text-muted-foreground">ربح: {summary.topEmployee.profit.toLocaleString()} ج.م</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}
          </CardContent>
        </Card>
        <Card className="shadow-md border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> أفضل عميل
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topCustomer ? (
              <div>
                <p className="text-lg font-bold text-foreground">{summary.topCustomer.name}</p>
                <p className="text-sm text-muted-foreground">ربح: {summary.topCustomer.profit.toLocaleString()} ج.م</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitOverviewTab;
