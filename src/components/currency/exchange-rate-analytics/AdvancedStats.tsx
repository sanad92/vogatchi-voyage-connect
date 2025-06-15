
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calculator, Calendar, TrendingUp, Activity } from 'lucide-react';

interface AdvancedStatsProps {
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
  exchangeRates: any[];
}

const AdvancedStats = ({ latestRates, exchangeRates }: AdvancedStatsProps) => {
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayUpdates = exchangeRates.filter(rate => rate.effective_date === today).length;
  const weekUpdates = exchangeRates.filter(rate => rate.effective_date >= thisWeek).length;
  const monthUpdates = exchangeRates.filter(rate => rate.effective_date >= thisMonth).length;

  const uptrends = latestRates.filter(r => r.trend === 'up').length;
  const downtrends = latestRates.filter(r => r.trend === 'down').length;
  const uptrendPercentage = latestRates.length > 0 ? (uptrends / latestRates.length) * 100 : 0;

  const avgDaysSinceUpdate = latestRates.length > 0 
    ? latestRates.reduce((sum, { latest }) => {
        const days = Math.floor((new Date().getTime() - new Date(latest.effective_date).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / latestRates.length
    : 0;

  const freshRates = latestRates.filter(({ latest }) => {
    const days = Math.floor((new Date().getTime() - new Date(latest.effective_date).getTime()) / (1000 * 60 * 60 * 24));
    return days <= 1;
  }).length;

  const freshnessPercentage = latestRates.length > 0 ? (freshRates / latestRates.length) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">نشاط التحديث</CardTitle>
          <Activity className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>اليوم:</span>
              <span className="font-bold">{todayUpdates}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>هذا الأسبوع:</span>
              <span className="font-bold">{weekUpdates}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>هذا الشهر:</span>
              <span className="font-bold">{monthUpdates}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">اتجاه السوق</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>صاعد:</span>
              <span className="font-bold text-green-600">{uptrends}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>هابط:</span>
              <span className="font-bold text-red-600">{downtrends}</span>
            </div>
            <div className="mt-2">
              <Progress value={uptrendPercentage} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {uptrendPercentage.toFixed(1)}% اتجاه صاعد
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">متوسط عمر البيانات</CardTitle>
          <Calendar className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {avgDaysSinceUpdate.toFixed(1)} يوم
          </div>
          <p className="text-xs text-gray-500 mt-1">
            متوسط الوقت منذ آخر تحديث
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">نضارة البيانات</CardTitle>
          <Calculator className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={freshnessPercentage} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>محدث حديثاً:</span>
              <span className="font-bold">{freshRates}/{latestRates.length}</span>
            </div>
            <p className="text-xs text-gray-500">
              {freshnessPercentage.toFixed(1)}% محدث خلال يوم
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedStats;
