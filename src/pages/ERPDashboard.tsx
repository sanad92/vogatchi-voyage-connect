import { Link } from 'react-router-dom';
import { useTrialBalance, useIncomeStatement } from '@/hooks/useFinancialReports';
import { useJournalEntries } from '@/hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, BookOpen, FileText, BarChart3, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useMemo } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(n);

export default function ERPDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

  const { data: monthIncome = [] } = useIncomeStatement(monthStart, today);
  const { data: yearIncome = [] } = useIncomeStatement(yearStart, today);
  const { data: trial = [] } = useTrialBalance(today);
  const { data: recentEntries = [] } = useJournalEntries(10);

  const monthSummary = useMemo(() => {
    const revenue = monthIncome.filter(r => r.account_type === 'revenue').reduce((s, r) => s + Number(r.amount), 0);
    const expenses = monthIncome.filter(r => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [monthIncome]);

  const yearSummary = useMemo(() => {
    const revenue = yearIncome.filter(r => r.account_type === 'revenue').reduce((s, r) => s + Number(r.amount), 0);
    const expenses = yearIncome.filter(r => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    return { revenue, expenses, net: revenue - expenses };
  }, [yearIncome]);

  const cashBalance = useMemo(() => {
    return trial.filter(r => ['1000', '1010'].includes(r.account_code))
      .reduce((s, r) => s + Number(r.balance), 0);
  }, [trial]);

  const receivables = useMemo(() => {
    return trial.filter(r => r.account_code === '1100').reduce((s, r) => s + Number(r.balance), 0);
  }, [trial]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            لوحة ERP المالية
          </h1>
          <p className="text-muted-foreground mt-1">نظرة شاملة على الوضع المالي للمؤسسة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/chart-of-accounts"><BookOpen className="h-4 w-4 mr-2" />شجرة الحسابات</Link></Button>
          <Button variant="outline" asChild><Link to="/journal-entries"><FileText className="h-4 w-4 mr-2" />القيود</Link></Button>
          <Button asChild><Link to="/accounting-reports"><BarChart3 className="h-4 w-4 mr-2" />التقارير</Link></Button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-3">هذا الشهر</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600"><TrendingUp className="h-5 w-5" /><span className="text-sm">إيرادات</span></div>
            <div className="text-2xl font-bold mt-2">{fmt(monthSummary.revenue)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600"><TrendingDown className="h-5 w-5" /><span className="text-sm">مصروفات</span></div>
            <div className="text-2xl font-bold mt-2">{fmt(monthSummary.expenses)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary"><DollarSign className="h-5 w-5" /><span className="text-sm">صافي الربح</span></div>
            <div className={`text-2xl font-bold mt-2 ${monthSummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(monthSummary.net)}</div>
          </CardContent></Card>
        </div>
      </div>

      {/* Year Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-3">منذ بداية السنة</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">إيرادات سنوية</div>
            <div className="text-xl font-bold mt-1 text-green-600">{fmt(yearSummary.revenue)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">مصروفات سنوية</div>
            <div className="text-xl font-bold mt-1 text-red-600">{fmt(yearSummary.expenses)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-600"><Wallet className="h-4 w-4" /><span className="text-sm">رصيد النقدية</span></div>
            <div className="text-xl font-bold mt-1">{fmt(cashBalance)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">ذمم العملاء</div>
            <div className="text-xl font-bold mt-1">{fmt(receivables)}</div>
          </CardContent></Card>
        </div>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader><CardTitle>آخر القيود المحاسبية</CardTitle></CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              لا توجد قيود بعد. القيود تُنشأ تلقائياً عند إصدار فواتير أو مصروفات جديدة.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEntries.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{e.entry_number}</div>
                    <div className="text-sm">{e.description}</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{fmt(e.total_debit)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.entry_date).toLocaleDateString('ar-EG')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
