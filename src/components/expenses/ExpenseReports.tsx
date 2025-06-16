
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, PieChart, Download, Calculator } from 'lucide-react';
import FinancialDashboard from './reports/FinancialDashboard';
import EnhancedFinancialDashboard from './reports/EnhancedFinancialDashboard';
import ExpenseReportExporter from './reports/ExpenseReportExporter';
import { useExpenses } from '@/hooks/useExpenses';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const ExpenseReports = () => {
  const { 
    expenseCategories, 
    expenseTransactions, 
    monthlySalaries, 
    rentContracts,
    categoriesLoading,
    transactionsLoading,
    salariesLoading,
    contractsLoading
  } = useExpenses();

  // حساب الإحصائيات
  const calculateExpenseStats = () => {
    if (!expenseTransactions || !monthlySalaries || !rentContracts) {
      return {
        totalExpenses: 0,
        totalSalaries: 0,
        totalRent: 0,
        totalOtherExpenses: 0,
        categoryBreakdown: []
      };
    }

    // حساب إجمالي المصروفات العامة
    const totalOtherExpenses = expenseTransactions
      .filter(t => t.status === 'approved')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // حساب إجمالي الرواتب
    const totalSalaries = monthlySalaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.net_salary), 0);

    // حساب إجمالي الإيجارات (تقديري - شهر واحد لكل عقد نشط)
    const totalRent = rentContracts
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + Number(c.monthly_rent), 0);

    const totalExpenses = totalOtherExpenses + totalSalaries + totalRent;

    // تحليل حسب الفئة
    const categoryBreakdown = expenseCategories?.map(category => {
      const categoryExpenses = expenseTransactions
        .filter(t => t.category_id === category.id && t.status === 'approved')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      return {
        name: category.name_ar,
        amount: categoryExpenses,
        color: category.color,
        percentage: totalExpenses > 0 ? (categoryExpenses / totalExpenses) * 100 : 0
      };
    }) || [];

    // إضافة الرواتب والإيجارات كفئات منفصلة
    categoryBreakdown.push(
      {
        name: 'الرواتب',
        amount: totalSalaries,
        color: '#10B981',
        percentage: totalExpenses > 0 ? (totalSalaries / totalExpenses) * 100 : 0
      },
      {
        name: 'الإيجارات',
        amount: totalRent,
        color: '#3B82F6',
        percentage: totalExpenses > 0 ? (totalRent / totalExpenses) * 100 : 0
      }
    );

    return {
      totalExpenses,
      totalSalaries,
      totalRent,
      totalOtherExpenses,
      categoryBreakdown: categoryBreakdown.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
    };
  };

  const stats = calculateExpenseStats();

  if (categoriesLoading || transactionsLoading || salariesLoading || contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            نظام التقارير المالية المتقدم - بالجنيه المصري
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="enhanced" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="enhanced" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                التحليل المتقدم
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                لوحة المؤشرات
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                التحليل التفصيلي
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                تصدير التقارير
              </TabsTrigger>
              <TabsTrigger value="legacy" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                التقرير المبسط
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enhanced" className="space-y-4">
              <EnhancedFinancialDashboard />
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-4">
              <FinancialDashboard />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <FinancialDashboard />
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <ExpenseReportExporter />
            </TabsContent>

            <TabsContent value="legacy" className="space-y-4">
              {/* التقرير المبسط بالجنيه المصري */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <MultiCurrencyDisplay amount={stats.totalExpenses} currency="EGP" />
                    </div>
                    <p className="text-xs text-muted-foreground">جميع المصروفات بالجنيه المصري</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الرواتب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <MultiCurrencyDisplay amount={stats.totalSalaries} currency="EGP" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalExpenses > 0 ? 
                        `${((stats.totalSalaries / stats.totalExpenses) * 100).toFixed(1)}% من إجمالي المصروفات` : 
                        '0% من إجمالي المصروفات'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الإيجارات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <MultiCurrencyDisplay amount={stats.totalRent} currency="EGP" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalExpenses > 0 ? 
                        `${((stats.totalRent / stats.totalExpenses) * 100).toFixed(1)}% من إجمالي المصروفات` : 
                        '0% من إجمالي المصروفات'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">مصروفات أخرى</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <MultiCurrencyDisplay amount={stats.totalOtherExpenses} currency="EGP" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalExpenses > 0 ? 
                        `${((stats.totalOtherExpenses / stats.totalExpenses) * 100).toFixed(1)}% من إجمالي المصروفات` : 
                        '0% من إجمالي المصروفات'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* تحليل حسب الفئة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    تحليل المصروفات حسب الفئة (بالجنيه المصري)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.categoryBreakdown?.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            <MultiCurrencyDisplay amount={category.amount} currency="EGP" />
                          </div>
                          <div className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseReports;
