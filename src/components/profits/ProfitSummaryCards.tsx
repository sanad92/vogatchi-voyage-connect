
import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfitSummaryCardsProps {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
}

const ProfitSummaryCards = ({ totalRevenue, totalCosts, netProfit, profitMargin }: ProfitSummaryCardsProps) => {
  const cards = [
    {
      title: 'إجمالي الإيرادات',
      value: `${totalRevenue.toLocaleString()} ج.م`,
      icon: DollarSign,
      gradient: 'bg-gradient-to-br from-[hsl(231,65%,52%)] to-[hsl(250,60%,35%)]',
    },
    {
      title: 'إجمالي التكاليف',
      value: `${totalCosts.toLocaleString()} ج.م`,
      icon: TrendingDown,
      gradient: 'bg-gradient-to-br from-[hsl(30,95%,52%)] to-[hsl(15,85%,40%)]',
    },
    {
      title: 'صافي الربح',
      value: `${netProfit.toLocaleString()} ج.م`,
      icon: TrendingUp,
      gradient: netProfit >= 0
        ? 'bg-gradient-to-br from-[hsl(152,60%,42%)] to-[hsl(170,50%,28%)]'
        : 'bg-gradient-to-br from-[hsl(0,84%,60%)] to-[hsl(0,84%,45%)]',
    },
    {
      title: 'هامش الربح',
      value: `${profitMargin.toFixed(1)}%`,
      icon: Percent,
      gradient: profitMargin >= 20
        ? 'bg-gradient-to-br from-[hsl(263,55%,55%)] to-[hsl(280,45%,38%)]'
        : 'bg-gradient-to-br from-[hsl(200,90%,48%)] to-[hsl(220,70%,35%)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className={cn(
          "rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden",
          card.gradient
        )}>
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/85">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums">{card.value}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/25 backdrop-blur-sm">
              <card.icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfitSummaryCards;
