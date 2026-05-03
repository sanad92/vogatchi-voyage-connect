import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { CurrencySummary } from '@/hooks/useFinancialReportsImproved';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

interface FinancialSummaryCardsProps {
  summaryByCurrency: CurrencySummary[];
}

const fmt = (n: number, cur: string) =>
  `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[cur as keyof typeof CURRENCY_SYMBOLS] || cur}`;

const FinancialSummaryCards = ({ summaryByCurrency }: FinancialSummaryCardsProps) => {
  if (!summaryByCurrency || summaryByCurrency.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">لا توجد بيانات في الفترة المحددة</div>
    );
  }
  return (
    <div className="space-y-4">
      {summaryByCurrency.map((s) => (
        <div key={s.currency} className="space-y-2">
          <div className="text-sm font-semibold">{CURRENCY_NAMES[s.currency]}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">الإيرادات</p><p className="text-2xl font-bold text-green-600">{fmt(s.revenue, s.currency)}</p></div><TrendingUp className="h-8 w-8 text-green-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">المصروفات</p><p className="text-2xl font-bold text-red-600">{fmt(s.expenses, s.currency)}</p></div><TrendingDown className="h-8 w-8 text-red-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">الرواتب</p><p className="text-2xl font-bold text-blue-600">{fmt(s.salaries, s.currency)}</p></div><DollarSign className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">صافي الربح</p><p className={`text-2xl font-bold ${s.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(s.net_profit, s.currency)}</p></div>{s.net_profit >= 0 ? <TrendingUp className="h-8 w-8 text-green-600" /> : <TrendingDown className="h-8 w-8 text-red-600" />}</div></CardContent></Card>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinancialSummaryCards;
