import { LucideIcon, Calendar, DollarSign, Users, TrendingUp, AlertTriangle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  gradient: string;
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp, gradient }: StatCardProps) => (
  <div className={cn(
    "rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5",
    gradient
  )}>
    <div className="flex items-start justify-between">
      <div className="space-y-2 min-w-0 flex-1">
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</p>
        {trend && (
          <p className={cn(
            "text-xs font-medium flex items-center gap-1",
            trendUp ? "text-white/90" : "text-white/70"
          )}>
            <TrendingUp className={cn("h-3 w-3", !trendUp && "rotate-180")} />
            {trend}
          </p>
        )}
      </div>
      <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
    </div>
  </div>
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
      gradient: 'bg-gradient-to-br from-[hsl(231,48%,48%)] to-[hsl(231,48%,35%)]',
    },
    {
      title: 'الإيرادات',
      value: `${(realStats.totalRevenue / 1000).toFixed(0)}k ج.م`,
      icon: DollarSign,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}%`,
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: 'bg-gradient-to-br from-[hsl(160,60%,45%)] to-[hsl(160,60%,32%)]',
    },
    {
      title: 'العملاء النشطين',
      value: realStats.activeCustomers.toLocaleString(),
      icon: Users,
      trend: '+5 عملاء جدد',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(205,85%,50%)] to-[hsl(205,85%,38%)]',
    },
    {
      title: 'تنبيهات معلقة',
      value: '7',
      icon: AlertTriangle,
      trend: '3 عاجلة',
      trendUp: false,
      gradient: 'bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(38,92%,38%)]',
    },
    {
      title: 'حجوزات الطيران',
      value: '24',
      icon: Plane,
      trend: '+8% هذا الأسبوع',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(270,50%,55%)] to-[hsl(270,50%,42%)]',
    },
    {
      title: 'معدل النمو',
      value: `${realStats.monthlyGrowth.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'مقارنة بالشهر السابق',
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: realStats.monthlyGrowth >= 0
        ? 'bg-gradient-to-br from-[hsl(160,60%,45%)] to-[hsl(160,60%,32%)]'
        : 'bg-gradient-to-br from-[hsl(0,84%,60%)] to-[hsl(0,84%,45%)]',
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
