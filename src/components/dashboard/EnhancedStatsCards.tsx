import { LucideIcon, Calendar, Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/types/currency';
import type { CurrencyTotals } from '@/hooks/useOptimizedDashboard';

interface KPI {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: number;
  tone?: 'default' | 'warning' | 'success';
}

interface EnhancedStatsCardsProps {
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
    netProfit?: number;
    currency?: string;
  };
  alerts?: { outstandingAmount: number; outstandingCount: number; checkoutsToday: number; currency?: string };
  today?: { todayBookingsCount: number; weekBookingsCount: number; newCustomersToday: number };
  byCurrency?: CurrencyTotals[];
}

const formatNumber = (amount: number, currency: string): string => {
  const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
  const abs = Math.abs(amount);
  let val: string;
  if (abs >= 1_000_000) val = `${(amount / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) val = `${(amount / 1_000).toFixed(1)}K`;
  else val = amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 });
  return `${val} ${sym}`;
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

const CurrencyRow = ({ totals, today, checkoutsToday }: { totals: CurrencyTotals; today?: EnhancedStatsCardsProps['today']; checkoutsToday: number }) => {
  const profitMargin = totals.totalRevenue > 0 ? ((totals.netProfit / totals.totalRevenue) * 100).toFixed(1) : '0';
  const cards: KPI[] = [
    {
      title: `الإيرادات (${totals.currency})`,
      value: formatNumber(totals.totalRevenue, totals.currency),
      icon: TrendingUp,
      trend: totals.monthlyGrowth,
      hint: 'مقارنة بالشهر الماضي',
    },
    {
      title: `صافي الربح (${totals.currency})`,
      value: formatNumber(totals.netProfit, totals.currency),
      icon: Wallet,
      hint: `هامش ${profitMargin}%`,
      tone: totals.netProfit >= 0 ? 'success' : 'warning',
    },
    {
      title: `مستحقات على العملاء (${totals.currency})`,
      value: formatNumber(totals.outstandingAmount, totals.currency),
      icon: AlertCircle,
      hint: `${totals.outstandingCount} حجز غير مكتمل الدفع`,
      tone: totals.outstandingAmount > 0 ? 'warning' : 'default',
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
      {cards.map((c) => <KPICard key={c.title} {...c} />)}
    </div>
  );
};

const EnhancedStatsCards = ({ realStats, alerts, today, byCurrency }: EnhancedStatsCardsProps) => {
  const list: CurrencyTotals[] = byCurrency && byCurrency.length
    ? byCurrency
    : [{
        currency: realStats.currency || 'EGP',
        totalRevenue: realStats.totalRevenue,
        netProfit: realStats.netProfit || 0,
        outstandingAmount: alerts?.outstandingAmount || 0,
        outstandingCount: alerts?.outstandingCount || 0,
        bookingsCount: realStats.totalBookings,
        monthlyGrowth: realStats.monthlyGrowth,
      }];

  return (
    <div className="space-y-4">
      {list.map((t) => (
        <CurrencyRow key={t.currency} totals={t} today={today} checkoutsToday={alerts?.checkoutsToday || 0} />
      ))}
    </div>
  );
};

export default EnhancedStatsCards;
