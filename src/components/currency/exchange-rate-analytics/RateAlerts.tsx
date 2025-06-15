
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface RateAlertsProps {
  latestRates: Array<{
    pair: string;
    latest: any;
    previous?: any;
    trend: 'up' | 'down' | 'neutral';
  }>;
}

const RateAlerts = ({ latestRates }: RateAlertsProps) => {
  const getAlerts = () => {
    const alerts = [];
    
    latestRates.forEach(({ pair, latest, previous, trend }) => {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - new Date(latest.effective_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // تنبيه للأسعار القديمة
      if (daysSinceUpdate > 7) {
        alerts.push({
          type: 'old_rate',
          pair,
          message: `سعر ${pair} لم يتم تحديثه منذ ${daysSinceUpdate} يوم`,
          severity: daysSinceUpdate > 30 ? 'high' : 'medium',
          icon: Clock
        });
      }
      
      // تنبيه للتغيرات الكبيرة
      if (previous) {
        const changePercent = Math.abs((latest.rate - previous.rate) / previous.rate * 100);
        if (changePercent > 5) {
          alerts.push({
            type: 'big_change',
            pair,
            message: `تغير كبير في سعر ${pair}: ${changePercent.toFixed(2)}%`,
            severity: changePercent > 10 ? 'high' : 'medium',
            icon: trend === 'up' ? TrendingUp : TrendingDown
          });
        }
      }
    });
    
    return alerts;
  };

  const alerts = getAlerts();

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            التنبيهات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-green-600 py-4">
            ✅ لا توجد تنبيهات - جميع الأسعار محدثة
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          التنبيهات ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const Icon = alert.icon;
            return (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50">
                <Icon className={`h-4 w-4 mt-0.5 ${
                  alert.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{alert.message}</p>
                </div>
                <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                  {alert.severity === 'high' ? 'عاجل' : 'متوسط'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RateAlerts;
