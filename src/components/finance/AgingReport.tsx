import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, Download, ExternalLink, Users } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useAgingControlTotals,
  useCustomerAgingDetails,
  useSupplierAgingDetails,
  type AgingDetailRow,
} from '@/hooks/useFinancialReports';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { downloadCsv } from '@/lib/reportCsv';

type AgingKind = 'customer' | 'supplier';
type Bucket = AgingDetailRow['aging_bucket'];

interface EntitySummary {
  id: string;
  name: string;
  invoiceCount: number;
  oldestDueDate: string;
  total: number;
  buckets: Record<Bucket, number>;
}

const emptyBuckets = (): Record<Bucket, number> => ({
  current: 0,
  '1-30': 0,
  '31-60': 0,
  '61-90': 0,
  'over-90': 0,
});

const fmt = (value: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG').format(new Date(`${value}T00:00:00`));

export default function AgingReport({ kind }: { kind: AgingKind }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissionCheck();
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const customerQuery = useCustomerAgingDetails(asOf, currency, kind === 'customer');
  const supplierQuery = useSupplierAgingDetails(asOf, currency, kind === 'supplier');
  const activeQuery = kind === 'customer' ? customerQuery : supplierQuery;
  const { data: controls = [], isLoading: controlsLoading, error: controlsError } = useAgingControlTotals(asOf, currency);
  const rows = useMemo(() => activeQuery.data || [], [activeQuery.data]);
  const control = controls.find((row) => row.entity_type === kind);

  const copy = kind === 'customer'
    ? { title: 'أعمار ديون العملاء', description: 'الفواتير المفتوحة والتحصيلات موزعة حسب مدة التأخر، مع مطابقة حساب الذمم 1100.', entity: 'العميل', ledger: '/customer-ledger', icon: Users }
    : { title: 'أعمار ديون الموردين', description: 'فواتير الموردين المفتوحة والمدفوعات موزعة حسب مدة التأخر، مع مطابقة حساب الذمم 2000.', entity: 'المورد', ledger: '/supplier-ledger', icon: Building2 };

  const summaries = useMemo(() => {
    const map = new Map<string, EntitySummary>();
    rows.forEach((row) => {
      const id = entityKey(row, kind);
      const name = (kind === 'customer' ? row.customer_name : row.supplier_name) || `${copy.entity} غير محدد`;
      const current = map.get(id) || { id, name, invoiceCount: 0, oldestDueDate: row.due_date, total: 0, buckets: emptyBuckets() };
      current.invoiceCount += 1;
      current.oldestDueDate = current.oldestDueDate < row.due_date ? current.oldestDueDate : row.due_date;
      current.total += Number(row.outstanding_amount || 0);
      current.buckets[row.aging_bucket] += Number(row.outstanding_amount || 0);
      map.set(id, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [copy.entity, kind, rows]);

  const totals = useMemo(() => summaries.reduce((result, row) => {
    result.total += row.total;
    (Object.keys(result.buckets) as Bucket[]).forEach((bucket) => { result.buckets[bucket] += row.buckets[bucket]; });
    return result;
  }, { total: 0, buckets: emptyBuckets() }), [summaries]);

  const selectedRows = useMemo(() => rows.filter((row) => {
    return entityKey(row, kind) === selectedEntity;
  }), [kind, rows, selectedEntity]);

  const openLedger = (id: string) => {
    if (id.startsWith('unassigned-')) return;
    navigate(`${copy.ledger}?${new URLSearchParams({ id }).toString()}`);
  };

  const exportCsv = () => downloadCsv(
    `${kind}-aging-${asOf}-${currency}.csv`,
    [copy.entity, 'رقم الفاتورة', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'قيمة الفاتورة', 'المسدد حتى التاريخ', 'الرصيد', 'أيام التأخر', 'الشريحة', 'العملة'],
    rows.map((row) => [
      kind === 'customer' ? row.customer_name : row.supplier_name,
      row.invoice_number,
      row.issued_date,
      row.due_date,
      row.original_amount,
      row.paid_as_of,
      row.outstanding_amount,
      row.days_overdue,
      bucketLabel(row.aging_bucket),
      row.currency,
    ]),
  );

  const isLoading = activeQuery.isLoading || controlsLoading;
  const error = activeQuery.error || controlsError;
  const isMatched = control ? Math.abs(Number(control.difference)) < 0.01 : false;

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader icon={copy.icon} title={copy.title} description={copy.description} />

      <Card><CardContent className="pt-6 flex items-end gap-4 flex-wrap">
        <div className="space-y-1"><Label>كما في</Label><Input type="date" value={asOf} max={today} onChange={(event) => { setAsOf(event.target.value); setSelectedEntity(null); }} /></div>
        <ReportCurrencySelect value={currency} onValueChange={(value) => { setCurrency(value); setSelectedEntity(null); }} />
        <Button variant="outline" onClick={exportCsv} disabled={!hasPermission('reports_export') || rows.length === 0} title={!hasPermission('reports_export') ? 'لا تملك صلاحية تصدير التقارير' : undefined}>
          <Download className="h-4 w-4 ml-2" />تصدير تفاصيل CSV
        </Button>
      </CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={`إجمالي الرصيد (${currency})`} value={totals.total} />
        <SummaryCard label="غير مستحق" value={totals.buckets.current} />
        <SummaryCard label="إجمالي المتأخر" value={totals.total - totals.buckets.current} tone="warning" />
        <SummaryCard label="أكثر من 90 يومًا" value={totals.buckets['over-90']} tone="danger" />
      </div>

      {control && <Card className={isMatched ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}>
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isMatched ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
            <div><p className="font-semibold">{isMatched ? 'متطابق مع الأستاذ العام' : 'يوجد فرق مع حساب المراقبة'}</p><p className="text-xs text-muted-foreground">رصيد التقرير {fmt(control.aging_total)} مقابل حساب الذمم {fmt(control.control_balance)} {currency}</p></div>
          </div>
          <Badge variant="outline" className={isMatched ? 'text-emerald-700' : 'text-amber-700'}>الفرق: {fmt(control.difference)} {currency}</Badge>
        </CardContent>
      </Card>}

      {!!control && (control.historical_estimate_count > 0 || control.corrected_date_count > 0) && <Card className="border-amber-500/30"><CardContent className="py-3 text-sm text-amber-800">
        {control.historical_estimate_count > 0 && <span>يوجد {control.historical_estimate_count} فاتورة قديمة بلا تاريخ تخصيص سداد؛ الرصيد التاريخي تقديري. </span>}
        {control.corrected_date_count > 0 && <span>تم استخدام تاريخ الفاتورة بدل تاريخ استحقاق غير صالح في {control.corrected_date_count} فاتورة.</span>}
      </CardContent></Card>}

      {isLoading ? <p className="text-sm text-muted-foreground text-center py-10">جارٍ تحميل التقرير…</p>
        : error ? <p className="text-sm text-destructive text-center py-10">تعذر تحميل التقرير: {(error as Error).message}</p>
        : summaries.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد فواتير مفتوحة مطابقة للتاريخ والعملة.</CardContent></Card>
        : <Card>
          <CardHeader><CardTitle className="text-base">ملخص حسب {copy.entity} <span className="text-xs font-normal text-muted-foreground">— اضغط على الصف لعرض الفواتير</span></CardTitle></CardHeader>
          <CardContent className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>{copy.entity}</TableHead><TableHead>الفواتير</TableHead><TableHead>أقدم استحقاق</TableHead><TableHead className="text-left">غير مستحق</TableHead><TableHead className="text-left">1–30</TableHead><TableHead className="text-left">31–60</TableHead><TableHead className="text-left">61–90</TableHead><TableHead className="text-left">+90</TableHead><TableHead className="text-left">الإجمالي</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{summaries.map((row) => <TableRow key={row.id} className={`cursor-pointer ${selectedEntity === row.id ? 'bg-muted/70' : ''}`} onClick={() => setSelectedEntity(selectedEntity === row.id ? null : row.id)}>
              <TableCell className="font-medium text-primary">{row.name}</TableCell><TableCell>{row.invoiceCount}</TableCell><TableCell>{formatDate(row.oldestDueDate)}</TableCell>
              <Money value={row.buckets.current} /><Money value={row.buckets['1-30']} /><Money value={row.buckets['31-60']} /><Money value={row.buckets['61-90']} /><Money value={row.buckets['over-90']} danger />
              <Money value={row.total} strong /><TableCell><Button size="sm" variant="ghost" disabled={row.id.startsWith('unassigned-')} onClick={(event) => { event.stopPropagation(); openLedger(row.id); }}><ExternalLink className="h-4 w-4 ml-1" />كشف الحساب</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table></CardContent>
        </Card>}

      {selectedEntity && selectedRows.length > 0 && <Card>
        <CardHeader><CardTitle className="text-base">تفاصيل الفواتير — {kind === 'customer' ? selectedRows[0].customer_name : selectedRows[0].supplier_name}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>الفاتورة</TableHead><TableHead>التاريخ</TableHead><TableHead>الاستحقاق</TableHead><TableHead className="text-left">الأصل</TableHead><TableHead className="text-left">المسدد</TableHead><TableHead className="text-left">الرصيد</TableHead><TableHead>التأخر</TableHead><TableHead>الشريحة</TableHead></TableRow></TableHeader>
          <TableBody>{selectedRows.map((row) => <TableRow key={row.invoice_id}>
            <TableCell className="font-mono">{row.invoice_number || '—'}</TableCell><TableCell>{formatDate(row.issued_date)}</TableCell><TableCell>{formatDate(row.due_date)}{row.is_date_corrected && <Badge variant="outline" className="mr-2 text-[10px]">مصَحح</Badge>}</TableCell>
            <Money value={row.original_amount} /><Money value={row.paid_as_of} /><Money value={row.outstanding_amount} strong />
            <TableCell>{row.days_overdue ? `${row.days_overdue} يوم` : 'غير متأخرة'}</TableCell><TableCell><Badge variant="outline">{bucketLabel(row.aging_bucket)}</Badge></TableCell>
          </TableRow>)}</TableBody>
        </Table></CardContent>
      </Card>}
    </div>
  );
}

const bucketLabel = (bucket: Bucket) => ({ current: 'غير مستحق', '1-30': '1–30 يوم', '31-60': '31–60 يوم', '61-90': '61–90 يوم', 'over-90': 'أكثر من 90 يومًا' })[bucket];

const entityKey = (row: AgingDetailRow, kind: AgingKind) =>
  (kind === 'customer' ? row.customer_id : row.supplier_id) || `unassigned-${row.invoice_id}`;

const Money = ({ value, strong = false, danger = false }: { value: number; strong?: boolean; danger?: boolean }) => (
  <TableCell className={`text-left font-mono ${strong ? 'font-bold' : ''} ${danger && value > 0 ? 'text-destructive' : ''}`}>{fmt(value)}</TableCell>
);

const SummaryCard = ({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'danger' }) => (
  <Card><CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold font-mono ${tone === 'danger' && value > 0 ? 'text-destructive' : tone === 'warning' && value > 0 ? 'text-amber-700' : ''}`}>{fmt(value)}</p></CardContent></Card>
);
