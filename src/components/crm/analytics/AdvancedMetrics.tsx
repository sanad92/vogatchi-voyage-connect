
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AdvancedMetricsProps {
  analytics: {
    customerLifetimeValue: number;
    churnRate: number;
  };
}

const AdvancedMetrics = ({ analytics }: AdvancedMetricsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
        ℹ القيم بالجنيه المصري (تقريبي — تشمل عملات مختلفة)
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* قيمة العميل مدى الحياة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            قيمة العميل مدى الحياة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(analytics.customerLifetimeValue)}
              </div>
              <p className="text-sm text-gray-600">متوسط قيمة العميل مدى الحياة</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>العملاء الجدد (أقل من 30 يوم)</span>
                <span className="font-medium">{formatCurrency(8500)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>العملاء المتكررون (30-180 يوم)</span>
                <span className="font-medium">{formatCurrency(15200)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>العملاء الأوفياء (+180 يوم)</span>
                <span className="font-medium">{formatCurrency(32500)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معدل التراجع */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            تحليل التراجع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {analytics.churnRate}%
              </div>
              <p className="text-sm text-gray-600">معدل التراجع الشهري</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء معرضون للمغادرة</span>
                <Badge variant="destructive">23 عميل</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء خاملون (90+ يوم)</span>
                <Badge variant="outline">47 عميل</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء يحتاجون متابعة</span>
                <Badge variant="secondary">156 عميل</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedMetrics;
