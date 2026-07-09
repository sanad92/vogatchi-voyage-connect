import { useMemo, useState, useEffect } from 'react';
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
import { BookOpen, AlertCircle, User } from 'lucide-react';

const fmt = (n: number, ccy = 'EGP') => `${(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${ccy}`;

export default function CustomerLedger() {
  usePageTitle('كشف حساب العميل');
  const orgId = useOrgId();
  const [params, setParams] = useSearchParams();
  const customerId = params.get('id') || '';

  const { data: customers = [] } = useQuery({
    queryKey: ['ledger-customers', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from('customers').select('id, name, phone').eq('organization_id', orgId).order('name');
      return data || [];
    },
  });

  useEffect(() => {
    if (!customerId && customers[0]?.id) setParams({ id: customers[0].id }, { replace: true });
  }, [customers, customerId, setParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-ledger', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const sb: any = supabase;
      const [customer, invoices, bookings] = await Promise.all([
        sb.from('customers').select('*').eq('id', customerId).maybeSingle(),
        sb.from('invoices').select('id, invoice_number, issued_date, currency, final_amount, total_paid_amount, remaining_amount, payment_status, booking_id, created_at').eq('customer_id', customerId).order('issued_date', { ascending: true }),
        sb.from('bookings').select('id, booking_number, booking_type, currency, selling_price, start_date, status').eq('customer_id', customerId).order('start_date', { ascending: true }),
      ]);
      return {
        customer: customer.data,
        invoices: invoices.data || [],
        bookings: bookings.data || [],
      };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [] as any[];
    const events: any[] = [];
    data.invoices.forEach((inv: any) => {
      events.push({
        date: inv.issued_date || inv.created_at,
        ref: inv.invoice_number,
        description: `فاتورة${inv.booking_id ? ` — حجز` : ''}`,
        debit: Number(inv.final_amount || 0),
        credit: 0,
        currency: inv.currency,
        link: `/invoices?id=${inv.id}`,
      });
      const paid = Number(inv.total_paid_amount || 0);
      if (paid > 0) {
        events.push({
          date: inv.issued_date || inv.created_at,
          ref: inv.invoice_number,
          description: 'تحصيل من العميل',
          debit: 0,
          credit: paid,
          currency: inv.currency,
          link: `/invoices?id=${inv.id}`,
        });
      }
    });
    events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    // running balance per currency
    const balances: Record<string, number> = {};
    return events.map((e) => {
      const ccy = e.currency || 'EGP';
      balances[ccy] = (balances[ccy] || 0) + e.debit - e.credit;
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
    Object.keys(m).forEach((c) => { m[c].balance = m[c].debit - m[c].credit; });
    return m;
  }, [rows]);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        icon={BookOpen}
        title="كشف حساب العميل"
        description="عرض للقراءة فقط مبني على الفواتير والتحصيلات القائمة."
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          هذا الكشف يعرض حركات الفواتير والتحصيلات الفعلية. لم يتم تطبيق قيود اليومية بعد، وهذه الأرقام مستخرجة مباشرة من جدول الفواتير.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 flex items-center gap-3 flex-wrap">
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={customerId} onValueChange={(v) => setParams({ id: v })}>
            <SelectTrigger className="w-80"><SelectValue placeholder="اختر عميل" /></SelectTrigger>
            <SelectContent>
              {customers.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data?.customer && (
            <div className="text-sm text-muted-foreground">
              الرصيد التراكمي (إجمالي): {data.customer.total_spent ? fmt(Number(data.customer.total_spent)) : '—'}
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(totalsByCurrency).map(([c, t]) => (
            <Card key={c}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">إجمالي {c}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">مدين</span><span>{fmt(t.debit, c)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">دائن</span><span>{fmt(t.credit, c)}</span></div>
                <div className="flex justify-between font-bold"><span>الرصيد</span><span className={t.balance > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(t.balance, c)}</span></div>
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
            <div className="text-center text-muted-foreground py-8">لا توجد حركات مالية لهذا العميل.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>البيان</TableHead>
                  <TableHead className="text-left">مدين</TableHead>
                  <TableHead className="text-left">دائن</TableHead>
                  <TableHead className="text-left">الرصيد</TableHead>
                  <TableHead>العملة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell><Link to={r.link} className="font-mono text-xs text-primary hover:underline">{r.ref}</Link></TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="text-left font-mono">{r.debit ? fmt(r.debit, r.currency) : '—'}</TableCell>
                    <TableCell className="text-left font-mono text-green-600">{r.credit ? fmt(r.credit, r.currency) : '—'}</TableCell>
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
