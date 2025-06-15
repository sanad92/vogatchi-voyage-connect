
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar, Download } from 'lucide-react';
import { useProfitLossCalculations } from '@/hooks/useProfitLossCalculations';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const ProfitLossReport = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { calculateProfitLoss, getMonthlyReport } = useProfitLossCalculations();

  // حساب الأرباح للفترة المحددة
  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
  
  const { data: profitLossData, isLoading: profitLossLoading } = calculateProfitLoss(startDate, endDate);
  const { data: monthlyData, isLoading: monthlyLoading } = getMonthlyReport(selectedYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleExport = () => {
    // سيتم تطوير هذه الوظيفة لاحقاً
    console.log('Export functionality to be implemented');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">تقرير الأرباح والخسائر</h2>
          <p className="text-gray-600">تحليل شامل للوضع المالي للشركة</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          تصدير التقرير
        </Button>
      </div>

      <Tabs defaultValue="period" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="period" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            تقرير فترة محددة
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            التقرير الشهري
          </TabsTrigger>
        </TabsList>

        <TabsContent value="period" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>اختيار الفترة الزمنية</CardTitle>
            </CardHeader>
            <CardContent>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="اختر الفترة الزمنية"
                locale={ar}
              />
            </CardContent>
          </Card>

          {profitLossLoading ? (
            <div className="text-center py-8">جاري تحميل البيانات...</div>
          ) : profitLossData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    <MultiCurrencyDisplay amount={profitLossData.total_revenue} currency="EGP" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    حجوزات الفنادق والطيران
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">التكاليف المباشرة</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    <MultiCurrencyDisplay amount={profitLossData.direct_costs} currency="EGP" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تكاليف الموردين
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">التكاليف غير المباشرة</CardTitle>
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    <MultiCurrencyDisplay amount={profitLossData.indirect_costs} currency="EGP" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    رواتب، إيجار، مصروفات
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الربح</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    <MultiCurrencyDisplay amount={profitLossData.gross_profit} currency="EGP" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الإيرادات - التكاليف المباشرة
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${profitLossData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${profitLossData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <MultiCurrencyDisplay amount={profitLossData.net_profit} currency="EGP" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الربح بعد جميع التكاليف
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">هامش الربح</CardTitle>
                  <BarChart3 className={`h-4 w-4 ${profitLossData.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${profitLossData.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLossData.profit_margin.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    نسبة الربح إلى الإيرادات
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">اختر فترة زمنية لعرض التقرير</div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>التقرير الشهري - {selectedYear}</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedYear(selectedYear - 1)}
                  >
                    {selectedYear - 1}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedYear(selectedYear + 1)}
                  >
                    {selectedYear + 1}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="text-center py-8">جاري تحميل البيانات...</div>
              ) : monthlyData && monthlyData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-right">الشهر</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">الإيرادات</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">التكاليف المباشرة</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">التكاليف غير المباشرة</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">إجمالي الربح</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">صافي الربح</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">هامش الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month) => (
                        <tr key={month.month_number} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 font-medium">
                            {month.month_name}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-green-600">
                            {formatCurrency(month.total_revenue)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-red-600">
                            {formatCurrency(month.direct_costs)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-orange-600">
                            {formatCurrency(month.indirect_costs)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-blue-600">
                            {formatCurrency(month.gross_profit)}
                          </td>
                          <td className={`border border-gray-200 px-4 py-2 font-bold ${
                            month.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(month.net_profit)}
                          </td>
                          <td className={`border border-gray-200 px-4 py-2 ${
                            month.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {month.profit_margin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">لا توجد بيانات للعام المحدد</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfitLossReport;
