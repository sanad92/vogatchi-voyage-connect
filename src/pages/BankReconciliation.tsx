import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, CheckCircle2, AlertTriangle } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

export default function BankReconciliation() {
  const orgId = useOrgId();
  const [accountId, setAccountId] = useState<string>('');
  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(todayStr);
  const [statementBalance, setStatementBalance] = useState<string>('0');

  const accounts = useQuery({
    queryKey: ['recon-bank-accounts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from('bank_accounts').select('*').eq('organization_id', orgId).eq('is_active', true).order('account_name');
      return data || [];
    },
  });

  const txns = useQuery({
    queryKey: ['recon-txns', orgId, accountId, start, end],
    enabled: !!orgId && !!accountId,
    queryFn: async () => {
      const q = supabase.from('bank_account_transactions').select('*')
        .eq('organization_id', orgId)
        .eq('bank_account_id', accountId);
      if (start) q.gte('transaction_date', start);
      if (end) q.lte('transaction_date', end);
      const { data } = await q.order('transaction_date', { ascending: true });
      return data || [];
    },
  });

  const enriched = useMemo(() => {
    return (txns.data || []).map((t: any) => {
      const matched = !!(t.related_invoice_id || t.related_payment_order_id);
      const isDeposit = ['deposit', 'transfer_in', 'income', 'receipt'].includes((t.transaction_type || '').toLowerCase());
      const signed = isDeposit ? Number(t.amount) : -Number(t.amount);
      return { ...t, matched, signed };
    });
  }, [txns.data]);

  const totals = useMemo(() => {
    const rows = enriched;
    const bookBalance = rows.reduce((s, r) => s + r.signed, 0);
    const matchedCount = rows.filter(r => r.matched).length;
    const unmatchedCount = rows.length - matchedCount;
    const stmt = Number(statementBalance || 0);
    const diff = stmt - bookBalance;
    return { bookBalance, matchedCount, unmatchedCount, total: rows.length, stmt, diff };
  }, [enriched, statementBalance]);

  const selectedAcc = (accounts.data || []).find((a: any) => a.id === accountId);

  const unmatched = enriched.filter(r => !r.matched);
  const matched = enriched.filter(r => r.matched);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Landmark className="h-8 w-8 text-primary" />
          تسوية الحساب البنكي
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          مقارنة الحركات المسجّلة في النظام مع كشف حساب البنك، وتحديد الفروقات والحركات غير المطابقة.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>الحساب البنكي</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={accounts.isLoading}>
              <SelectTrigger><SelectValue placeholder="اختر الحساب البنكي" /></SelectTrigger>
              <SelectContent>
                {(accounts.data || []).map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name} — {a.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
          <div className="space-y-1 md:col-span-2">
            <Label>رصيد كشف البنك</Label>
            <Input type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="أدخل الرصيد الختامي من كشف البنك" />
          </div>
        </CardContent>
      </Card>

      {accountId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="الرصيد الدفتري" value={fmt(totals.bookBalance)} sub={selectedAcc?.currency} />
          <KPI label="رصيد كشف البنك" value={fmt(totals.stmt)} sub={selectedAcc?.currency} />
          <KPI label="الفرق" value={fmt(totals.diff)} tone={Math.abs(totals.diff) < 0.01 ? 'good' : 'bad'} />
          <KPI label="مطابق / غير مطابق" value={`${totals.matchedCount} / ${totals.unmatchedCount}`} />
        </div>
      )}

      {accountId && (
        <Tabs defaultValue="unmatched">
          <TabsList>
            <TabsTrigger value="unmatched">غير مطابقة ({unmatched.length})</TabsTrigger>
            <TabsTrigger value="matched">مطابقة ({matched.length})</TabsTrigger>
            <TabsTrigger value="all">الكل ({enriched.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="unmatched"><TxnTable rows={unmatched} /></TabsContent>
          <TabsContent value="matched"><TxnTable rows={matched} /></TabsContent>
          <TabsContent value="all"><TxnTable rows={enriched} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

const KPI = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) => {
  const color = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : '';
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value} {sub && <span className="text-xs text-muted-foreground">{sub}</span>}</div>
    </div>
  );
};

const TxnTable = ({ rows }: { rows: any[] }) => (
  <Card>
    <CardHeader><CardTitle className="text-sm">الحركات</CardTitle></CardHeader>
    <CardContent>
      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 text-sm">لا توجد حركات.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>المرجع</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{r.transaction_date}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.transaction_type}</Badge></TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{r.description || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{r.reference_number || '—'}</TableCell>
                  <TableCell className={`text-left font-mono ${r.signed >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(r.signed)}</TableCell>
                  <TableCell>
                    {r.matched ? (
                      <Badge className="bg-green-500/10 text-green-700 text-[10px]"><CheckCircle2 className="h-3 w-3 ml-1" />مطابق</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-700 text-[10px]"><AlertTriangle className="h-3 w-3 ml-1" />غير مطابق</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);
