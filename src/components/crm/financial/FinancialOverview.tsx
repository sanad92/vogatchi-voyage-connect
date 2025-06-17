
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';

const FinancialOverview = () => {
  const { expenseTransactions, bankAccounts, exchangeRates } = useFinancialData();

  // حساب الإحصائيات المالية
  const calculateStats = () => {
    if (!expenseTransactions || !bankAccounts) return null;

    const totalExpenses = expenseTransactions
      .filter(t => t.status === 'approved')
      .reduce((sum, t) => {
        const rate = t.currency === 'EGP' ? 1 : (exchangeRates?.find(r => r.from_currency === t.currency)?.rate || 1);
        return sum + (t.amount * rate);
      }, 0);

    const pendingExpenses = expenseTransactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => {
        const rate = t.currency === 'EGP' ? 1 : (exchangeRates?.find(r => r.from_currency === t.currency)?.rate || 1);
        return sum + (t.amount * rate);
      }, 0);

    const totalBankBalance = bankAccounts.reduce((sum, account) => {
      const rate = account.currency === 'EGP' ? 1 : (exchangeRates?.find(r => r.from_currency === account.currency)?.rate || 1);
      return sum + (account.current_balance * rate);
    }, 0);

    const expenseCategories = expenseTransactions
      .filter(t => t.status === 'approved')
      .reduce((acc, t) => {
        const categoryName = t.category?.name_ar || 'غير محدد';
        const rate = t.currency === 'EGP' ? 1 : (exchangeRates?.find(r => r.from_currency === t.currency)?.rate || 1);
        acc[categoryName] = (acc[categoryName] || 0) + (t.amount * rate);
        return acc;
      }, {} as Record<string, number>);

    return {
      totalExpenses,
      pendingExpenses,
      totalBankBalance,
      expenseCategories: Object.keys(expenseCategories).length,
    };
  };

  const stats = calculateStats();

  if (!stats) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.totalExpenses.toLocaleString()} ج.م
          </div>
          <p className="text-xs text-muted-foreground">المصروفات المعتمدة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مصروفات معلقة</CardTitle>
          <TrendingUp className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pendingExpenses.toLocaleString()} ج.م
          </div>
          <p className="text-xs text-muted-foreground">في انتظار الموافقة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الرصيد البنكي</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.totalBankBalance.toLocaleString()} ج.م
          </div>
          <p className="text-xs text-muted-foreground">إجمالي الأرصدة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">فئات المصروفات</CardTitle>
          <PieChart className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.expenseCategories}</div>
          <p className="text-xs text-muted-foreground">فئة نشطة</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialOverview;
