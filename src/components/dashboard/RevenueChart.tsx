import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';

const monthlyData = [
  { month: 'يناير', revenue: 45000, bookings: 12 },
  { month: 'فبراير', revenue: 52000, bookings: 18 },
  { month: 'مارس', revenue: 61000, bookings: 22 },
  { month: 'أبريل', revenue: 58000, bookings: 19 },
  { month: 'مايو', revenue: 72000, bookings: 28 },
  { month: 'يونيو', revenue: 85000, bookings: 35 },
  { month: 'يوليو', revenue: 94000, bookings: 40 },
  { month: 'أغسطس', revenue: 102000, bookings: 45 },
  { month: 'سبتمبر', revenue: 88000, bookings: 32 },
  { month: 'أكتوبر', revenue: 76000, bookings: 26 },
  { month: 'نوفمبر', revenue: 92000, bookings: 38 },
  { month: 'ديسمبر', revenue: 115000, bookings: 48 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl" dir="rtl">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      <p className="text-sm text-primary">
        الإيرادات: <span className="font-bold">{payload[0]?.value?.toLocaleString()} ج.م</span>
      </p>
      {payload[1] && (
        <p className="text-sm text-success">
          الحجوزات: <span className="font-bold">{payload[1]?.value}</span>
        </p>
      )}
    </div>
  );
};

const RevenueChart = () => {
  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          الإيرادات الشهرية
        </CardTitle>
        <span className="text-xs text-muted-foreground">2026</span>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(231, 48%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
