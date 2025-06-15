
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const AdvancedAnalytics = () => {
  const { expenseTransactions, monthlySalaries, rentContracts } = useExpenses();

  // حساب مؤشرات الأداء المتقدمة
  const calculateAdvancedMetrics = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // المصروفات الحالية
    const currentMonthExpenses = expenseTransactions?.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + t.amount, 0) || 0;

    // المصروفات الشهر السابق
    const previousMonthExpenses = expenseTransactions?.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getMonth() === previousMonth && date.getFullYear() === previousMonthYear;
    }).reduce((sum, t) => sum + t.amount, 0) || 0;

    // نسبة النمو
    const growthRate = previousMonthExpenses > 0 
      ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100 
      : 0;

    // متوسط المصروفات اليومية
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const dailyAverage = currentMonthExpenses / currentDay;
    const projectedMonthlyExpenses = dailyAverage * daysInMonth;

    // معدل الحرق (Burn Rate)
    const burnRate = currentMonthExpenses / currentDay;

    return {
      currentMonthExpenses,
      previousMonthExpenses,
      growthRate,
      dailyAverage,
      projectedMonthlyExpenses,
      burnRate
    };
  };

  // بيانات المقارنة الشهرية
  const getMonthlyComparison = () => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    return months.map((month, index) => ({
      month,
      الحالي: Math.random() * 100000 + 50000,
      السابق: Math.random() * 100000 + 45000,
      الهدف: 80000
    }));
  };

  // بيانات تحليل الاتجاهات
  const getTrendAnalysis = () => {
    const weeks = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
    return weeks.map(week => ({
      week,
      المصروفات: Math.random() * 25000 + 15000,
      الميزانية: 20000,
      التراكمي: Math.random() * 80000 + 40000
    }));
  };

  const metrics = calculateAdvancedMetrics();
  const monthlyComparison = getMonthlyComparison();
  const trendAnalysis = getTrendAnalysis();

  return (
    <div className="space-y-6">
      {/* مؤشرات الأداء المتقدمة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النمو الشهري</CardTitle>
            {metrics.growthRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.growthRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.growthRate >= 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">مقارنة بالشهر السابق</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط المصروفات اليومية</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dailyAverage.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">للشهر الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإنفاق المتوقع للشهر</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.projectedMonthlyExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">بناءً على المعدل الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الحرق اليومي</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.burnRate.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">متوسط الإنفاق اليومي</p>
          </CardContent>
        </Card>
      </div>

      {/* مقارنة الأداء الشهري */}
      <Card>
        <CardHeader>
          <CardTitle>مقارنة الأداء الشهري</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
              <Legend />
              <Bar dataKey="الحالي" fill="#3B82F6" name="العام الحالي" />
              <Bar dataKey="السابق" fill="#94A3B8" name="العام السابق" />
              <Line type="monotone" dataKey="الهدف" stroke="#EF4444" strokeWidth={2} name="الهدف" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* تحليل الاتجاهات الأسبوعية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>تحليل الاتجاهات الأسبوعية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                <Area type="monotone" dataKey="المصروفات" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="الميزانية" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* مؤشرات الأداء المالي */}
        <Card>
          <CardHeader>
            <CardTitle>مؤشرات الأداء المالي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الالتزام بالميزانية</span>
                <Badge variant="secondary">85%</Badge>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">كفاءة الإنفاق</span>
                <Badge variant="outline">جيد</Badge>
              </div>
              <Progress value={72} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">التحكم في التكاليف</span>
                <Badge variant="destructive">يحتاج تحسين</Badge>
              </div>
              <Progress value={45} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">التنبؤ بالمصروفات</span>
                <Badge variant="default">ممتاز</Badge>
              </div>
              <Progress value={92} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تحليل المخاطر المالية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            تحليل المخاطر المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-yellow-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">تحذير</span>
              </div>
              <p className="text-sm text-yellow-700">
                المصروفات الحالية تتجاوز المعدل المخطط بنسبة 15%
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">خطر عالي</span>
              </div>
              <p className="text-sm text-red-700">
                إذا استمر المعدل الحالي، ستتجاوز الميزانية بنهاية الشهر
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">توصية</span>
              </div>
              <p className="text-sm text-blue-700">
                يُنصح بتقليل المصروفات غير الضرورية بنسبة 10%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalytics;
