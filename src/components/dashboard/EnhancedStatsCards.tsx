import { LucideIcon, Calendar, Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPI {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: number; // percentage
  tone?: 'default' | 'warning' | 'success';
}

interface EnhancedStatsCardsProps {
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
    netProfit?: number;
  };
  alerts?: { outstandingAmount: number; outstandingCount: number; checkoutsToday: number };
  today?: { todayBookingsCount: number; weekBookingsCount: number; newCustomersToday: number };
}

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
};

const KPICard = ({ title, value, icon: Icon, hint, trend, tone = 'default' }: KPI) => {
  const toneRing = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-600',
    success: 'bg-emerald-500/10 text-emerald-600',
  }[tone];

  return (
    <div className="group bg-card rounded-2xl border border-border/60 p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground tracking-wide">{title}</p>
          <p className="text-2xl sm:text-[28px] font-bold text-foreground tabular-nums leading-none">
            {value}
          </p>
          {hint && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {typeof trend === 'number' && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 font-semibold',
                  trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              <span>{hint}</span>
            </div>
          )}
        </div>
        <div className={cn('flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center', toneRing)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const EnhancedStatsCards = ({ realStats, alerts, today }: EnhancedStatsCardsProps) => {
  const profitMargin = realStats.totalRevenue > 0
    ? ((realStats.netProfit || 0) / realStats.totalRevenue * 100).toFixed(1)
    : '0';

  const cards: KPI[] = [
    {
      title: 'الإيرادات (إجمالي)',
      value: formatCurrency(realStats.totalRevenue),
      icon: TrendingUp,
      trend: realStats.monthlyGrowth,
      hint: 'مقارنة بالشهر الماضي — للتفصيل بالعملة راجع التقارير',
    },
    {
      title: 'صافي الربح',
      value: formatCurrency(realStats.netProfit || 0),
      icon: Wallet,
      hint: `هامش ${profitMargin}%`,
      tone: (realStats.netProfit || 0) >= 0 ? 'success' : 'warning',
    },
    {
      title: 'مستحقات على العملاء',
      value: formatCurrency(alerts?.outstandingAmount || 0),
      icon: AlertCircle,
      hint: `${alerts?.outstandingCount || 0} حجز غير مكتمل الدفع`,
      tone: (alerts?.outstandingAmount || 0) > 0 ? 'warning' : 'default',
    },
    {
      title: 'حجوزات اليوم',
      value: (today?.todayBookingsCount ?? 0).toLocaleString(),
      icon: Calendar,
      hint: `${today?.weekBookingsCount || 0} هذا الأسبوع`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  );
};

export default EnhancedStatsCards;
