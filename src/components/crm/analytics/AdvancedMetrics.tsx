
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CurrencyTotals } from '@/lib/customerMetrics';
import { formatCurrencyTotals } from '@/lib/customerMetrics';

interface AdvancedMetricsProps {
  analytics: {
    customerLifetimeValueByCurrency: CurrencyTotals;
    churnRate: number;
    bookedCustomers: number;
    repeatCustomers: number;
    inactiveCustomers: number;
    activeCustomers: number;
  };
}

const AdvancedMetrics = ({ analytics }: AdvancedMetricsProps) => {
  return (
    <div className="space-y-2">
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
                {formatCurrencyTotals(analytics.customerLifetimeValueByCurrency)}
              </div>
              <p className="text-sm text-gray-600">متوسط قيمة العميل مدى الحياة</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>عملاء لديهم حجوزات مؤكدة</span>
                <span className="font-medium">{analytics.bookedCustomers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>عملاء متكررون (حجزان فأكثر)</span>
                <span className="font-medium">{analytics.repeatCustomers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>عملاء نشطون خلال 90 يومًا</span>
                <span className="font-medium">{analytics.activeCustomers}</span>
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
                {analytics.churnRate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">معدل التراجع الشهري</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء معرضون للمغادرة</span>
                <Badge variant="destructive">{analytics.inactiveCustomers} عميل</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء خاملون (90+ يوم)</span>
                <Badge variant="outline">{analytics.inactiveCustomers} عميل</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">عملاء يحتاجون متابعة</span>
                <Badge variant="secondary">{analytics.inactiveCustomers} عميل</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AdvancedMetrics;
