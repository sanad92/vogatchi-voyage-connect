import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Download } from 'lucide-react';
import { useBalanceSheet } from '@/hooks/useFinancialReports';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const sectionLabel: Record<string, string> = { asset: 'الأصول', liability: 'الخصوم', equity: 'حقوق الملكية' };

export default function BalanceSheet() {
  usePageTitle('الميزانية العمومية');
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const { data: rows = [], isLoading } = useBalanceSheet(asOf);

  const { assets, liabilities, equity, totals } = useMemo(() => {
    const a = rows.filter(r => r.account_type === 'asset');
    const l = rows.filter(r => r.account_type === 'liability');
    const e = rows.filter(r => r.account_type === 'equity');
    const at = a.reduce((s, r) => s + Number(r.balance || 0), 0);
    const lt = l.reduce((s, r) => s + Number(r.balance || 0), 0);
    const et = e.reduce((s, r) => s + Number(r.balance || 0), 0);
    return { assets: a, liabilities: l, equity: e, totals: { at, lt, et, le: lt + et } };
  }, [rows]);

  const exportCSV = () => {
    const lines = ['القسم,الكود,الاسم,الرصيد'];
    [['asset', assets], ['liability', liabilities], ['equity', equity]].forEach(([t, arr]: any) => {
      arr.forEach((r: any) => lines.push(`${sectionLabel[t]},${r.account_code},${r.account_name_ar || r.account_name},${r.balance}`));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance-sheet-${asOf}.csv`;
    a.click();
  };

  const Section = ({ title, items, total, tone }: any) => (
    <Card>
      <CardHeader><CardTitle className={tone}>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-left">الرصيد</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((r: any) => (
                <TableRow key={r.account_code}>
                  <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                  <TableCell>{r.account_name_ar || r.account_name}</TableCell>
                  <TableCell className="text-left font-mono">{fmt(r.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50"><TableCell colSpan={2}>الإجمالي</TableCell><TableCell className="text-left font-mono">{fmt(total)}</TableCell></TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const diff = Math.abs(totals.at - totals.le);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader icon={Landmark} title="الميزانية العمومية" description="الأصول = الخصوم + حقوق الملكية — لقطة كما في تاريخ محدد" />

      <Card>
        <CardContent className="pt-6 flex items-end gap-3 flex-wrap">
          <div><Label>كما في</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">إجمالي الأصول</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(totals.at)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">الخصوم + حقوق الملكية</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(totals.le)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">التوازن</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold font-mono ${diff < 0.01 ? 'text-emerald-600' : 'text-destructive'}`}>{diff < 0.01 ? 'متوازن ✓' : `فرق ${fmt(diff)}`}</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-center text-muted-foreground py-6">جارٍ التحميل…</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="الأصول" items={assets} total={totals.at} tone="text-primary" />
          <Section title="الخصوم" items={liabilities} total={totals.lt} tone="text-amber-600" />
          <Section title="حقوق الملكية" items={equity} total={totals.et} tone="text-emerald-600" />
        </div>
      )}
    </div>
  );
}
