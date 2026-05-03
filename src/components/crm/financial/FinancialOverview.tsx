import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { useIncomeStatement } from '@/hooks/useFinancialReports';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useActiveCurrencies } from '@/hooks/useActiveCurrencies';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency } from '@/types/currency';

const FinancialOverview = () => {
  const today = new Date();
  const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(today), 'yyyy-MM-dd');

  const { data: activeCurrencies = [] } = useActiveCurrencies();
  const currencies: SupportedCurrency[] = useMemo(() => {
    const list = activeCurrencies.map((c) => c.currency);
    return list.length ? list : ['EGP'];
  }, [activeCurrencies]);

  const [selected, setSelected] = useState<SupportedCurrency>(currencies[0]);
  const activeCurrency = currencies.includes(selected) ? selected : currencies[0];

  const { data: incomeStatement, isLoading } = useIncomeStatement(startDate, endDate, activeCurrency);
  const { bankAccounts } = useFinancialData();

  const totalRevenue = (incomeStatement || [])
    .filter((row) => row.account_type === 'revenue')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const totalExpenses = (incomeStatement || [])
    .filter((row) => row.account_type === 'expense')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const netProfit = totalRevenue - totalExpenses;

  const bankByCurrency = (bankAccounts || [])
    .filter((a) => a.currency === activeCurrency)
    .reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

  const bankCount = (bankAccounts || []).filter((a) => a.currency === activeCurrency).length;

  const fmt = (n: number) =>
    `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[activeCurrency]}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        <span>المصدر: قيود اليومية المرحّلة (دفتر الأستاذ)</span>
        <Badge variant="outline" className="text-xs">الشهر الحالي</Badge>
      </div>

      <Tabs value={activeCurrency} onValueChange={(v) => setSelected(v as SupportedCurrency)}>
        <TabsList className="flex flex-wrap h-auto">
          {currencies.map((c) => (
            <TabsTrigger key={c} value={c} className="gap-1">
              <span>{CURRENCY_NAMES[c]}</span>
              <span className="text-xs text-muted-foreground">({CURRENCY_SYMBOLS[c]})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {currencies.map((c) => (
          <TabsContent key={c} value={c} className="mt-3">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">جاري تحميل البيانات المالية...</div>
            ) : (
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
                    <div className="text-2xl font-bold text-purple-600">{fmt(bankByCurrency)}</div>
                    <p className="text-xs text-muted-foreground">{bankCount} حساب بهذه العملة</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default FinancialOverview;
