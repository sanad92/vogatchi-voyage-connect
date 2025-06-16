import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Target } from 'lucide-react';
import { useExpenseTransactions } from '@/hooks/useExpenseTransactions';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useEmployees } from '@/hooks/useEmployees';
import { useRentContracts } from '@/hooks/useRentContracts';
import { useSalaries } from '@/hooks/useSalaries';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

const FinancialDashboard = () => {
  const { transactions: expenseTransactions, isLoading: expensesLoading } = useExpenseTransactions();
  const { expenseCategories } = useExpenseCategories();
  const { employees } = useEmployees();
  const { rentContracts } = useRentContracts();
  const { monthlySalaries } = useSalaries();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // حساب الإحصائيات المالية
  const financialStats = useMemo(() => {
    const thisMonthExpenses = expenseTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      return transactionDate.getMonth() + 1 === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const lastMonthExpenses = expenseTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return transactionDate.getMonth() + 1 === lastMonth && 
             transactionDate.getFullYear() === lastMonthYear;
    });

    const thisMonthTotal = thisMonthExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const monthlyChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    // حساب إجمالي الرواتب للشهر الحالي - إصلاح الحقول
    const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    const thisMonthSalaries = monthlySalaries.filter(salary => {
      return salary.salary_month.startsWith(currentMonthStr);
    });
    const totalSalaries = thisMonthSalaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

    // حساب إجمالي الإيجارات للشهر الحالي
    const totalRent = rentContracts.reduce((sum, contract) => {
      if (contract.is_active) {
        return sum + Number(contract.monthly_rent || 0);
      }
      return sum;
    }, 0);

    return {
      thisMonthExpenses: thisMonthTotal,
      lastMonthExpenses: lastMonthTotal,
      monthlyChange,
      totalSalaries,
      totalRent,
      totalOperationalCosts: thisMonthTotal + totalSalaries + totalRent,
      expenseTransactions: thisMonthExpenses.length,
      pendingApprovals: thisMonthExpenses.filter(t => t.status === 'pending').length,
    };
  }, [expenseTransactions, monthlySalaries, rentContracts, currentMonth, currentYear]);

  // بيانات المصروفات الشهرية
  const monthlyExpensesData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const monthExpenses = expenseTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        return transactionDate.getMonth() + 1 === month && 
               transactionDate.getFullYear() === year;
      });

      months.push({
        month: date.toLocaleDateString('ar-EG', { month: 'short' }),
        amount: monthExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      });
    }
    return months;
  }, [expenseTransactions]);

  // بيانات المصروفات حسب الفئة
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map();
    
    expenseTransactions.forEach(transaction => {
      const categoryId = transaction.category_id;
      const category = expenseCategories.find(c => c.id === categoryId);
      const categoryName = category?.name_ar || 'غير محدد';
      
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName) + Number(transaction.amount || 0));
      } else {
        categoryMap.set(categoryName, Number(transaction.amount || 0));
      }
    });

    return Array.from(categoryMap.entries()).map(([name, amount]) => ({
      name,
      amount: Number(amount),
      color: expenseCategories.find(c => c.name_ar === name)?.color || '#8884d8'
    })).sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions, expenseCategories]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (expensesLoading) {
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
      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مصروفات هذا الشهر</p>
                <p className="text-2xl font-bold text-gray-900">
                  <EgyptianPoundDisplay amount={financialStats.thisMonthExpenses} />
                </p>
                <div className="flex items-center mt-2">
                  {financialStats.monthlyChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span className={`text-sm ${financialStats.monthlyChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(financialStats.monthlyChange).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 mr-1">عن الشهر الماضي</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الرواتب</p>
                <p className="text-2xl font-bold text-gray-900">
                  <EgyptianPoundDisplay amount={financialStats.totalSalaries} />
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {employees.filter(e => e.is_active).length} موظف نشط
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيجارات</p>
                <p className="text-2xl font-bold text-gray-900">
                  <EgyptianPoundDisplay amount={financialStats.totalRent} />
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {rentContracts.filter(c => c.is_active).length} عقد نشط
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">التكاليف التشغيلية</p>
                <p className="text-2xl font-bold text-gray-900">
                  <EgyptianPoundDisplay amount={financialStats.totalOperationalCosts} />
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-xs">
                    {financialStats.pendingApprovals} في انتظار الموافقة
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <PieChart className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المصروفات الشهرية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              المصروفات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyExpensesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'المبلغ']}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* المصروفات حسب الفئة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              المصروفات حسب الفئة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="amount"
                  data={expensesByCategory.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expensesByCategory.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'المبلغ']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* تفاصيل الفئات */}
      <Card>
        <CardHeader>
          <CardTitle>تفصيل المصروفات حسب الفئة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesByCategory.slice(0, 8).map((category, index) => (
              <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Progress 
                    value={(category.amount / expensesByCategory[0]?.amount) * 100} 
                    className="w-24"
                  />
                  <span className="font-bold text-lg min-w-[120px] text-right">
                    <EgyptianPoundDisplay amount={category.amount} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;
