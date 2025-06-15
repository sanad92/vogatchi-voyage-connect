
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const CashFlowAnalysis = () => {
  // بيانات تجريبية للتدفق النقدي
  const cashFlowData = [
    { month: 'يناير', الداخل: 120000, الخارج: 95000, الصافي: 25000 },
    { month: 'فبراير', الداخل: 135000, الخارج: 98000, الصافي: 37000 },
    { month: 'مارس', الداخل: 128000, الخارج: 102000, الصافي: 26000 },
    { month: 'أبريل', الداخل: 142000, الخارج: 105000, الصافي: 37000 },
    { month: 'مايو', الداخل: 138000, الخارج: 110000, الصافي: 28000 },
    { month: 'يونيو', الداخل: 155000, الخارج: 115000, الصافي: 40000 }
  ];

  // حساب الإحصائيات
  const totalInflow = cashFlowData.reduce((sum, item) => sum + item.الداخل, 0);
  const totalOutflow = cashFlowData.reduce((sum, item) => sum + item.الخارج, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const averageMonthlyNet = netCashFlow / cashFlowData.length;

  return (
    <div className="space-y-6">
      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التدفق الداخل</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalInflow.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">آخر 6 أشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التدفق الخارج</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOutflow.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">آخر 6 أشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي التدفق النقدي</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netCashFlow.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">
              متوسط شهري: {averageMonthlyNet.toLocaleString()} ر.س
            </p>
          </CardContent>
        </Card>
      </div>

      {/* رسم بياني للتدفق النقدي */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل التدفق النقدي الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
              <Legend />
              <Line type="monotone" dataKey="الداخل" stroke="#10B981" strokeWidth={3} />
              <Line type="monotone" dataKey="الخارج" stroke="#EF4444" strokeWidth={3} />
              <Line type="monotone" dataKey="الصافي" stroke="#3B82F6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* رسم بياني للمنطقة */}
      <Card>
        <CardHeader>
          <CardTitle>اتجاه صافي التدفق النقدي</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
              <Area 
                type="monotone" 
                dataKey="الصافي" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* تحليل التوقعات */}
      <Card>
        <CardHeader>
          <CardTitle>توقعات التدفق النقدي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">متوسط التدفق الداخل الشهري</span>
              <span className="text-blue-600 font-bold">
                {(totalInflow / cashFlowData.length).toLocaleString()} ر.س
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium">متوسط التدفق الخارج الشهري</span>
              <span className="text-red-600 font-bold">
                {(totalOutflow / cashFlowData.length).toLocaleString()} ر.س
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium">التوقع للشهر القادم</span>
              <span className="text-green-600 font-bold">
                +{Math.round(averageMonthlyNet * 1.05).toLocaleString()} ر.س
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowAnalysis;
