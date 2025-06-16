
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Target,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const EnhancedFinancialDashboard = () => {
  const { financialSummary, currentMonthStats, ratios, isLoading } = useFinancialCalculations();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات الرئيسية المحسنة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-blue-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalExpenses} />
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {ratios.expenseRatio.toFixed(1)}% من التكاليف
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الرواتب</p>
                <p className="text-2xl font-bold text-green-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalSalaries} />
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {ratios.salaryRatio.toFixed(1)}% من التكاليف
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيجارات</p>
                <p className="text-2xl font-bold text-purple-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalRentPayments} />
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {ratios.rentRatio.toFixed(1)}% من التكاليف
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي العمولات</p>
                <p className="text-2xl font-bold text-orange-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalCommissions} />
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {ratios.commissionRatio.toFixed(1)}% من التكاليف
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Calculator className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات الشهر الحالي */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            إحصائيات الشهر الحالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">المصروفات</p>
              <p className="text-xl font-bold text-blue-600">
                <EgyptianPoundDisplay amount={currentMonthStats.expenses} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">الرواتب</p>
              <p className="text-xl font-bold text-green-600">
                <EgyptianPoundDisplay amount={currentMonthStats.salaries} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">الإيجارات</p>
              <p className="text-xl font-bold text-purple-600">
                <EgyptianPoundDisplay amount={currentMonthStats.rent} />
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">الإجمالي</p>
              <p className="text-xl font-bold text-red-600">
                <EgyptianPoundDisplay amount={currentMonthStats.total} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الرسوم البيانية المحسنة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* التحليل الشهري */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              التحليل الشهري للتكاليف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={financialSummary.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()} ج.م`, 
                    name === 'expenses' ? 'مصروفات' :
                    name === 'salaries' ? 'رواتب' :
                    name === 'rent' ? 'إيجارات' :
                    name === 'commissions' ? 'عمولات' : 'إجمالي'
                  ]}
                />
                <Bar dataKey="expenses" stackId="a" fill="#3B82F6" name="expenses" />
                <Bar dataKey="salaries" stackId="a" fill="#10B981" name="salaries" />
                <Bar dataKey="rent" stackId="a" fill="#8B5CF6" name="rent" />
                <Bar dataKey="commissions" stackId="a" fill="#F59E0B" name="commissions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* منحنى الإجمالي الشهري */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              تطور التكاليف الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={financialSummary.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'الإجمالي']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* تحليل النسب */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع التكاليف التشغيلية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-600">المصروفات العامة</span>
                <span className="text-sm font-bold">
                  <EgyptianPoundDisplay amount={financialSummary.totalExpenses} />
                  ({ratios.expenseRatio.toFixed(1)}%)
                </span>
              </div>
              <Progress value={ratios.expenseRatio} className="h-3" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-green-600">الرواتب</span>
                <span className="text-sm font-bold">
                  <EgyptianPoundDisplay amount={financialSummary.totalSalaries} />
                  ({ratios.salaryRatio.toFixed(1)}%)
                </span>
              </div>
              <Progress value={ratios.salaryRatio} className="h-3" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-purple-600">الإيجارات</span>
                <span className="text-sm font-bold">
                  <EgyptianPoundDisplay amount={financialSummary.totalRentPayments} />
                  ({ratios.rentRatio.toFixed(1)}%)
                </span>
              </div>
              <Progress value={ratios.rentRatio} className="h-3" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-orange-600">العمولات</span>
                <span className="text-sm font-bold">
                  <EgyptianPoundDisplay amount={financialSummary.totalCommissions} />
                  ({ratios.commissionRatio.toFixed(1)}%)
                </span>
              </div>
              <Progress value={ratios.commissionRatio} className="h-3" />
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">إجمالي التكاليف التشغيلية</span>
              <span className="text-xl font-bold text-red-600">
                <EgyptianPoundDisplay amount={financialSummary.totalOperationalCosts} />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedFinancialDashboard;
