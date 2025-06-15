
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRateStatsProps {
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

const ExchangeRateStats = ({ latestRates }: ExchangeRateStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">أزواج العملات</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestRates.length}</div>
          <p className="text-xs text-muted-foreground">زوج عملات متاح</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">آخر تحديث</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {latestRates.length > 0 ? 
              new Date(Math.max(...latestRates.map(r => new Date(r.latest.effective_date).getTime()))).toLocaleDateString('ar-SA') :
              'لا يوجد'
            }
          </div>
          <p className="text-xs text-muted-foreground">تاريخ آخر تحديث</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الاتجاه العام</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {latestRates.filter(r => r.trend === 'up').length} صاعد
          </div>
          <p className="text-xs text-muted-foreground">
            {latestRates.filter(r => r.trend === 'down').length} هابط
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExchangeRateStats;
