
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseAnalyticsChart from './ExpenseAnalyticsChart';
import CashFlowAnalysis from './CashFlowAnalysis';
import BudgetVsActualReport from './BudgetVsActualReport';

const FinancialDashboard = () => {
  const { 
    expenseTransactions, 
    monthlySalaries, 
    rentContracts,
    transactionsLoading,
    salariesLoading,
    contractsLoading
  } = useExpenses();

  // حساب الإحصائيات المالية الرئيسية
  const calculateFinancialMetrics = () => {
    if (!expenseTransactions || !monthlySalaries || !rentContracts) {
      return {
        totalExpenses: 0,
        monthlyBudget: 0,
        savingsRate: 0,
        expenseGrowth: 0
      };
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // حساب إجمالي المصروفات للشهر الحالي
    const currentMonthExpenses = expenseTransactions
      .filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear &&
               t.status === 'paid';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // حساب إجمالي الرواتب للشهر الحالي
    const currentMonthSalaries = monthlySalaries
      .filter(s => {
        const salaryDate = new Date(s.salary_month);
        return salaryDate.getMonth() === currentMonth && 
               salaryDate.getFullYear() === currentYear &&
               s.status === 'paid';
      })
      .reduce((sum, s) => sum + s.net_salary, 0);

    // حساب إجمالي الإيجارات الشهرية
    const monthlyRent = rentContracts
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + c.monthly_rent, 0);

    const totalExpenses = currentMonthExpenses + currentMonthSalaries + monthlyRent;

    return {
      totalExpenses,
      monthlyBudget: totalExpenses * 1.2, // تقدير الميزانية
      savingsRate: Math.max(0, ((50000 - totalExpenses) / 50000) * 100), // معدل الادخار التقديري
      expenseGrowth: 5.2 // معدل نمو المصروفات التقديري
    };
  };

  const metrics = calculateFinancialMetrics();

  if (transactionsLoading || salariesLoading || contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* مؤشرات الأداء المالي الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات الشهرية</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalExpenses.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">للشهر الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الميزانية المخططة</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.monthlyBudget.toLocaleString()} ر.س</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalExpenses <= metrics.monthlyBudget ? 'ضمن الميزانية' : 'تجاوز الميزانية'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الادخار</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">من إجمالي الدخل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نمو المصروفات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">+{metrics.expenseGrowth}%</div>
            <p className="text-xs text-muted-foreground">مقارنة بالشهر السابق</p>
          </CardContent>
        </Card>
      </div>

      {/* التقارير التفصيلية */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">تحليل المصروفات</TabsTrigger>
          <TabsTrigger value="cashflow">التدفق النقدي</TabsTrigger>
          <TabsTrigger value="budget">الميزانية مقابل الفعلي</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <ExpenseAnalyticsChart />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowAnalysis />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetVsActualReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
