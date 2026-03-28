import { LucideIcon, Calendar, DollarSign, Users, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
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
    "rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group",
    gradient
  )}>
    <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/5" />
    
    <div className="relative flex items-start justify-between">
      <div className="space-y-2.5 min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85 tracking-wide">{title}</p>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums drop-shadow-sm">{value}</p>
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
      <div className={cn("p-3 rounded-2xl shadow-lg", iconBg)}>
        <Icon className="h-6 w-6 drop-shadow-sm" />
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

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ج.م`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ج.م`;
  return `${amount.toLocaleString()} ج.م`;
};

const EnhancedStatsCards = ({ realStats }: EnhancedStatsCardsProps) => {
  const profitMargin = realStats.totalRevenue > 0
    ? ((realStats.netProfit || 0) / realStats.totalRevenue * 100).toFixed(1)
    : '0';

  const cards: StatCardProps[] = [
    {
      title: 'إجمالي الحجوزات',
      value: realStats.totalBookings.toLocaleString(),
      icon: Calendar,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}% هذا الشهر`,
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: 'bg-gradient-to-br from-[hsl(231,65%,52%)] via-[hsl(240,55%,45%)] to-[hsl(250,60%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'الإيرادات',
      value: formatCurrency(realStats.totalRevenue),
      icon: DollarSign,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}%`,
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: 'bg-gradient-to-br from-[hsl(152,60%,42%)] via-[hsl(160,55%,38%)] to-[hsl(170,50%,28%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'صافي الربح',
      value: formatCurrency(realStats.netProfit || 0),
      icon: Wallet,
      trend: `هامش ${profitMargin}%`,
      trendUp: (realStats.netProfit || 0) >= 0,
      gradient: (realStats.netProfit || 0) >= 0
        ? 'bg-gradient-to-br from-[hsl(263,55%,55%)] via-[hsl(270,50%,48%)] to-[hsl(280,45%,38%)]'
        : 'bg-gradient-to-br from-[hsl(0,84%,60%)] to-[hsl(0,84%,45%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: 'العملاء النشطين',
      value: realStats.activeCustomers.toLocaleString(),
      icon: Users,
      gradient: 'bg-gradient-to-br from-[hsl(200,90%,48%)] via-[hsl(210,80%,42%)] to-[hsl(220,70%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default EnhancedStatsCards;
