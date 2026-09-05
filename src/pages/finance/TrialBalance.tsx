import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Scale } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTrialBalanceV2 } from '@/hooks/useFinancialReports';
import { useCostCenters } from '@/hooks/useCostCenters';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { downloadCsv } from '@/lib/reportCsv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const typeLabel: Record<string, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
};

export default function TrialBalance() {
  usePageTitle('ميزان المراجعة');
  const navigate = useNavigate();
  const { hasPermission } = usePermissionCheck();
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const [costCenterId, setCostCenterId] = useState('all');
  const [hideZero, setHideZero] = useState(true);
  const { data: costCenters = [], isLoading: costCentersLoading } = useCostCenters();
  const { data: allRows = [], isLoading, error } = useTrialBalanceV2(
    asOfDate,
    currency,
    costCenterId === 'all' ? undefined : costCenterId,
  );

  const rows = useMemo(
    () => hideZero ? allRows.filter((row) => Math.abs(Number(row.balance)) >= 0.005) : allRows,
    [allRows, hideZero],
  );
  const totals = useMemo(() => {
    const debit = allRows.reduce((sum, row) => sum + Number(row.debit_balance || 0), 0);
    const credit = allRows.reduce((sum, row) => sum + Number(row.credit_balance || 0), 0);
    const movementsDebit = allRows.reduce((sum, row) => sum + Number(row.total_debit || 0), 0);
    const movementsCredit = allRows.reduce((sum, row) => sum + Number(row.total_credit || 0), 0);
    return { debit, credit, movementsDebit, movementsCredit, difference: Math.abs(debit - credit) };
  }, [allRows]);
  const isBalanced = totals.difference < 0.01;
  const canExport = hasPermission('reports_export');

  const openAccount = (accountId: string) => {
    const params = new URLSearchParams({ account: accountId, end: asOfDate, currency });
    if (costCenterId !== 'all') params.set('costCenter', costCenterId);
    navigate(`/general-ledger?${params.toString()}`);
  };

  const exportCsv = () => downloadCsv(
    `trial-balance-${asOfDate}-${currency}.csv`,
    ['كود الحساب', 'اسم الحساب', 'النوع', 'إجمالي الحركة المدينة', 'إجمالي الحركة الدائنة', 'رصيد مدين', 'رصيد دائن', 'العملة'],
    rows.map((row) => [
      row.account_code,
      row.account_name_ar || row.account_name,
      typeLabel[row.account_type] || row.account_type,
      row.total_debit,
      row.total_credit,
      row.debit_balance,
      row.credit_balance,
      row.currency,
    ]),
  );

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader icon={Scale} title="ميزان المراجعة" description="أرصدة الحسابات من القيود المرحلة حتى تاريخ محدد، مفصولة حسب العملة ومركز التكلفة." />

      <Card>
        <CardContent className="pt-6 flex items-end gap-4 flex-wrap">
          <div className="space-y-1"><Label>حتى تاريخ</Label><Input type="date" value={asOfDate} max={today} onChange={(event) => setAsOfDate(event.target.value)} /></div>
          <ReportCurrencySelect value={currency} onValueChange={setCurrency} />
          <div className="space-y-1 min-w-52">
            <Label>مركز التكلفة</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId} disabled={costCentersLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل مراكز التكلفة</SelectItem>
                {costCenters.filter((center) => center.is_active).map((center) => <SelectItem key={center.id} value={center.id}>{center.code} — {center.name_ar || center.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 h-10"><Switch id="hide-zero" checked={hideZero} onCheckedChange={setHideZero} /><Label htmlFor="hide-zero">إخفاء الأرصدة الصفرية</Label></div>
          <Button variant="outline" onClick={exportCsv} disabled={!canExport || rows.length === 0} title={!canExport ? 'لا تملك صلاحية تصدير التقارير' : undefined}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={`إجمالي الأرصدة المدينة (${currency})`} value={totals.debit} />
        <SummaryCard label="إجمالي الأرصدة الدائنة" value={totals.credit} />
        <SummaryCard label="الفرق" value={totals.difference} tone={isBalanced ? 'good' : 'bad'} />
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">حالة الميزان</CardTitle></CardHeader><CardContent><Badge className={isBalanced ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}>{isBalanced ? 'متوازن' : 'غير متوازن'}</Badge><p className="text-xs text-muted-foreground mt-2">الحركة: {fmt(totals.movementsDebit)} مدين / {fmt(totals.movementsCredit)} دائن</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between"><span>الحسابات</span><span className="text-xs font-normal text-muted-foreground">اضغط على الحساب لفتح الأستاذ</span></CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground text-center py-8">جارٍ التحميل…</p>
            : error ? <p className="text-sm text-destructive text-center py-8">تعذر تحميل ميزان المراجعة: {(error as Error).message}</p>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">لا توجد أرصدة مطابقة للفلاتر.</p>
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead><TableHead className="text-left">حركة مدينة</TableHead><TableHead className="text-left">حركة دائنة</TableHead><TableHead className="text-left">رصيد مدين</TableHead><TableHead className="text-left">رصيد دائن</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((row) => <TableRow key={row.account_id} className="cursor-pointer hover:bg-muted/60" onClick={() => openAccount(row.account_id)}>
                <TableCell className="font-mono text-xs text-primary">{row.account_code}</TableCell>
                <TableCell className="font-medium">{row.account_name_ar || row.account_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{typeLabel[row.account_type] || row.account_type}</Badge></TableCell>
                <TableCell className="text-left font-mono">{Number(row.total_debit) > 0 ? fmt(row.total_debit) : '—'}</TableCell>
                <TableCell className="text-left font-mono">{Number(row.total_credit) > 0 ? fmt(row.total_credit) : '—'}</TableCell>
                <TableCell className="text-left font-mono font-semibold">{Number(row.debit_balance) > 0 ? fmt(row.debit_balance) : '—'}</TableCell>
                <TableCell className="text-left font-mono font-semibold">{Number(row.credit_balance) > 0 ? fmt(row.credit_balance) : '—'}</TableCell>
              </TableRow>)}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

const SummaryCard = ({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'bad' }) => (
  <Card><CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold font-mono ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : ''}`}>{fmt(value)}</p></CardContent></Card>
);
