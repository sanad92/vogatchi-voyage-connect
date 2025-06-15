
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, Download, PieChart, BarChart3, Calendar, DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useState } from 'react';

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

  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);

    // حساب إجمالي الرواتب
    const totalSalaries = monthlySalaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.net_salary, 0);

    // حساب إجمالي الإيجارات (تقديري - شهر واحد لكل عقد نشط)
    const totalRent = rentContracts
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + c.monthly_rent, 0);

    const totalExpenses = totalOtherExpenses + totalSalaries + totalRent;

    // تحليل حسب الفئة
    const categoryBreakdown = expenseCategories?.map(category => {
      const categoryExpenses = expenseTransactions
        .filter(t => t.category_id === category.id && t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
      
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
        color: '#green-600',
        percentage: totalExpenses > 0 ? (totalSalaries / totalExpenses) * 100 : 0
      },
      {
        name: 'الإيجارات',
        amount: totalRent,
        color: '#blue-600',
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

  const handleExportReport = () => {
    // يمكن تنفيذ منطق التصدير هنا
    console.log('Exporting expense report...');
  };

  if (categoriesLoading || transactionsLoading || salariesLoading || contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* فلاتر التقارير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تقارير المصروفات والحسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">الفترة الزمنية</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">الشهر الحالي</SelectItem>
                  <SelectItem value="last_month">الشهر السابق</SelectItem>
                  <SelectItem value="current_quarter">الربع الحالي</SelectItem>
                  <SelectItem value="current_year">السنة الحالية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الفئة</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {expenseCategories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExportReport} className="mt-6">
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">جميع المصروفات</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرواتب</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalaries.toLocaleString()} ر.س</div>
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
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRent.toLocaleString()} ر.س</div>
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
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOtherExpenses.toLocaleString()} ر.س</div>
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
            تحليل المصروفات حسب الفئة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.categoryBreakdown.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{category.amount.toLocaleString()} ر.س</div>
                  <div className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseReports;
