
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const BudgetVsActualReport = () => {
  // بيانات تجريبية للميزانية مقابل الفعلي
  const budgetData = [
    { category: 'الرواتب', المخطط: 45000, الفعلي: 42000, الانحراف: -3000 },
    { category: 'الإيجارات', المخطط: 15000, الفعلي: 15000, الانحراف: 0 },
    { category: 'المصروفات العامة', المخطط: 8000, الفعلي: 9200, الانحراف: 1200 },
    { category: 'الصيانة', المخطط: 5000, الفعلي: 3800, الانحراف: -1200 },
    { category: 'المرافق', المخطط: 3000, الفعلي: 3400, الانحراف: 400 },
    { category: 'التسويق', المخطط: 4000, الفعلي: 4500, الانحراف: 500 }
  ];

  // حساب الإحصائيات
  const totalBudget = budgetData.reduce((sum, item) => sum + item.المخطط, 0);
  const totalActual = budgetData.reduce((sum, item) => sum + item.الفعلي, 0);
  const totalVariance = totalActual - totalBudget;
  const variancePercentage = ((totalVariance / totalBudget) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الميزانية المخططة</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalBudget.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">للشهر الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات الفعلية</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalActual.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">المصروف الفعلي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الانحراف الإجمالي</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalVariance >= 0 ? '+' : ''}{totalVariance.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              {variancePercentage}% {totalVariance >= 0 ? 'زيادة' : 'نقص'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* رسم بياني للمقارنة */}
      <Card>
        <CardHeader>
          <CardTitle>مقارنة الميزانية مقابل المصروفات الفعلية</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
              <Legend />
              <Bar dataKey="المخطط" fill="#3B82F6" name="المخطط" />
              <Bar dataKey="الفعلي" fill="#F59E0B" name="الفعلي" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* جدول تفصيلي للانحرافات */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل الانحرافات التفصيلي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3 font-medium">الفئة</th>
                  <th className="text-right p-3 font-medium">المخطط</th>
                  <th className="text-right p-3 font-medium">الفعلي</th>
                  <th className="text-right p-3 font-medium">الانحراف</th>
                  <th className="text-right p-3 font-medium">النسبة</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map((item, index) => {
                  const percentage = ((item.الانحراف / item.المخطط) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.category}</td>
                      <td className="p-3">{item.المخطط.toLocaleString()} ر.س</td>
                      <td className="p-3">{item.الفعلي.toLocaleString()} ر.س</td>
                      <td className={`p-3 font-medium ${item.الانحراف >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.الانحراف >= 0 ? '+' : ''}{item.الانحراف.toLocaleString()} ر.س
                      </td>
                      <td className={`p-3 ${item.الانحراف >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {percentage}%
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.الانحراف === 0 ? 'bg-blue-100 text-blue-800' :
                          item.الانحراف > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.الانحراف === 0 ? 'مطابق' :
                           item.الانحراف > 0 ? 'تجاوز' : 'توفير'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetVsActualReport;
