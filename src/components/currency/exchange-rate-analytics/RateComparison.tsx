
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/types/currency';

interface RateComparisonProps {
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

const RateComparison = ({ latestRates }: RateComparisonProps) => {
  const getSignificantChanges = () => {
    return latestRates
      .filter(({ previous }) => previous)
      .map(({ pair, latest, previous, trend }) => {
        const changeAmount = latest.rate - previous.rate;
        const changePercent = (changeAmount / previous.rate) * 100;
        return {
          pair,
          latest,
          previous,
          trend,
          changeAmount,
          changePercent: Math.abs(changePercent),
          isSignificant: Math.abs(changePercent) > 1
        };
      })
      .filter(item => item.isSignificant)
      .sort((a, b) => b.changePercent - a.changePercent);
  };

  const significantChanges = getSignificantChanges();

  if (significantChanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">مقارنة الأسعار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            لا توجد تغيرات جوهرية في الأسعار
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">أكبر التغيرات في الأسعار</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {significantChanges.slice(0, 5).map((item, index) => {
            const Icon = item.trend === 'up' ? ArrowUp : item.trend === 'down' ? ArrowDown : Minus;
            const colorClass = item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-600';
            const bgColorClass = item.trend === 'up' ? 'bg-green-50' : item.trend === 'down' ? 'bg-red-50' : 'bg-gray-50';

            return (
              <div key={index} className={`p-3 rounded-lg border ${bgColorClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className="font-medium">{item.pair}</span>
                  </div>
                  <Badge variant={item.trend === 'up' ? 'default' : 'destructive'}>
                    {item.changePercent.toFixed(2)}%
                  </Badge>
                </div>
                
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">السعر السابق:</span>
                    <div className="font-medium">
                      {item.previous.rate.toFixed(6)} {CURRENCY_SYMBOLS[item.latest.to_currency as keyof typeof CURRENCY_SYMBOLS]}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">السعر الحالي:</span>
                    <div className="font-medium">
                      {item.latest.rate.toFixed(6)} {CURRENCY_SYMBOLS[item.latest.to_currency as keyof typeof CURRENCY_SYMBOLS]}
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 text-xs text-gray-500">
                  التغيير: {item.changeAmount > 0 ? '+' : ''}{item.changeAmount.toFixed(6)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RateComparison;
