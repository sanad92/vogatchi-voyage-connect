import { useState, useMemo } from 'react';
import { useTrialBalance, useIncomeStatement, useBalanceSheet, useCashFlow, useCustomerAging } from '@/hooks/useFinancialReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(n);

const TYPE_AR: Record<string, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية',
  revenue: 'إيرادات', expense: 'مصروفات',
};

export default function AccountingReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [endDate, setEndDate] = useState(today);
  const [startDate, setStartDate] = useState(monthStart);
  const [isEnd, setIsEnd] = useState(today);

  const { data: trial = [] } = useTrialBalance(isEnd);
  const { data: income = [] } = useIncomeStatement(startDate, endDate);

  const incomeSummary = useMemo(() => {
    const revenue = income.filter(r => r.account_type === 'revenue').reduce((s, r) => s + Number(r.amount), 0);
    const expenses = income.filter(r => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [income]);

  const trialTotals = useMemo(() => {
    return trial.reduce((acc, r) => ({
      debit: acc.debit + Number(r.total_debit),
      credit: acc.credit + Number(r.total_credit),
    }), { debit: 0, credit: 0 });
  }, [trial]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          التقارير المحاسبية
        </h1>
        <p className="text-muted-foreground mt-1">ميزان المراجعة وقائمة الدخل</p>
      </div>

      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardContent className="pt-6 flex gap-4">
              <div>
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm">إجمالي الإيرادات</span>
                </div>
                <div className="text-2xl font-bold mt-2">{fmt(incomeSummary.revenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  <span className="text-sm">إجمالي المصروفات</span>
                </div>
                <div className="text-2xl font-bold mt-2">{fmt(incomeSummary.expenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">صافي الربح</div>
                <div className={`text-2xl font-bold mt-2 ${incomeSummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(incomeSummary.net)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>تفاصيل قائمة الدخل</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {income.map((r) => (
                    <TableRow key={r.account_code}>
                      <TableCell>
                        <Badge variant={r.account_type === 'revenue' ? 'default' : 'destructive'}>
                          {TYPE_AR[r.account_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs text-muted-foreground">{r.account_code}</div>
                        <div>{r.account_name_ar || r.account_name}</div>
                      </TableCell>
                      <TableCell className="text-left font-medium">{fmt(Number(r.amount))}</TableCell>
                    </TableRow>
                  ))}
                  {income.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">لا توجد بيانات في هذه الفترة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Label>حتى تاريخ</Label>
              <Input type="date" value={isEnd} onChange={(e) => setIsEnd(e.target.value)} className="max-w-xs" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ميزان المراجعة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-left">إجمالي مدين</TableHead>
                    <TableHead className="text-left">إجمالي دائن</TableHead>
                    <TableHead className="text-left">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trial.map((r) => (
                    <TableRow key={r.account_id}>
                      <TableCell className="font-mono">{r.account_code}</TableCell>
                      <TableCell>{r.account_name_ar || r.account_name}</TableCell>
                      <TableCell><Badge variant="outline">{TYPE_AR[r.account_type]}</Badge></TableCell>
                      <TableCell className="text-left">{fmt(Number(r.total_debit))}</TableCell>
                      <TableCell className="text-left">{fmt(Number(r.total_credit))}</TableCell>
                      <TableCell className={`text-left font-bold ${Number(r.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(Number(r.balance))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={3}>الإجمالي</TableCell>
                    <TableCell className="text-left">{fmt(trialTotals.debit)}</TableCell>
                    <TableCell className="text-left">{fmt(trialTotals.credit)}</TableCell>
                    <TableCell className="text-left">
                      {Math.abs(trialTotals.debit - trialTotals.credit) < 0.01 
                        ? <Badge className="bg-green-500/10 text-green-700">متوازن ✓</Badge>
                        : <Badge variant="destructive">غير متوازن</Badge>}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
