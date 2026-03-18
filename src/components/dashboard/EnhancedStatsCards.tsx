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
  <div
    className={cn(
      'rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden',
      gradient
    )}
  >
    <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/5" />

    <div className="relative flex items-start justify-between">
      <div className="space-y-3 min-w-0 flex-1">
        <p className="text-sm font-medium text-white/85 tracking-wide">{title}</p>
        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums drop-shadow-sm">{value}</p>
        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
              trendUp ? 'bg-white/20 text-white' : 'bg-black/15 text-white/80'
            )}
          >
            <TrendingUp className={cn('h-3 w-3', !trendUp && 'rotate-180')} />
            {trend}
          </div>
        )}
      </div>
      <div className={cn('p-3.5 rounded-2xl shadow-lg', iconBg)}>
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
    flightBookings: number;
    pendingFollowUps: number;
  };
}

const EnhancedStatsCards = ({ realStats }: EnhancedStatsCardsProps) => {
  const cards: StatCardProps[] = [
    {
      title: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a',
      value: realStats.totalBookings.toLocaleString('ar-EG'),
      icon: Calendar,
      trend: '\u002B12\u0025 \u0645\u0646 \u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0633\u0627\u0628\u0642',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(231,65%,52%)] via-[hsl(240,55%,45%)] to-[hsl(250,60%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: '\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a',
      value: `${(realStats.totalRevenue / 1000).toFixed(0)}k \u062c.\u0645`,
      icon: DollarSign,
      trend: `${realStats.monthlyGrowth >= 0 ? '+' : ''}${realStats.monthlyGrowth.toFixed(1)}%`,
      trendUp: realStats.monthlyGrowth >= 0,
      gradient: 'bg-gradient-to-br from-[hsl(152,60%,42%)] via-[hsl(160,55%,38%)] to-[hsl(170,50%,28%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u064a\u0646',
      value: realStats.activeCustomers.toLocaleString('ar-EG'),
      icon: Users,
      trend: '\u002B5 \u0639\u0645\u0644\u0627\u0621 \u062c\u062f\u062f',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(200,90%,48%)] via-[hsl(210,80%,42%)] to-[hsl(220,70%,35%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: '\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0645\u0639\u0644\u0642\u0629',
      value: realStats.pendingFollowUps.toLocaleString('ar-EG'),
      icon: AlertTriangle,
      trend:
        realStats.pendingFollowUps > 0
          ? `${Math.min(realStats.pendingFollowUps, 3).toLocaleString('ar-EG')} \u0639\u0627\u062c\u0644\u0629`
          : '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0639\u0627\u062c\u0644\u0629',
      trendUp: realStats.pendingFollowUps === 0,
      gradient: 'bg-gradient-to-br from-[hsl(30,95%,52%)] via-[hsl(25,90%,48%)] to-[hsl(15,85%,40%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: '\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0637\u064a\u0631\u0627\u0646',
      value: realStats.flightBookings.toLocaleString('ar-EG'),
      icon: Plane,
      trend: `\u0645\u0646 \u0625\u062c\u0645\u0627\u0644\u064a ${realStats.totalBookings.toLocaleString('ar-EG')} \u062d\u062c\u0632`,
      trendUp: true,
      gradient: 'bg-gradient-to-br from-[hsl(263,55%,55%)] via-[hsl(270,50%,48%)] to-[hsl(280,45%,38%)]',
      iconBg: 'bg-white/25 backdrop-blur-sm',
    },
    {
      title: '\u0645\u0639\u062f\u0644 \u0627\u0644\u0646\u0645\u0648',
      value: `${realStats.monthlyGrowth.toFixed(1)}%`,
      icon: TrendingUp,
      trend: '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0633\u0627\u0628\u0642',
      trendUp: realStats.monthlyGrowth >= 0,
      gradient:
        realStats.monthlyGrowth >= 0
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
