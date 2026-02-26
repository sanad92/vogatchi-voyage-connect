import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, Calendar, DollarSign, Users, TrendingUp, AlertTriangle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
}

const accentStyles: Record<string, string> = {
  primary: 'from-primary/10 to-primary/5 text-primary',
  success: 'from-success/10 to-success/5 text-success',
  warning: 'from-warning/10 to-warning/5 text-warning',
  info: 'from-info/10 to-info/5 text-info',
  destructive: 'from-destructive/10 to-destructive/5 text-destructive',
};

const iconBg: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
};

const StatCard = ({ title, value, icon: Icon, trend, trendUp, accent }: StatCardProps) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium flex items-center gap-1",
              trendUp ? "text-success" : "text-destructive"
            )}>
              <TrendingUp className={cn("h-3 w-3", !trendUp && "rotate-180")} />
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", iconBg[accent])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface EnhancedStatsCardsProps {
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
  };
}

const EnhancedStatsCards = ({ realStats }: EnhancedStatsCardsProps) => {
  const cards: StatCardProps[] = [
    {
      title: 'إجمالي الحجوزات',
      value: realStats.totalBookings.toLocaleString(),
      icon: Calendar,
      trend: '+12% من الشهر السابق',
      trendUp: true,
      accent: 'primary',
    },
    {
      title: 'الإيرادات',
      value: `${(realStats.totalRevenue / 1000).toFixed(0)}k ج.م`,
      icon: DollarSign,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}%`,
      trendUp: realStats.monthlyGrowth >= 0,
      accent: 'success',
    },
    {
      title: 'العملاء النشطين',
      value: realStats.activeCustomers.toLocaleString(),
      icon: Users,
      trend: '+5 عملاء جدد',
      trendUp: true,
      accent: 'info',
    },
    {
      title: 'تنبيهات معلقة',
      value: '7',
      icon: AlertTriangle,
      trend: '3 عاجلة',
      trendUp: false,
      accent: 'warning',
    },
    {
      title: 'حجوزات الطيران',
      value: '24',
      icon: Plane,
      trend: '+8% هذا الأسبوع',
      trendUp: true,
      accent: 'primary',
    },
    {
      title: 'معدل النمو',
      value: `${realStats.monthlyGrowth.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'مقارنة بالشهر السابق',
      trendUp: realStats.monthlyGrowth >= 0,
      accent: realStats.monthlyGrowth >= 0 ? 'success' : 'destructive',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default EnhancedStatsCards;
