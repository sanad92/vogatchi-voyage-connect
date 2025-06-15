
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle } from 'lucide-react';

const BudgetVsActualReport = () => {
  // بيانات تجريبية للميزانية مقابل الفعلي
  const budgetData = [
    {
      category: 'الرواتب',
      budget: 80000,
      actual: 75000,
      variance: -5000,
      utilizationRate: 93.75
    },
    {
      category: 'الإيجارات',
      budget: 25000,
      actual: 25000,
      variance: 0,
      utilizationRate: 100
    },
    {
      category: 'المصروفات التشغيلية',
      budget: 15000,
      actual: 18500,
      variance: 3500,
      utilizationRate: 123.33
    },
    {
      category: 'الصيانة',
      budget: 8000,
      actual: 6200,
      variance: -1800,
      utilizationRate: 77.5
    },
    {
      category: 'التسويق',
      budget: 12000,
      actual: 14000,
      variance: 2000,
      utilizationRate: 116.67
    },
    {
      category: 'التدريب',
      budget: 5000,
      actual: 3500,
      variance: -1500,
      utilizationRate: 70
    }
  ];

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-blue-600';
    return variance > 0 ? 'text-red-600' : 'text-green-600';
  };

  const getVarianceIcon = (variance: number, utilizationRate: number) => {
    if (utilizationRate > 110) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (utilizationRate < 80) return <Target className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getUtilizationStatus = (rate: number) => {
    if (rate > 110) return { label: 'تجاوز الميزانية', variant: 'destructive' as const };
    if (rate < 80) return { label: 'أقل من المتوقع', variant: 'secondary' as const };
    return { label: 'ضمن النطاق', variant: 'default' as const };
  };

  const totalBudget = budgetData.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = budgetData.reduce((sum, item) => sum + item.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const overallUtilization = (totalActual / totalBudget) * 100;

  return (
    <div className="space-y-6">
      {/* ملخص عام */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الميزانية</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBudget.toLocaleString()} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفعلي</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActual.toLocaleString()} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الانحراف</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(totalVariance)}`}>
              {totalVariance > 0 ? '+' : ''}{totalVariance.toLocaleString()} ر.س
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الاستخدام</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallUtilization.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* رسم بياني مقارن */}
      <Card>
        <CardHeader>
          <CardTitle>مقارنة الميزانية مقابل الفعلي</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
              <Legend />
              <Bar dataKey="budget" fill="#3B82F6" name="الميزانية" />
              <Bar dataKey="actual" fill="#10B981" name="الفعلي" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* تفاصيل كل فئة */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الانحراف حسب الفئة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetData.map((item, index) => {
              const status = getUtilizationStatus(item.utilizationRate);
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getVarianceIcon(item.variance, item.utilizationRate)}
                      <h3 className="font-medium">{item.category}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {item.actual.toLocaleString()} / {item.budget.toLocaleString()} ر.س
                      </div>
                      <div className={`text-sm font-medium ${getVarianceColor(item.variance)}`}>
                        الانحراف: {item.variance > 0 ? '+' : ''}{item.variance.toLocaleString()} ر.س
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>معدل الاستخدام</span>
                      <span>{item.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(item.utilizationRate, 100)} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetVsActualReport;
