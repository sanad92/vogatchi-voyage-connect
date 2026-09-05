import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Download, ExternalLink, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCostCenters } from '@/hooks/useCostCenters';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { downloadCsv } from '@/lib/reportCsv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GLRow {
  entry_id: string;
  line_id: string;
  entry_date: string;
  entry_number: string;
  description: string | null;
  line_description: string | null;
  source_type: string | null;
  source_id: string | null;
  booking_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  cost_center_id: string | null;
  cost_center_code: string | null;
  cost_center_name: string | null;
  debit: number;
  credit: number;
  movement: number;
  opening_balance: number;
  running_balance: number;
  currency: string;
  status: string;
  is_locked: boolean;
}

interface GLSummary {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  net_movement: number;
  closing_balance: number;
  transaction_count: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const today = new Date();
const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

const sourceLink = (row: GLRow): { href: string; label: string } | null => {
  const sourceType = row.source_type || row.reference_type;
  const sourceId = row.source_id || row.reference_id;
  if (row.booking_id) return { href: `/bookings/${row.booking_id}`, label: 'الحجز' };
  if (sourceType === 'invoice' && sourceId) return { href: `/invoices?id=${sourceId}`, label: 'الفاتورة' };
  if (sourceType === 'customer_payment') return { href: '/customer-ledger', label: 'تحصيل العميل' };
  if (sourceType === 'supplier_invoice' || sourceType === 'supplier_payment') return { href: '/supplier-ledger', label: 'حساب المورد' };
  if (sourceType === 'expense') return { href: '/expenses', label: 'المصروف' };
  return null;
};

export default function GeneralLedger() {
  usePageTitle('دفتر الأستاذ العام');
  const orgId = useOrgId();
  const { hasPermission } = usePermissionCheck();
  const { accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: costCenters = [], isLoading: costCentersLoading } = useCostCenters();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accountId, setAccountId] = useState(searchParams.get('account') || '');
  const [start, setStart] = useState(searchParams.get('start') || firstOfYear);
  const [end, setEnd] = useState(searchParams.get('end') || todayStr);
  const [currency, setCurrency] = useState(searchParams.get('currency') || 'EGP');
  const [costCenterId, setCostCenterId] = useState(searchParams.get('costCenter') || 'all');

  const setFilter = (key: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const ledger = useQuery({
    queryKey: ['general-ledger-v2', orgId, accountId, start, end, currency, costCenterId],
    queryFn: async () => {
      if (!orgId || !accountId) return { rows: [] as GLRow[], summary: null as GLSummary | null };
      const args = {
        _org_id: orgId,
        _account_id: accountId,
        _start_date: start || undefined,
        _end_date: end || undefined,
        _currency: currency,
        _cost_center_id: costCenterId === 'all' ? undefined : costCenterId,
      };
      const [rowsResult, summaryResult] = await Promise.all([
        supabase.rpc('get_general_ledger_v2', args),
        supabase.rpc('get_general_ledger_summary_v2', args),
      ]);
      if (rowsResult.error) throw rowsResult.error;
      if (summaryResult.error) throw summaryResult.error;
      return {
        rows: (rowsResult.data || []) as GLRow[],
        summary: (summaryResult.data?.[0] || null) as GLSummary | null,
      };
    },
    enabled: !!orgId && !!accountId,
  });

  const rows = useMemo(() => ledger.data?.rows || [], [ledger.data?.rows]);
  const summary = ledger.data?.summary;
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedCostCenter = costCenters.find((center) => center.id === costCenterId);
  const canExport = hasPermission('reports_export');
  const exportRows = useMemo(() => rows.map((row) => [
    row.entry_date, row.entry_number, row.line_description || row.description || '',
    row.source_type || row.reference_type || '', row.cost_center_code || '',
    row.debit, row.credit, row.running_balance, row.currency,
  ]), [rows]);

  const exportCsv = () => downloadCsv(
    `general-ledger-${selectedAccount?.account_code || 'account'}-${start}-${end}-${currency}.csv`,
    ['التاريخ', 'رقم القيد', 'الوصف', 'المصدر', 'مركز التكلفة', 'مدين', 'دائن', 'الرصيد', 'العملة'],
    exportRows,
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <PageHeader icon={BookOpen} title="دفتر الأستاذ العام" description="حركات الحساب من القيود المرحلة فقط، مفصولة حسب العملة مع رصيد افتتاحي وتراكمي." />

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>الحساب</Label>
            <Select value={accountId} onValueChange={(value) => setFilter('account', value, setAccountId)} disabled={accountsLoading}>
              <SelectTrigger><SelectValue placeholder="اختر حسابًا من دليل الحسابات" /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {accounts.map((account) => <SelectItem key={account.id} value={account.id}><span className="font-mono text-xs text-muted-foreground ml-2">{account.account_code}</span>{account.account_name_ar || account.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ReportCurrencySelect value={currency} onValueChange={(value) => setFilter('currency', value, setCurrency)} className="w-full" />
          <div className="space-y-1">
            <Label>مركز التكلفة</Label>
            <Select value={costCenterId} onValueChange={(value) => setFilter('costCenter', value, setCostCenterId)} disabled={costCentersLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل مراكز التكلفة</SelectItem>
                {costCenters.filter((center) => center.is_active).map((center) => <SelectItem key={center.id} value={center.id}>{center.code} — {center.name_ar || center.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} max={end || undefined} onChange={(event) => setFilter('start', event.target.value, setStart)} /></div>
          <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} min={start || undefined} onChange={(event) => setFilter('end', event.target.value, setEnd)} /></div>
        </CardContent>
      </Card>

      {accountId && <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <KPI label="الرصيد الافتتاحي" value={fmt(summary?.opening_balance || 0)} />
        <KPI label="إجمالي المدين" value={fmt(summary?.total_debit || 0)} tone="good" />
        <KPI label="إجمالي الدائن" value={fmt(summary?.total_credit || 0)} tone="warn" />
        <KPI label="صافي الحركة" value={fmt(summary?.net_movement || 0)} />
        <KPI label="الرصيد الختامي" value={fmt(summary?.closing_balance || 0)} tone="good" />
      </div>}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle>{selectedAccount ? `${selectedAccount.account_code} — ${selectedAccount.account_name_ar || selectedAccount.account_name}` : 'حركات الحساب'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{currency}{selectedCostCenter ? ` • ${selectedCostCenter.name_ar || selectedCostCenter.name}` : ''}{summary ? ` • ${summary.transaction_count} قيد` : ''}</p></div>
          <Button variant="outline" onClick={exportCsv} disabled={!canExport || rows.length === 0} title={!canExport ? 'لا تملك صلاحية تصدير التقارير' : undefined}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
        </CardHeader>
        <CardContent>
          {!accountId ? <div className="text-center text-muted-foreground py-10 text-sm">اختر حسابًا لعرض حركاته.</div>
            : ledger.isLoading ? <div className="text-center text-muted-foreground py-10 text-sm">جارٍ التحميل…</div>
            : ledger.error ? <div className="text-center text-destructive py-10 text-sm">تعذر تحميل دفتر الأستاذ: {(ledger.error as Error).message}</div>
            : rows.length === 0 ? <div className="text-center text-muted-foreground py-10 text-sm">لا توجد حركات ضمن الفترة، والرصيد الافتتاحي هو {fmt(summary?.opening_balance || 0)} {currency}.</div>
            : <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>القيد</TableHead><TableHead>الوصف</TableHead><TableHead>مركز التكلفة</TableHead><TableHead className="text-left">مدين</TableHead><TableHead className="text-left">دائن</TableHead><TableHead className="text-left">الرصيد</TableHead><TableHead>المصدر</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((row) => {
                const source = sourceLink(row);
                return <TableRow key={row.line_id}>
                  <TableCell className="whitespace-nowrap">{row.entry_date}</TableCell>
                  <TableCell><Link to={`/journal-entries?entry=${row.entry_id}`} className="font-mono text-xs text-primary hover:underline">{row.entry_number}</Link></TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{row.line_description || row.description || '—'}</TableCell>
                  <TableCell className="text-xs">{row.cost_center_code ? `${row.cost_center_code} — ${row.cost_center_name}` : '—'}</TableCell>
                  <TableCell className="text-left font-mono">{Number(row.debit) > 0 ? fmt(row.debit) : '—'}</TableCell>
                  <TableCell className="text-left font-mono">{Number(row.credit) > 0 ? fmt(row.credit) : '—'}</TableCell>
                  <TableCell className="text-left font-mono font-semibold">{fmt(row.running_balance)}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.is_locked && <Lock className="inline h-3 w-3 text-amber-600 ml-1" />}{source ? <Link to={source.href} className="text-primary hover:underline text-xs inline-flex items-center gap-1">{source.label}<ExternalLink className="h-3 w-3" /></Link> : <Badge variant="outline" className="text-[10px]">{row.source_type || row.reference_type || 'يدوي'}</Badge>}</TableCell>
                </TableRow>;
              })}</TableBody>
            </Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

const KPI = ({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) => {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : '';
  return <div className="border rounded-lg p-3 bg-card"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-lg font-bold font-mono ${color}`}>{value}</div></div>;
};
