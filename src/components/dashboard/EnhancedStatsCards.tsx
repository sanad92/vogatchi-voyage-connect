import { LucideIcon, Calendar, DollarSign, Users, TrendingUp, AlertTriangle, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  gradient: string;
  iconBg: string;
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp, gradient, iconBg }: StatCardProps) => (
  <div className={cn(
    "rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
    gradient
  )}>
    {/* Decorative circle */}
    <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/5" />
    
    <div className="relative flex items-start justify-between">
      <div className="space-y-3 min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85 tracking-wide">{title}</p>
        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums drop-shadow-sm">{value}</p>
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
            trendUp ? "bg-white/20 text-white" : "bg-black/15 text-white/80"
          )}>
            <TrendingUp className={cn("h-3 w-3", !trendUp && "rotate-180")} />
            {trend}
          </div>
        )}
      </div>
      <div className={cn("p-3.5 rounded-2xl shadow-lg", iconBg)}>
        <Icon className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-sm" />
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
    netProfit?: number;
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
      gradient: 'bg-gradient-to-br from-[hsl(231,65%,52%)] via-[hsl(240,55%,45%)] to-[hsl(250,60%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'الإيرادات',
      value: `${(realStats.totalRevenue / 1000).toFixed(0)}k ج.م`,
      icon: DollarSign,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}%`,
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: 'bg-gradient-to-br from-[hsl(152,60%,42%)] via-[hsl(160,55%,38%)] to-[hsl(170,50%,28%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'العملاء النشطين',
      value: realStats.activeCustomers.toLocaleString(),
      icon: Users,
      trend: '+5 عملاء جدد',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(200,90%,48%)] via-[hsl(210,80%,42%)] to-[hsl(220,70%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'تنبيهات معلقة',
      value: '7',
      icon: AlertTriangle,
      trend: '3 عاجلة',
      trendUp: false,
      gradient: 'bg-gradient-to-br from-[hsl(30,95%,52%)] via-[hsl(25,90%,48%)] to-[hsl(15,85%,40%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'حجوزات الطيران',
      value: '24',
      icon: Plane,
      trend: '+8% هذا الأسبوع',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(263,55%,55%)] via-[hsl(270,50%,48%)] to-[hsl(280,45%,38%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'معدل النمو',
      value: `${realStats.monthlyGrowth.toFixed(1)}%`,
      icon: TrendingUp,
      trend: 'مقارنة بالشهر السابق',
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: realStats.monthlyGrowth >= 0
        ? 'bg-gradient-to-br from-[hsl(340,70%,52%)] via-[hsl(350,65%,48%)] to-[hsl(0,60%,40%)]'
        : 'bg-gradient-to-br from-[hsl(0,84%,60%)] to-[hsl(0,84%,45%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default EnhancedStatsCards;
