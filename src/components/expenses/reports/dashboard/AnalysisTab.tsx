import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurrencySummary } from '@/hooks/useFinancialReportsImproved';
import { CURRENCY_NAMES } from '@/types/currency';

interface AnalysisTabProps {
  summaryByCurrency: CurrencySummary[];
}

const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : '0');

const AnalysisTab = ({ summaryByCurrency }: AnalysisTabProps) => {
  if (!summaryByCurrency?.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد بيانات</CardContent></Card>;
  }
  return (
    <div className="space-y-4">
      {summaryByCurrency.map((s) => (
        <Card key={s.currency}>
          <CardHeader><CardTitle>التحليل المالي - {CURRENCY_NAMES[s.currency]}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium text-lg">نسب الإنفاق</h3>
                <div className="flex justify-between"><span>المصروفات التشغيلية</span><span>{pct(s.expenses, s.revenue)}%</span></div>
                <div className="flex justify-between"><span>الرواتب</span><span>{pct(s.salaries, s.revenue)}%</span></div>
                <div className="flex justify-between"><span>الإيجار</span><span>{pct(s.rent, s.revenue)}%</span></div>
              </div>
              <div className="text-center">
                <h3 className="font-medium text-lg mb-2">هامش الربح الصافي</h3>
                <p className={`text-4xl font-bold ${s.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pct(s.net_profit, s.revenue)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnalysisTab;
