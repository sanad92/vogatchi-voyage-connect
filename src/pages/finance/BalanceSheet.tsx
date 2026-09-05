import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Landmark } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBalanceSheetV2, type BalanceSheetV2Row } from '@/hooks/useFinancialReports';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { downloadCsv } from '@/lib/reportCsv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fmt = (value: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function BalanceSheet() {
  usePageTitle('الميزانية العمومية');
  const navigate = useNavigate();
  const { hasPermission } = usePermissionCheck();
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const { data: rows = [], isLoading, error } = useBalanceSheetV2(asOf, currency);

  const report = useMemo(() => {
    const assets = rows.filter((row) => row.account_type === 'asset');
    const liabilities = rows.filter((row) => row.account_type === 'liability');
    const equity = rows.filter((row) => row.account_type === 'equity');
    const assetsTotal = sumRows(assets);
    const liabilitiesTotal = sumRows(liabilities);
    const equityTotal = sumRows(equity);
    const liabilitiesAndEquity = liabilitiesTotal + equityTotal;
    const difference = Math.abs(assetsTotal - liabilitiesAndEquity);
    return { assets, liabilities, equity, assetsTotal, liabilitiesTotal, equityTotal, liabilitiesAndEquity, difference };
  }, [rows]);

  const isBalanced = report.difference < 0.01;
  const canExport = hasPermission('reports_export');

  const openAccount = (row: BalanceSheetV2Row) => {
    if (row.is_current_earnings) return;
    const params = new URLSearchParams({ account: row.account_id, end: asOf, currency });
    navigate(`/general-ledger?${params.toString()}`);
  };

  const exportCsv = () => {
    const data: unknown[][] = [];
    appendCsvSection(data, 'الأصول', report.assets);
    data.push(['إجمالي الأصول', '', '', report.assetsTotal, currency]);
    appendCsvSection(data, 'الخصوم', report.liabilities);
    data.push(['إجمالي الخصوم', '', '', report.liabilitiesTotal, currency]);
    appendCsvSection(data, 'حقوق الملكية', report.equity);
    data.push(['إجمالي حقوق الملكية', '', '', report.equityTotal, currency]);
    data.push(['الخصوم + حقوق الملكية', '', '', report.liabilitiesAndEquity, currency]);
    data.push(['فرق الميزانية', '', '', report.difference, currency]);
    downloadCsv(`balance-sheet-${asOf}-${currency}.csv`, ['القسم', 'كود الحساب', 'اسم الحساب', 'الرصيد', 'العملة'], data);
  };

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader icon={Landmark} title="الميزانية العمومية" description="الأصول = الخصوم + حقوق الملكية كما في تاريخ محدد، من القيود المرحلة وبدون خلط العملات." />

      <Card>
        <CardContent className="pt-6 flex items-end gap-4 flex-wrap">
          <div className="space-y-1"><Label>كما في</Label><Input type="date" value={asOf} max={today} onChange={(event) => setAsOf(event.target.value)} /></div>
          <ReportCurrencySelect value={currency} onValueChange={setCurrency} />
          <Button variant="outline" onClick={exportCsv} disabled={!canExport || rows.length === 0} title={!canExport ? 'لا تملك صلاحية تصدير التقارير' : undefined}>
            <Download className="h-4 w-4 ml-2" />تصدير CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={`إجمالي الأصول (${currency})`} value={report.assetsTotal} />
        <SummaryCard label="إجمالي الخصوم" value={report.liabilitiesTotal} />
        <SummaryCard label="إجمالي حقوق الملكية" value={report.equityTotal} />
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">حالة الميزانية</CardTitle></CardHeader>
          <CardContent><Badge className={isBalanced ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}>{isBalanced ? 'متوازنة' : 'غير متوازنة'}</Badge><p className="text-xs text-muted-foreground mt-2">الفرق: {fmt(report.difference)} {currency}</p></CardContent>
        </Card>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground text-center py-8">جارٍ تحميل الميزانية العمومية…</p>
        : error ? <p className="text-sm text-destructive text-center py-8">تعذر تحميل الميزانية العمومية: {(error as Error).message}</p>
        : rows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد أرصدة مطابقة للتاريخ والعملة المحددين.</CardContent></Card>
        : <>
          {!isBalanced && <Card className="border-destructive/40 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">يوجد فرق قدره {fmt(report.difference)} {currency}. راجع القيود قبل الاعتماد أو الإقفال.</CardContent></Card>}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <BalanceSection title="الأصول" rows={report.assets} total={report.assetsTotal} onOpenAccount={openAccount} />
            <BalanceSection title="الخصوم" rows={report.liabilities} total={report.liabilitiesTotal} onOpenAccount={openAccount} />
            <BalanceSection title="حقوق الملكية" rows={report.equity} total={report.equityTotal} onOpenAccount={openAccount} />
          </div>
          <Card className={isBalanced ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}>
            <CardContent className="py-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <EquationValue label="الأصول" value={report.assetsTotal} currency={currency} />
              <div className="self-center text-xl font-bold text-muted-foreground">=</div>
              <EquationValue label="الخصوم + حقوق الملكية" value={report.liabilitiesAndEquity} currency={currency} />
            </CardContent>
          </Card>
        </>}
    </div>
  );
}

const sumRows = (rows: BalanceSheetV2Row[]) => rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);

const appendCsvSection = (target: unknown[][], section: string, rows: BalanceSheetV2Row[]) => {
  rows.forEach((row) => target.push([section, row.account_code, row.account_name_ar || row.account_name, row.balance, row.currency]));
};

function BalanceSection({ title, rows, total, onOpenAccount }: {
  title: string;
  rows: BalanceSheetV2Row[];
  total: number;
  onOpenAccount: (row: BalanceSheetV2Row) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between"><span>{title}</span><span className="text-xs font-normal text-muted-foreground">اضغط على الحساب لفتح الأستاذ</span></CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد أرصدة في هذا القسم.</p> : <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-left">الرصيد</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => <TableRow key={row.account_id} className={row.is_current_earnings ? '' : 'cursor-pointer hover:bg-muted/60'} onClick={() => openAccount(row)}>
              <TableCell className={`font-mono text-xs ${row.is_current_earnings ? '' : 'text-primary'}`}>{row.account_code}</TableCell>
              <TableCell className="font-medium">{row.account_name_ar || row.account_name}{row.is_current_earnings && <Badge variant="outline" className="mr-2 text-[10px]">محسوب تلقائيًا</Badge>}</TableCell>
              <TableCell className={`text-left font-mono ${Number(row.balance) < 0 ? 'text-destructive' : ''}`}>{fmt(row.balance)}</TableCell>
            </TableRow>)}
            <TableRow className="font-bold bg-muted/50"><TableCell colSpan={2}>إجمالي {title}</TableCell><TableCell className="text-left font-mono">{fmt(total)}</TableCell></TableRow>
          </TableBody>
        </Table></div>}
      </CardContent>
    </Card>
  );
}

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <Card><CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold font-mono ${value < 0 ? 'text-destructive' : ''}`}>{fmt(value)}</p></CardContent></Card>
);

const EquationValue = ({ label, value, currency }: { label: string; value: number; currency: string }) => (
  <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold font-mono">{fmt(value)} <small className="text-xs text-muted-foreground">{currency}</small></p></div>
);
