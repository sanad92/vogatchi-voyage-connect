
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Download,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useFinancialReportsImproved } from '@/hooks/useFinancialReportsImproved';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface DateRange {
  start: string;
  end: string;
}

const ImprovedFinancialDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const {
    revenueBreakdown,
    expenseBreakdown,
    salariesSummary,
    rentPaymentsSummary,
    isLoading,
    getFinancialSummary
  } = useFinancialReportsImproved(dateRange.start, dateRange.end);

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const financialSummary = getFinancialSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل التقارير المالية...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          لوحة التحكم المالية المحسّنة مع دعم العملات المتعددة وحسابات دقيقة.
          جميع المبالغ محولة تلقائياً إلى الجنيه المصري للمقارنة الدقيقة.
        </AlertDescription>
      </Alert>

      {/* فلاتر التاريخ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            فترة التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                تصدير التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الملخص المالي الرئيسي */}
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-600">
                    <EgyptianPoundDisplay amount={financialSummary.total_revenue_egp} />
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
                  <p className="text-2xl font-bold text-red-600">
                    <EgyptianPoundDisplay amount={financialSummary.total_expenses_egp} />
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الرواتب المدفوعة</p>
                  <p className="text-2xl font-bold text-blue-600">
                    <EgyptianPoundDisplay amount={financialSummary.total_salaries_egp} />
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">صافي الربح</p>
                  <p className={`text-2xl font-bold ${
                    financialSummary.net_profit_egp >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <EgyptianPoundDisplay amount={financialSummary.net_profit_egp} />
                  </p>
                </div>
                {financialSummary.net_profit_egp >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* التفاصيل المالية */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الإيرادات
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            المصروفات
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            الرواتب
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            التحليل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الإيرادات حسب نوع الحجز</CardTitle>
            </CardHeader>
            <CardContent>
              {!revenueBreakdown || revenueBreakdown.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد إيرادات في الفترة المحددة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revenueBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{item.booking_type}</h3>
                        <p className="text-sm text-gray-500">{item.booking_count} حجز</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          <EgyptianPoundDisplay amount={item.total_revenue_egp} />
                        </p>
                        {item.currency !== 'EGP' && (
                          <p className="text-xs text-gray-500">
                            {item.total_revenue.toLocaleString()} {item.currency}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المصروفات حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent>
              {!expenseBreakdown || expenseBreakdown.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">لا توجد مصروفات في الفترة المحددة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{item.category_name_ar}</h3>
                        <p className="text-sm text-gray-500">{item.transaction_count} معاملة</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          <EgyptianPoundDisplay amount={item.total_amount_egp} />
                        </p>
                        {item.currency !== 'EGP' && (
                          <p className="text-xs text-gray-500">
                            {item.total_amount.toLocaleString()} {item.currency}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ملخص الرواتب المدفوعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-3xl font-bold text-blue-600">
                  <EgyptianPoundDisplay amount={salariesSummary || 0} />
                </p>
                <p className="text-gray-500 mt-2">إجمالي الرواتب المدفوعة في الفترة المحددة</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التحليل المالي</CardTitle>
            </CardHeader>
            <CardContent>
              {financialSummary && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">نسب الإنفاق</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>المصروفات التشغيلية</span>
                          <span>
                            {financialSummary.total_revenue_egp > 0 
                              ? ((financialSummary.total_expenses_egp / financialSummary.total_revenue_egp) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>الرواتب</span>
                          <span>
                            {financialSummary.total_revenue_egp > 0 
                              ? ((financialSummary.total_salaries_egp / financialSummary.total_revenue_egp) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>مدفوعات الإيجار</span>
                          <span>
                            {financialSummary.total_revenue_egp > 0 
                              ? ((financialSummary.total_rent_payments_egp / financialSummary.total_revenue_egp) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">هامش الربح</h3>
                      <div className="text-center">
                        <p className={`text-4xl font-bold ${
                          financialSummary.net_profit_egp >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {financialSummary.total_revenue_egp > 0 
                            ? ((financialSummary.net_profit_egp / financialSummary.total_revenue_egp) * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-gray-500">هامش الربح الصافي</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedFinancialDashboard;
