import { useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, AlertCircle, Building2 } from 'lucide-react';

const fmt = (n: number, ccy = 'EGP') => `${(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${ccy}`;

export default function SupplierLedger() {
  usePageTitle('كشف حساب المورد');
  const orgId = useOrgId();
  const [params, setParams] = useSearchParams();
  const supplierId = params.get('id') || '';

  const { data: suppliers = [] } = useQuery({
    queryKey: ['ledger-suppliers', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from('suppliers').select('id, name, phone').eq('organization_id', orgId).order('name');
      return data || [];
    },
  });

  useEffect(() => {
    if (!supplierId && suppliers[0]?.id) setParams({ id: suppliers[0].id }, { replace: true });
  }, [suppliers, supplierId, setParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-ledger', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const sb: any = supabase;
      const [supplier, bookings, payments] = await Promise.all([
        sb.from('suppliers').select('*').eq('id', supplierId).maybeSingle(),
        sb.from('bookings').select('id, booking_number, start_date, currency, cost_price, status, booking_type').eq('supplier_id', supplierId).order('start_date', { ascending: true }),
        sb.from('supplier_payments').select('id, amount, currency, payment_date, paid_date, reference_number, status, booking_id').eq('supplier_id', supplierId).order('payment_date', { ascending: true }),
      ]);
      return {
        supplier: supplier.data,
        bookings: bookings.data || [],
        payments: payments.data || [],
      };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [] as any[];
    const events: any[] = [];
    // Bookings = liability to supplier (credit AP)
    data.bookings.forEach((b: any) => {
      events.push({
        date: b.start_date || null,
        ref: b.booking_number,
        description: `تكلفة حجز — ${b.booking_type}`,
        debit: 0,
        credit: Number(b.cost_price || 0),
        currency: b.currency,
        link: `/bookings/${b.id}`,
      });
    });
    // Payments to supplier = debit AP
    data.payments.forEach((p: any) => {
      events.push({
        date: p.paid_date || p.payment_date,
        ref: p.reference_number || '—',
        description: 'سداد للمورد',
        debit: Number(p.amount || 0),
        credit: 0,
        currency: p.currency,
        link: p.booking_id ? `/bookings/${p.booking_id}` : '#',
      });
    });
    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const balances: Record<string, number> = {};
    return events.map((e) => {
      const ccy = e.currency || 'EGP';
      // Balance = credit − debit (positive = we owe supplier)
      balances[ccy] = (balances[ccy] || 0) + e.credit - e.debit;
      return { ...e, balance: balances[ccy] };
    });
  }, [data]);

  const totalsByCurrency = useMemo(() => {
    const m: Record<string, { debit: number; credit: number; balance: number }> = {};
    rows.forEach((r) => {
      const c = r.currency || 'EGP';
      if (!m[c]) m[c] = { debit: 0, credit: 0, balance: 0 };
      m[c].debit += r.debit; m[c].credit += r.credit;
    });
    Object.keys(m).forEach((c) => { m[c].balance = m[c].credit - m[c].debit; });
    return m;
  }, [rows]);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        icon={BookOpen}
        title="كشف حساب المورد"
        description="عرض للقراءة فقط مبني على تكاليف الحجوزات ومدفوعات الموردين القائمة."
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          الرصيد الموجب = مبلغ مستحق للمورد. المصدر: `bookings.cost_price` (كالتزام) و `supplier_payments` (كسداد).
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 flex items-center gap-3 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={supplierId} onValueChange={(v) => setParams({ id: v })}>
            <SelectTrigger className="w-80"><SelectValue placeholder="اختر مورد" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name} {s.phone ? `— ${s.phone}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(totalsByCurrency).map(([c, t]) => (
            <Card key={c}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">إجمالي {c}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">التزامات (تكاليف)</span><span>{fmt(t.credit, c)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المسدّد</span><span>{fmt(t.debit, c)}</span></div>
                <div className="flex justify-between font-bold"><span>الرصيد المستحق</span><span className={t.balance > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(t.balance, c)}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">الحركات</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">لا توجد حركات لهذا المورد.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>البيان</TableHead>
                  <TableHead className="text-left">مدين (سداد)</TableHead>
                  <TableHead className="text-left">دائن (التزام)</TableHead>
                  <TableHead className="text-left">الرصيد</TableHead>
                  <TableHead>العملة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.date || '—'}</TableCell>
                    <TableCell><Link to={r.link} className="font-mono text-xs text-primary hover:underline">{r.ref}</Link></TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="text-left font-mono text-green-600">{r.debit ? fmt(r.debit, r.currency) : '—'}</TableCell>
                    <TableCell className="text-left font-mono">{r.credit ? fmt(r.credit, r.currency) : '—'}</TableCell>
                    <TableCell className="text-left font-mono font-bold">{fmt(r.balance, r.currency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.currency}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
