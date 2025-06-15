
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useProfitLossCalculations } from '@/hooks/useProfitLossCalculations';
import { format } from 'date-fns';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const FinancialDashboardWidget = () => {
  const { calculateProfitLoss } = useProfitLossCalculations();

  // بيانات هذا الشهر
  const currentMonthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const currentMonthEnd = format(new Date(), 'yyyy-MM-dd');

  // بيانات الشهر الماضي
  const lastMonthStart = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM-dd');
  const lastMonthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd');

  const { data: currentMonth, isLoading: currentLoading } = calculateProfitLoss(currentMonthStart, currentMonthEnd);
  const { data: lastMonth, isLoading: lastLoading } = calculateProfitLoss(lastMonthStart, lastMonthEnd);

  if (currentLoading || lastLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الوضع المالي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">جاري تحميل البيانات المالية...</div>
        </CardContent>
      </Card>
    );
  }

  const revenueChange = currentMonth && lastMonth 
    ? ((currentMonth.total_revenue - lastMonth.total_revenue) / lastMonth.total_revenue) * 100 
    : 0;

  const profitChange = currentMonth && lastMonth 
    ? ((currentMonth.net_profit - lastMonth.net_profit) / Math.abs(lastMonth.net_profit || 1)) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          الوضع المالي - هذا الشهر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">إجمالي الإيرادات</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-xl font-bold text-green-600">
              <MultiCurrencyDisplay amount={currentMonth?.total_revenue || 0} currency="EGP" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(revenueChange).toFixed(1)}% مقارنة بالشهر الماضي
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">صافي الربح</span>
              <Target className={`h-4 w-4 ${(currentMonth?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className={`text-xl font-bold ${(currentMonth?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <MultiCurrencyDisplay amount={currentMonth?.net_profit || 0} currency="EGP" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(profitChange).toFixed(1)}% مقارنة بالشهر الماضي
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-gray-600">هامش الربح</span>
            <div className={`text-lg font-semibold ${(currentMonth?.profit_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(currentMonth?.profit_margin || 0).toFixed(1)}%
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-gray-600">إجمالي التكاليف</span>
            <div className="text-lg font-semibold text-red-600">
              <MultiCurrencyDisplay 
                amount={(currentMonth?.direct_costs || 0) + (currentMonth?.indirect_costs || 0)} 
                currency="EGP" 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialDashboardWidget;
