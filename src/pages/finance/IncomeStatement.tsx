import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingUp } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useIncomeStatementV2, type IncomeStatementV2Row } from '@/hooks/useFinancialReports';
import { useCostCenters } from '@/hooks/useCostCenters';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { downloadCsv } from '@/lib/reportCsv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fmt = (value: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const bookingTypeLabels: Record<string, string> = {
  hotel: 'فنادق',
  flight: 'طيران',
  transport: 'نقل',
  car_rental: 'تأجير سيارات',
};

export default function IncomeStatement() {
  usePageTitle('قائمة الدخل');
  const navigate = useNavigate();
  const { hasPermission } = usePermissionCheck();
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = `${today.slice(0, 4)}-01-01`;
  const [start, setStart] = useState(firstDay);
  const [end, setEnd] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const [costCenterId, setCostCenterId] = useState('all');
  const [bookingType, setBookingType] = useState('all');
  const { data: costCenters = [], isLoading: costCentersLoading } = useCostCenters();
  const invalidPeriod = start > end;
  const { data: rows = [], isLoading, error } = useIncomeStatementV2(
    start,
    end,
    currency,
    costCenterId === 'all' ? undefined : costCenterId,
    bookingType === 'all' ? undefined : bookingType,
  );

  const report = useMemo(() => {
    const revenue = rows.filter((row) => row.section === 'revenue');
    const costOfSales = rows.filter((row) => row.section === 'cost_of_sales');
    const operatingExpenses = rows.filter((row) => row.section === 'operating_expense');
    const revenueTotal = sumRows(revenue);
    const costOfSalesTotal = sumRows(costOfSales);
    const grossProfit = revenueTotal - costOfSalesTotal;
    const operatingExpensesTotal = sumRows(operatingExpenses);
    const netIncome = grossProfit - operatingExpensesTotal;
    const netMargin = revenueTotal === 0 ? 0 : (netIncome / revenueTotal) * 100;
    return { revenue, costOfSales, operatingExpenses, revenueTotal, costOfSalesTotal, grossProfit, operatingExpensesTotal, netIncome, netMargin };
  }, [rows]);

  const openAccount = (accountId: string) => {
    const params = new URLSearchParams({ account: accountId, start, end, currency });
    if (costCenterId !== 'all') params.set('costCenter', costCenterId);
    navigate(`/general-ledger?${params.toString()}`);
  };

  const exportCsv = () => {
    const data: unknown[][] = [];
    appendCsvSection(data, 'الإيرادات', report.revenue);
    data.push(['إجمالي الإيرادات', '', '', report.revenueTotal, currency]);
    appendCsvSection(data, 'تكلفة الخدمات', report.costOfSales);
    data.push(['إجمالي تكلفة الخدمات', '', '', report.costOfSalesTotal, currency]);
    data.push(['مجمل الربح', '', '', report.grossProfit, currency]);
    appendCsvSection(data, 'المصروفات التشغيلية', report.operatingExpenses);
    data.push(['إجمالي المصروفات التشغيلية', '', '', report.operatingExpensesTotal, currency]);
    data.push(['صافي الربح / الخسارة', '', '', report.netIncome, currency]);
    downloadCsv(`income-statement-${start}_${end}-${currency}.csv`, ['القسم', 'كود الحساب', 'اسم الحساب', 'المبلغ', 'العملة'], data);
  };

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader icon={TrendingUp} title="قائمة الدخل (الأرباح والخسائر)" description="الإيرادات وتكلفة الخدمات والمصروفات من القيود المرحلة خلال الفترة، بدون خلط العملات." />

      <Card>
        <CardContent className="pt-6 flex items-end gap-4 flex-wrap">
          <div className="space-y-1"><Label>من</Label><Input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} /></div>
          <div className="space-y-1"><Label>إلى</Label><Input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)} /></div>
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
          <div className="space-y-1 min-w-44">
            <Label>نوع الحجز</Label>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل أنواع الحجز</SelectItem>
                {Object.entries(bookingTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!hasPermission('reports_export') || rows.length === 0 || invalidPeriod} title={!hasPermission('reports_export') ? 'لا تملك صلاحية تصدير التقارير' : undefined}>
            <Download className="h-4 w-4 ml-2" />تصدير CSV
          </Button>
        </CardContent>
      </Card>

      {invalidPeriod && <p className="text-sm text-destructive">تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label={`الإيرادات (${currency})`} value={report.revenueTotal} tone="good" />
        <SummaryCard label="تكلفة الخدمات" value={report.costOfSalesTotal} />
        <SummaryCard label="مجمل الربح" value={report.grossProfit} tone={report.grossProfit >= 0 ? 'good' : 'bad'} />
        <SummaryCard label="المصروفات التشغيلية" value={report.operatingExpensesTotal} />
        <SummaryCard label={`صافي الربح (${fmt(report.netMargin)}%)`} value={report.netIncome} tone={report.netIncome >= 0 ? 'good' : 'bad'} />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground text-center py-8">جارٍ تحميل قائمة الدخل…</p>
        : error ? <p className="text-sm text-destructive text-center py-8">تعذر تحميل قائمة الدخل: {(error as Error).message}</p>
        : rows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد حركات أرباح وخسائر مطابقة للفلاتر.</CardContent></Card>
        : <div className="space-y-4">
          <StatementSection title="الإيرادات" rows={report.revenue} total={report.revenueTotal} totalLabel="إجمالي الإيرادات" onOpenAccount={openAccount} />
          <StatementSection title="تكلفة الخدمات المباشرة" rows={report.costOfSales} total={report.costOfSalesTotal} totalLabel="إجمالي تكلفة الخدمات" onOpenAccount={openAccount} />
          <ResultRow label="مجمل الربح" value={report.grossProfit} currency={currency} />
          <StatementSection title="المصروفات التشغيلية" rows={report.operatingExpenses} total={report.operatingExpensesTotal} totalLabel="إجمالي المصروفات التشغيلية" onOpenAccount={openAccount} />
          <ResultRow label="صافي الربح / الخسارة" value={report.netIncome} currency={currency} prominent />
        </div>}
    </div>
  );
}

const sumRows = (rows: IncomeStatementV2Row[]) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

const appendCsvSection = (target: unknown[][], section: string, rows: IncomeStatementV2Row[]) => {
  rows.forEach((row) => target.push([section, row.account_code, row.account_name_ar || row.account_name, row.amount, row.currency]));
};

function StatementSection({ title, rows, total, totalLabel, onOpenAccount }: {
  title: string;
  rows: IncomeStatementV2Row[];
  total: number;
  totalLabel: string;
  onOpenAccount: (accountId: string) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between"><span>{title}</span><span className="text-xs font-normal text-muted-foreground">اضغط على الحساب لفتح الأستاذ</span></CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حركات في هذا القسم.</p> : <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الحساب</TableHead><TableHead className="text-center">عدد القيود</TableHead><TableHead className="text-left">المبلغ</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => <TableRow key={row.account_id} className="cursor-pointer hover:bg-muted/60" onClick={() => onOpenAccount(row.account_id)}>
              <TableCell className="font-mono text-xs text-primary">{row.account_code}</TableCell>
              <TableCell className="font-medium">{row.account_name_ar || row.account_name}</TableCell>
              <TableCell className="text-center font-mono text-xs">{row.entry_count}</TableCell>
              <TableCell className={`text-left font-mono ${Number(row.amount) < 0 ? 'text-destructive' : ''}`}>{fmt(row.amount)}</TableCell>
            </TableRow>)}
            <TableRow className="font-bold bg-muted/50"><TableCell colSpan={3}>{totalLabel}</TableCell><TableCell className="text-left font-mono">{fmt(total)}</TableCell></TableRow>
          </TableBody>
        </Table></div>}
      </CardContent>
    </Card>
  );
}

const SummaryCard = ({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'bad' }) => (
  <Card><CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold font-mono ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : ''}`}>{fmt(value)}</p></CardContent></Card>
);

const ResultRow = ({ label, value, currency, prominent = false }: { label: string; value: number; currency: string; prominent?: boolean }) => (
  <Card className={prominent ? 'border-primary/40 bg-primary/5' : 'bg-muted/30'}><CardContent className="py-5 flex items-center justify-between"><span className={prominent ? 'text-lg font-bold' : 'font-semibold'}>{label}</span><span className={`${prominent ? 'text-2xl' : 'text-xl'} font-bold font-mono ${value >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(value)} <small className="text-xs text-muted-foreground">{currency}</small></span></CardContent></Card>
);
