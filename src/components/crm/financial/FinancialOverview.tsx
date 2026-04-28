import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { useIncomeStatement } from '@/hooks/useFinancialReports';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const FinancialOverview = () => {
  const today = new Date();
  const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd');

  // مصدر موحّد: قيود اليومية المرحّلة
  const { data: incomeStatement, isLoading } = useIncomeStatement(startDate, endDate);
  const { bankAccounts, exchangeRates } = useFinancialData();

  const totalRevenue = incomeStatement
    ?.filter((row) => row.account_type === 'revenue')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const totalExpenses = incomeStatement
    ?.filter((row) => row.account_type === 'expense')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

  const netProfit = totalRevenue - totalExpenses;

  const totalBankBalance = (bankAccounts || []).reduce((sum, account) => {
    const rate = account.currency === 'EGP'
      ? 1
      : (exchangeRates?.find((r) => r.from_currency === account.currency)?.rate || 1);
    return sum + (Number(account.current_balance || 0) * rate);
  }, 0);

  const fmt = (n: number) => `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">جاري تحميل البيانات المالية...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        <span>المصدر: قيود اليومية المرحّلة (دفتر الأستاذ)</span>
        <Badge variant="outline" className="text-xs">الشهر الحالي</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmt(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">من الفواتير والحجوزات</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fmt(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">تكلفة + رواتب + إيجار + عمولات</p>
          </CardContent>
        </Card>

        <Card className={netProfit >= 0 ? 'border-blue-200 dark:border-blue-900' : 'border-orange-200 dark:border-orange-900'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {fmt(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netProfit >= 0 ? 'ربح صافي' : 'خسارة صافية'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرصيد البنكي</CardTitle>
            <Wallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{fmt(totalBankBalance)}</div>
            <p className="text-xs text-muted-foreground">{bankAccounts?.length || 0} حساب نشط</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialOverview;
