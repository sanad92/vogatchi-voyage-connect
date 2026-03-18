import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

type RevenuePoint = {
  month: string;
  revenue: number;
  bookings: number;
};

interface RevenueChartProps {
  data?: RevenuePoint[];
  yearLabel?: string;
}

const fallbackData: RevenuePoint[] = Array.from({ length: 12 }).map((_, index) => ({
  month: new Date(new Date().getFullYear(), index, 1).toLocaleString('ar-EG', { month: 'short' }),
  revenue: 0,
  bookings: 0,
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl" dir="rtl">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-primary">
        {'\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a'}:{' '}
        <span className="font-bold">{payload[0]?.value?.toLocaleString('ar-EG')} {'\u062c.\u0645'}</span>
      </p>
      {payload[1] && (
        <p className="text-sm text-success">
          {'\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}: <span className="font-bold">{payload[1]?.value}</span>
        </p>
      )}
    </div>
  );
};

const RevenueChart = ({ data = fallbackData, yearLabel }: RevenueChartProps) => {
  const resolvedYear = yearLabel || new Date().getFullYear().toString();

  return (
    <Card className="col-span-full xl:col-span-2 shadow-md border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          {'\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a \u0627\u0644\u0634\u0647\u0631\u064a\u0629'}
        </CardTitle>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{resolvedYear}</span>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(231, 48%, 48%)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={{ r: 4, fill: 'hsl(231, 48%, 48%)', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(231, 48%, 48%)', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
