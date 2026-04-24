import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TodayOverviewProps {
  todayBookings?: number;
  weekBookings?: number;
  newCustomers?: number;
}

const TodayOverview = ({ todayBookings = 0, weekBookings = 0, newCustomers = 0 }: TodayOverviewProps) => {
  const items = [
    { label: 'حجوزات اليوم', value: todayBookings, icon: Calendar },
    { label: 'حجوزات الأسبوع', value: weekBookings, icon: TrendingUp },
    { label: 'عملاء جدد اليوم', value: newCustomers, icon: Users },
  ];

  return (
    <Card className="border-border/60 shadow-none rounded-2xl h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold text-foreground">نشاط اليوم</CardTitle>
        <Link to="/customer-service">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
            عرض الكل
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-border/40 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {item.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TodayOverview;
