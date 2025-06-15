
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Percent, DollarSign } from 'lucide-react';
import { useState } from 'react';

const PeriodComparison = () => {
  const [comparisonType, setComparisonType] = useState('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState('current_vs_previous');

  // بيانات المقارنة حسب النوع
  const getComparisonData = () => {
    switch (comparisonType) {
      case 'monthly':
        return [
          { period: 'يناير', الحالي: 85000, السابق: 78000, الهدف: 80000 },
          { period: 'فبراير', الحالي: 92000, السابق: 85000, الهدف: 85000 },
          { period: 'مارس', الحالي: 88000, السابق: 90000, الهدف: 87000 },
          { period: 'أبريل', الحالي: 95000, السابق: 88000, الهدف: 90000 },
          { period: 'مايو', الحالي: 89000, السابق: 92000, الهدف: 88000 },
          { period: 'يونيو', الحالي: 102000, السابق: 95000, الهدف: 95000 }
        ];
      case 'quarterly':
        return [
          { period: 'الربع الأول', الحالي: 265000, السابق: 253000, الهدف: 255000 },
          { period: 'الربع الثاني', الحالي: 286000, السابق: 275000, الهدف: 280000 },
          { period: 'الربع الثالث', الحالي: 295000, السابق: 288000, الهدف: 290000 },
          { period: 'الربع الرابع', الحالي: 312000, السابق: 305000, الهدف: 310000 }
        ];
      case 'yearly':
        return [
          { period: '2021', الحالي: 0, السابق: 980000, الهدف: 1000000 },
          { period: '2022', الحالي: 0, السابق: 1050000, الهدف: 1100000 },
          { period: '2023', الحالي: 0, السابق: 1180000, الهدف: 1200000 },
          { period: '2024', الحالي: 1158000, السابق: 0, الهدف: 1250000 }
        ];
      default:
        return [];
    }
  };

  const data = getComparisonData();

  // حساب الإحصائيات المقارنة
  const calculateComparisonStats = () => {
    const totalCurrent = data.reduce((sum, item) => sum + item.الحالي, 0);
    const totalPrevious = data.reduce((sum, item) => sum + item.السابق, 0);
    const totalTarget = data.reduce((sum, item) => sum + item.الهدف, 0);

    const growthRate = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;
    const targetAchievement = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    const variance = totalCurrent - totalPrevious;
    const avgCurrent = totalCurrent / data.length;
    const avgPrevious = totalPrevious / data.length;

    return {
      totalCurrent,
      totalPrevious,
      totalTarget,
      growthRate,
      targetAchievement,
      variance,
      avgCurrent,
      avgPrevious
    };
  };

  const stats = calculateComparisonStats();

  // تحديد لون النمو
  const getGrowthColor = (rate: number) => {
    if (rate > 5) return 'text-red-600';
    if (rate > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getGrowthIcon = (rate: number) => {
    return rate >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* عناصر التحكم */}
      <Card>
        <CardHeader>
          <CardTitle>مقارنة الفترات الزمنية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع المقارنة</label>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">مقارنة شهرية</SelectItem>
                  <SelectItem value="quarterly">مقارنة ربع سنوية</SelectItem>
                  <SelectItem value="yearly">مقارنة سنوية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الفترة المحددة</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_vs_previous">الحالي مقابل السابق</SelectItem>
                  <SelectItem value="current_vs_target">الحالي مقابل الهدف</SelectItem>
                  <SelectItem value="three_period">مقارنة ثلاث فترات</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إحصائيات المقارنة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل النمو</CardTitle>
            <div className={getGrowthColor(stats.growthRate)}>
              {getGrowthIcon(stats.growthRate)}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGrowthColor(stats.growthRate)}`}>
              {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">مقارنة بالفترة السابقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تحقيق الهدف</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.targetAchievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
              {stats.targetAchievement.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">من الهدف المحدد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفرق المطلق</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.variance >= 0 ? '+' : ''}{stats.variance.toLocaleString()} ر.س
            </div>
            <p className="text-xs text-muted-foreground">الفرق عن الفترة السابقة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المتوسط الحالي</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCurrent.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              السابق: {stats.avgPrevious.toLocaleString()} ر.س
            </p>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية المقارنة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>مقارنة الاتجاهات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                <Legend />
                <Line type="monotone" dataKey="الحالي" stroke="#3B82F6" strokeWidth={3} />
                <Line type="monotone" dataKey="السابق" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="الهدف" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مقارنة الأعمدة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ر.س`} />
                <Legend />
                <Bar dataKey="الحالي" fill="#3B82F6" />
                <Bar dataKey="السابق" fill="#94A3B8" />
                <Bar dataKey="الهدف" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* تحليل مفصل للفترات */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل مفصل للفترات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3 font-medium">الفترة</th>
                  <th className="text-right p-3 font-medium">الحالي</th>
                  <th className="text-right p-3 font-medium">السابق</th>
                  <th className="text-right p-3 font-medium">الهدف</th>
                  <th className="text-right p-3 font-medium">النمو</th>
                  <th className="text-right p-3 font-medium">تحقيق الهدف</th>
                  <th className="text-right p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => {
                  const periodGrowth = item.السابق > 0 ? ((item.الحالي - item.السابق) / item.السابق) * 100 : 0;
                  const targetAchievement = item.الهدف > 0 ? (item.الحالي / item.الهدف) * 100 : 0;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.period}</td>
                      <td className="p-3">{item.الحالي.toLocaleString()} ر.س</td>
                      <td className="p-3">{item.السابق.toLocaleString()} ر.س</td>
                      <td className="p-3">{item.الهدف.toLocaleString()} ر.س</td>
                      <td className={`p-3 font-medium ${getGrowthColor(periodGrowth)}`}>
                        {periodGrowth >= 0 ? '+' : ''}{periodGrowth.toFixed(1)}%
                      </td>
                      <td className={`p-3 ${targetAchievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                        {targetAchievement.toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            targetAchievement >= 100 ? 'default' :
                            targetAchievement >= 90 ? 'secondary' : 'destructive'
                          }
                        >
                          {targetAchievement >= 100 ? 'ممتاز' :
                           targetAchievement >= 90 ? 'جيد' : 'يحتاج تحسين'}
                        </Badge>
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

export default PeriodComparison;
