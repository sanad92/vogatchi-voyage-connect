
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, DollarSign, Award, Target, UserCheck } from 'lucide-react';

interface AnalyticsKPIsProps {
  analytics: {
    totalCustomers: number;
    newCustomers: number;
    totalRevenue: number;
    averageOrderValue: number;
    retentionRate: number;
  };
}

const AnalyticsKPIs = ({ analytics }: AnalyticsKPIsProps) => {
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
        ℹ القيم المالية أدناه مجمّعة بالجنيه المصري (تقريبي — تشمل عملاء بعملات مختلفة)
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">+{analytics.newCustomers} جديد</span>
              </div>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">+15.2%</span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</p>
              <div className="flex items-center gap-1 text-blue-600">
                <Target className="h-3 w-3" />
                <span className="text-xs">هدف: 25,000</span>
              </div>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل الاحتفاظ</p>
              <p className="text-2xl font-bold">{analytics.retentionRate}%</p>
              <Progress value={analytics.retentionRate} className="mt-2 h-2" />
            </div>
            <UserCheck className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AnalyticsKPIs;
