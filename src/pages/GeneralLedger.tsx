import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Lock, ExternalLink } from 'lucide-react';

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
  debit: number;
  credit: number;
  running_balance: number;
  currency: string | null;
  status: string;
  is_locked: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const today = new Date();
const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

const sourceLink = (row: GLRow): { href: string; label: string } | null => {
  const st = row.source_type || row.reference_type;
  const sid = row.source_id || row.reference_id;
  if (!st) return null;
  if (row.booking_id) return { href: `/bookings/${row.booking_id}`, label: 'الحجز' };
  if (st === 'invoice' && sid) return { href: `/invoices?id=${sid}`, label: 'الفاتورة' };
  if (st === 'supplier_payment' && sid) return { href: `/supplier-ledger`, label: 'سداد المورد' };
  if (st === 'expense' && sid) return { href: `/expenses`, label: 'المصروف' };
  return null;
};

export default function GeneralLedger() {
  const orgId = useOrgId();
  const { accounts, isLoading: accLoading } = useChartOfAccounts();
  const [accountId, setAccountId] = useState<string>('');
  const [start, setStart] = useState(firstOfYear);
  const [end, setEnd] = useState(todayStr);

  const ledger = useQuery({
    queryKey: ['general-ledger', orgId, accountId, start, end],
    queryFn: async () => {
      if (!orgId || !accountId) return [] as GLRow[];
      const { data, error } = await (supabase.rpc as any)('get_general_ledger', {
        _org_id: orgId,
        _account_id: accountId,
        _start_date: start || null,
        _end_date: end || null,
      });
      if (error) throw error;
      return (data || []) as GLRow[];
    },
    enabled: !!orgId && !!accountId,
  });

  const totals = useMemo(() => {
    const rows = ledger.data || [];
    const debit = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
    const credit = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
    const closing = rows.length ? Number(rows[rows.length - 1].running_balance) : 0;
    return { debit, credit, closing, count: rows.length };
  }, [ledger.data]);

  const selectedAccount = accounts.find(a => a.id === accountId);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          دفتر الأستاذ العام
        </h1>
        <p className="text-muted-foreground mt-1">
          حركات حساب محدد مع الرصيد التراكمي، مع إمكانية التنقّل إلى المستند المصدر لكل حركة.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>الحساب</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={accLoading}>
              <SelectTrigger><SelectValue placeholder="اختر حساب من دليل الحسابات" /></SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs text-muted-foreground ml-2">{a.account_code}</span>
                    {a.account_name_ar || a.account_name}
                    <Badge variant="outline" className="mr-2 text-[10px]">{a.account_type}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>من تاريخ</Label>
            <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>إلى تاريخ</Label>
            <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="عدد الحركات" value={String(totals.count)} />
          <KPI label="إجمالي المدين" value={fmt(totals.debit)} tone="good" />
          <KPI label="إجمالي الدائن" value={fmt(totals.credit)} tone="warn" />
          <KPI
            label="الرصيد الختامي"
            value={fmt(totals.closing)}
            tone={totals.closing >= 0 ? 'good' : 'bad'}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedAccount
              ? `${selectedAccount.account_code} — ${selectedAccount.account_name_ar || selectedAccount.account_name}`
              : 'الحركات'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!accountId ? (
            <div className="text-center text-muted-foreground py-10 text-sm">اختر حساباً لعرض حركاته.</div>
          ) : ledger.isLoading ? (
            <div className="text-center text-muted-foreground py-10 text-sm">جارٍ التحميل…</div>
          ) : (ledger.data || []).length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">لا توجد حركات ضمن الفترة المحددة.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>القيد</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead className="text-left">مدين</TableHead>
                    <TableHead className="text-left">دائن</TableHead>
                    <TableHead className="text-left">الرصيد</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledger.data || []).map((r) => {
                    const link = sourceLink(r);
                    return (
                      <TableRow key={r.line_id}>
                        <TableCell className="whitespace-nowrap">{r.entry_date}</TableCell>
                        <TableCell className="font-mono text-xs">{r.entry_number}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {r.line_description || r.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {r.source_type || r.reference_type || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left font-mono">
                          {Number(r.debit) > 0 ? fmt(Number(r.debit)) : '—'}
                        </TableCell>
                        <TableCell className="text-left font-mono">
                          {Number(r.credit) > 0 ? fmt(Number(r.credit)) : '—'}
                        </TableCell>
                        <TableCell className="text-left font-mono font-semibold">
                          {fmt(Number(r.running_balance))}
                        </TableCell>
                        <TableCell className="text-left">
                          {r.is_locked && <Lock className="inline h-3 w-3 text-amber-600 ml-1" />}
                          {link && (
                            <Link
                              to={link.href}
                              className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                            >
                              {link.label} <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const KPI = ({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) => {
  const color =
    tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : '';
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
};
