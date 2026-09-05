import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ExternalLink,
  Lock,
  Scale,
  TrendingUp,
} from 'lucide-react';
import {
  useCashFlowDetailsV2,
  useCashFlowV2,
  type CashFlowDetailRow,
} from '@/hooks/useFinancialReports';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCostCenters } from '@/hooks/useCostCenters';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { downloadCsv } from '@/lib/reportCsv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const today = new Date().toISOString().slice(0, 10);
const firstOfYear = `${today.slice(0, 4)}-01-01`;

const fmt = (value: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const bookingTypeLabels: Record<string, string> = {
  hotel: 'فنادق',
  flight: 'طيران',
  transport: 'نقل',
  car_rental: 'تأجير سيارات',
};

const categoryLabels: Record<CashFlowDetailRow['flow_category'], string> = {
  customer_collection: 'تحصيلات العملاء',
  supplier_payment: 'مدفوعات الموردين',
  operating_expense: 'مصروفات التشغيل',
  refund: 'المردودات والاستردادات',
  investing: 'أنشطة استثمارية',
  financing: 'أنشطة تمويلية',
  opening_adjustment: 'رصيد/تسوية افتتاحية',
  internal_transfer: 'تحويل داخلي',
  other: 'حركات أخرى',
};

export default function CashFlowDashboard() {
  usePageTitle('التدفقات النقدية');
  const { hasPermission } = usePermissionCheck();
  const { accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: costCenters = [], isLoading: costCentersLoading } = useCostCenters();
  const [start, setStart] = useState(firstOfYear);
  const [end, setEnd] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const [cashAccountId, setCashAccountId] = useState('all');
  const [costCenterId, setCostCenterId] = useState('all');
  const [bookingType, setBookingType] = useState('all');
  const invalidPeriod = start > end;
  const filters = {
    cashAccountId: cashAccountId === 'all' ? undefined : cashAccountId,
    costCenterId: costCenterId === 'all' ? undefined : costCenterId,
    bookingType: bookingType === 'all' ? undefined : bookingType,
  };
  const cashAccounts = accounts.filter((account) => account.is_active && ['1000', '1010'].includes(account.account_code));
  const selectedCashAccount = cashAccounts.find((account) => account.id === cashAccountId);
  const { data: daily = [], isLoading, error } = useCashFlowV2(start, end, currency, filters);
  const { data: details = [], isLoading: detailsLoading, error: detailsError } = useCashFlowDetailsV2(start, end, currency, filters);

  const totals = useMemo(() => {
    const opening = Number(daily[0]?.opening_balance || 0);
    const inflows = daily.reduce((sum, row) => sum + Number(row.inflows || 0), 0);
    const outflows = daily.reduce((sum, row) => sum + Number(row.outflows || 0), 0);
    const net = inflows - outflows;
    const closing = Number(daily.at(-1)?.closing_balance || opening + net);
    const entryCount = daily.reduce((sum, row) => sum + Number(row.entry_count || 0), 0);
    const operating = daily.reduce((sum, row) => sum + Number(row.operating_inflows || 0) - Number(row.operating_outflows || 0), 0);
    const investing = daily.reduce((sum, row) => sum + Number(row.investing_inflows || 0) - Number(row.investing_outflows || 0), 0);
    const financing = daily.reduce((sum, row) => sum + Number(row.financing_inflows || 0) - Number(row.financing_outflows || 0), 0);
    const other = daily.reduce((sum, row) => sum + Number(row.other_inflows || 0) - Number(row.other_outflows || 0), 0);
    const reconciliationDifference = closing - (opening + net);
    return { opening, inflows, outflows, net, closing, entryCount, operating, investing, financing, other, reconciliationDifference };
  }, [daily]);

  const exportCsv = () => downloadCsv(
    `cash-flow-${start}_${end}-${currency}.csv`,
    ['التاريخ', 'رقم القيد', 'الوصف', 'التصنيف', 'حساب النقدية', 'مركز التكلفة', 'وارد', 'صادر', 'الصافي', 'العملة'],
    details.map((row) => [
      row.entry_date,
      row.entry_number,
      row.description || '',
      categoryLabels[row.flow_category] || row.flow_category,
      row.cash_accounts,
      row.cost_centers,
      row.inflow,
      row.outflow,
      row.net_flow,
      row.currency,
    ]),
  );

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader
        icon={TrendingUp}
        title="قائمة التدفقات النقدية"
        description="حركة النقدية والبنوك من القيود المرحلة، مع رصيد افتتاحي وختامي ومطابقة كاملة لكل عملة."
      />

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 items-end">
          <div className="space-y-1"><Label>من</Label><Input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} /></div>
          <div className="space-y-1"><Label>إلى</Label><Input type="date" value={end} min={start} max={today} onChange={(event) => setEnd(event.target.value)} /></div>
          <ReportCurrencySelect value={currency} onValueChange={setCurrency} className="w-full" />
          <div className="space-y-1">
            <Label>حساب السيولة</Label>
            <Select value={cashAccountId} onValueChange={setCashAccountId} disabled={accountsLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">النقدية والبنوك</SelectItem>
                {cashAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.account_code} — {account.account_name_ar || account.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>مركز التكلفة</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId} disabled={costCentersLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل مراكز التكلفة</SelectItem>
                {costCenters.filter((center) => center.is_active).map((center) => <SelectItem key={center.id} value={center.id}>{center.code} — {center.name_ar || center.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>نوع الحجز</Label>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل أنواع الحجوزات</SelectItem>
                {Object.entries(bookingTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!hasPermission('reports_export') || details.length === 0 || invalidPeriod} title={!hasPermission('reports_export') ? 'لا تملك صلاحية تصدير التقارير' : undefined}>
            <Download className="h-4 w-4 ml-2" />تصدير CSV
          </Button>
        </CardContent>
      </Card>

      {invalidPeriod && <p className="text-sm text-destructive">تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard label={`الرصيد الافتتاحي (${currency})`} value={totals.opening} />
        <SummaryCard label="إجمالي الوارد" value={totals.inflows} tone="good" icon="in" />
        <SummaryCard label="إجمالي الصادر" value={totals.outflows} tone="bad" icon="out" />
        <SummaryCard label="صافي التدفق" value={totals.net} tone={totals.net >= 0 ? 'good' : 'bad'} />
        <SummaryCard label={`الرصيد الختامي (${currency})`} value={totals.closing} tone={totals.closing >= 0 ? 'good' : 'bad'} />
      </div>

      <Card className={Math.abs(totals.reconciliationDifference) < 0.01 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}>
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Scale className="h-5 w-5" /><span className="font-semibold">مطابقة الأستاذ:</span><span className="font-mono">{fmt(totals.opening)} + {fmt(totals.net)} = {fmt(totals.closing)} {currency}</span></div>
          <Badge className={Math.abs(totals.reconciliationDifference) < 0.01 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}>
            {Math.abs(totals.reconciliationDifference) < 0.01 ? 'مطابق' : `فرق ${fmt(totals.reconciliationDifference)}`}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CategoryCard label="التشغيل" value={totals.operating} currency={currency} />
        <CategoryCard label="الاستثمار" value={totals.investing} currency={currency} />
        <CategoryCard label="التمويل" value={totals.financing} currency={currency} />
        <CategoryCard label="أخرى/افتتاحية" value={totals.other} currency={currency} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الحركة اليومية</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-8 text-center text-muted-foreground">جارٍ تحميل التدفقات…</div>
            : error ? <div className="py-8 text-center text-destructive">تعذر تحميل التدفقات: {(error as Error).message}</div>
            : <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period_date" tickFormatter={(value: string) => value.slice(5)} interval="preserveStartEnd" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="inflows" stroke="#10b981" name="وارد" dot={false} />
                  <Line type="monotone" dataKey="outflows" stroke="#ef4444" name="صادر" dot={false} />
                  <Line type="monotone" dataKey="closing_balance" stroke="#3b82f6" name="الرصيد" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>تفاصيل الحركات</span>
            <span className="text-xs font-normal text-muted-foreground">{totals.entryCount} قيد • {selectedCashAccount ? selectedCashAccount.account_name_ar || selectedCashAccount.account_name : 'النقدية والبنوك'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailsLoading ? <div className="py-8 text-center text-muted-foreground">جارٍ تحميل تفاصيل القيود…</div>
            : detailsError ? <div className="py-8 text-center text-destructive">تعذر تحميل التفاصيل: {(detailsError as Error).message}</div>
            : details.length === 0 ? <div className="py-8 text-center text-muted-foreground">لا توجد حركة نقدية خلال الفترة المحددة.</div>
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>القيد</TableHead><TableHead>البيان</TableHead><TableHead>التصنيف</TableHead><TableHead>الحساب</TableHead><TableHead className="text-left">وارد</TableHead><TableHead className="text-left">صادر</TableHead><TableHead>الحجز</TableHead></TableRow></TableHeader>
              <TableBody>{details.map((row) => <TableRow key={row.entry_id}>
                <TableCell className="whitespace-nowrap">{row.entry_date}</TableCell>
                <TableCell><Link to={`/journal-entries?entry=${row.entry_id}`} className="font-mono text-xs text-primary hover:underline">{row.is_locked && <Lock className="inline h-3 w-3 text-amber-600 ml-1" />}{row.entry_number}</Link></TableCell>
                <TableCell className="max-w-xs truncate text-sm">{row.description || '—'}</TableCell>
                <TableCell><Badge variant="outline" className="whitespace-nowrap">{categoryLabels[row.flow_category] || row.flow_category}</Badge></TableCell>
                <TableCell className="text-xs whitespace-nowrap">{row.cash_accounts}{row.cost_centers ? <span className="block text-muted-foreground">{row.cost_centers}</span> : null}</TableCell>
                <TableCell className="text-left font-mono text-emerald-600">{Number(row.inflow) > 0 ? fmt(row.inflow) : '—'}</TableCell>
                <TableCell className="text-left font-mono text-destructive">{Number(row.outflow) > 0 ? fmt(row.outflow) : '—'}</TableCell>
                <TableCell>{row.booking_id ? <Link to={`/bookings/${row.booking_id}`} className="text-primary hover:underline text-xs inline-flex items-center gap-1">{row.booking_number || 'الحجز'}<ExternalLink className="h-3 w-3" /></Link> : '—'}</TableCell>
              </TableRow>)}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, tone, icon }: {
  label: string;
  value: number;
  tone?: 'good' | 'bad';
  icon?: 'in' | 'out';
}) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : '';
  return <Card><CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-1">{icon === 'in' && <ArrowDownRight className="h-4 w-4 text-emerald-600" />}{icon === 'out' && <ArrowUpRight className="h-4 w-4 text-destructive" />}{label}</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold font-mono ${color}`}>{fmt(value)}</p></CardContent></Card>;
}

const CategoryCard = ({ label, value, currency }: { label: string; value: number; currency: string }) => (
  <Card><CardHeader className="pb-1"><CardTitle className="text-sm">صافي {label}</CardTitle></CardHeader><CardContent><p className={`text-xl font-bold font-mono ${value >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(value)} <small className="text-xs text-muted-foreground">{currency}</small></p></CardContent></Card>
);
