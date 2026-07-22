import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Download } from 'lucide-react';
import { useIncomeStatement } from '@/hooks/useFinancialReports';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function IncomeStatement() {
  usePageTitle('قائمة الدخل');
  const today = new Date();
  const first = new Date(today.getFullYear(), 0, 1);
  const [start, setStart] = useState(first.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today.toISOString().slice(0, 10));
  const { data: rows = [], isLoading } = useIncomeStatement(start, end);

  const { revenue, expenses, netIncome } = useMemo(() => {
    const rev = rows.filter(r => r.account_type === 'revenue');
    const exp = rows.filter(r => r.account_type === 'expense');
    const revTotal = rev.reduce((s, r) => s + Number(r.amount || 0), 0);
    const expTotal = exp.reduce((s, r) => s + Number(r.amount || 0), 0);
    return { revenue: rev, expenses: exp, netIncome: revTotal - expTotal, revTotal, expTotal };
  }, [rows]);

  const revTotal = revenue.reduce((s, r) => s + Number(r.amount || 0), 0);
  const expTotal = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);

  const exportCSV = () => {
    const lines = ['القسم,الكود,الاسم,المبلغ'];
    revenue.forEach(r => lines.push(`إيرادات,${r.account_code},${r.account_name_ar || r.account_name},${r.amount}`));
    lines.push(`إجمالي الإيرادات,,,${revTotal}`);
    expenses.forEach(r => lines.push(`مصروفات,${r.account_code},${r.account_name_ar || r.account_name},${r.amount}`));
    lines.push(`إجمالي المصروفات,,,${expTotal}`);
    lines.push(`صافي الربح,,,${netIncome}`);
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `income-statement-${start}_${end}.csv`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader icon={TrendingUp} title="قائمة الدخل (الأرباح والخسائر)" description="الإيرادات ناقص المصروفات = صافي الربح للفترة" />

      <Card>
        <CardContent className="pt-6 flex items-end gap-3 flex-wrap">
          <div><Label>من</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>إلى</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">الإيرادات</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono text-emerald-600">{fmt(revTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">المصروفات</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono text-destructive">{fmt(expTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">صافي الربح</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold font-mono ${netIncome >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(netIncome)}</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-6">جارٍ التحميل…</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-emerald-600">الإيرادات</CardTitle></CardHeader>
            <CardContent>
              {revenue.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-left">المبلغ</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {revenue.map(r => (
                      <TableRow key={r.account_code}><TableCell className="font-mono text-xs">{r.account_code}</TableCell><TableCell>{r.account_name_ar || r.account_name}</TableCell><TableCell className="text-left font-mono">{fmt(r.amount)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50"><TableCell colSpan={2}>الإجمالي</TableCell><TableCell className="text-left font-mono">{fmt(revTotal)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-destructive">المصروفات</CardTitle></CardHeader>
            <CardContent>
              {expenses.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-left">المبلغ</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {expenses.map(r => (
                      <TableRow key={r.account_code}><TableCell className="font-mono text-xs">{r.account_code}</TableCell><TableCell>{r.account_name_ar || r.account_name}</TableCell><TableCell className="text-left font-mono">{fmt(r.amount)}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50"><TableCell colSpan={2}>الإجمالي</TableCell><TableCell className="text-left font-mono">{fmt(expTotal)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
