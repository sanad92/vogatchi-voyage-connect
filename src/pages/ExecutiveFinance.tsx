import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Wallet, Receipt, Building2, AlertCircle, DollarSign } from 'lucide-react';

const fmt = (n: number, ccy = 'EGP') => `${(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${ccy}`;
const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

export default function ExecutiveFinance() {
  usePageTitle('لوحة التحكم المالية التنفيذية');
  const orgId = useOrgId();
  const [start, setStart] = useState(monthStart);
  const [end, setEnd] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ['executive-finance', orgId, start, end],
    enabled: !!orgId,
    queryFn: async () => {
      const sb: any = supabase;
      const [banks, invoicesAll, invoicesPeriod, bookingsPeriod, supplierPayPeriod, expensesPeriod] = await Promise.all([
        sb.from('bank_accounts').select('id, account_name, bank_name, currency, current_balance, is_active').eq('organization_id', orgId),
        sb.from('invoices').select('id, invoice_number, customer_name, currency, final_amount, total_paid_amount, remaining_amount, payment_status, issued_date, due_date').eq('organization_id', orgId),
        sb.from('invoices').select('currency, final_amount, total_paid_amount, issued_date, payment_status').eq('organization_id', orgId).gte('issued_date', start).lte('issued_date', end),
        sb.from('bookings').select('id, booking_number, customer_name, supplier_name, currency, selling_price, cost_price, profit, start_date, booking_type').eq('organization_id', orgId).gte('start_date', start).lte('start_date', end),
        sb.from('supplier_payments').select('amount, currency, payment_date, status, supplier_id').eq('organization_id', orgId).gte('payment_date', start).lte('payment_date', end),
        sb.from('expense_transactions').select('amount, currency, transaction_date, status').eq('organization_id', orgId).gte('transaction_date', start).lte('transaction_date', end),
      ]);
      return {
        banks: banks.data || [],
        invoicesAll: invoicesAll.data || [],
        invoicesPeriod: invoicesPeriod.data || [],
        bookingsPeriod: bookingsPeriod.data || [],
        supplierPayPeriod: supplierPayPeriod.data || [],
        expensesPeriod: expensesPeriod.data || [],
      };
    },
  });

  const kpis = useMemo(() => {
    const cashByCcy: Record<string, number> = {};
    (data?.banks || []).filter((b: any) => b.is_active !== false).forEach((b: any) => {
      const c = b.currency || 'EGP';
      cashByCcy[c] = (cashByCcy[c] || 0) + Number(b.current_balance || 0);
    });

    const arByCcy: Record<string, number> = {};
    const collectionsByCcy: Record<string, number> = {};
    (data?.invoicesAll || []).forEach((i: any) => {
      const c = i.currency || 'EGP';
      arByCcy[c] = (arByCcy[c] || 0) + Number(i.remaining_amount ?? (Number(i.final_amount || 0) - Number(i.total_paid_amount || 0)));
    });
    (data?.invoicesPeriod || []).forEach((i: any) => {
      const c = i.currency || 'EGP';
      collectionsByCcy[c] = (collectionsByCcy[c] || 0) + Number(i.total_paid_amount || 0);
    });

    const revenueByCcy: Record<string, number> = {};
    const costByCcy: Record<string, number> = {};
    const profitByCcy: Record<string, number> = {};
    (data?.bookingsPeriod || []).forEach((b: any) => {
      const c = b.currency || 'EGP';
      revenueByCcy[c] = (revenueByCcy[c] || 0) + Number(b.selling_price || 0);
      costByCcy[c] = (costByCcy[c] || 0) + Number(b.cost_price || 0);
      profitByCcy[c] = (profitByCcy[c] || 0) + Number(b.profit ?? (Number(b.selling_price || 0) - Number(b.cost_price || 0)));
    });

    const apPaidByCcy: Record<string, number> = {};
    (data?.supplierPayPeriod || []).forEach((p: any) => {
      const c = p.currency || 'EGP';
      apPaidByCcy[c] = (apPaidByCcy[c] || 0) + Number(p.amount || 0);
    });

    const expensesByCcy: Record<string, number> = {};
    (data?.expensesPeriod || []).forEach((e: any) => {
      if (e.status && e.status !== 'approved' && e.status !== 'paid') return;
      const c = e.currency || 'EGP';
      expensesByCcy[c] = (expensesByCcy[c] || 0) + Number(e.amount || 0);
    });

    return { cashByCcy, arByCcy, collectionsByCcy, revenueByCcy, costByCcy, profitByCcy, apPaidByCcy, expensesByCcy };
  }, [data]);

  const overdue = useMemo(() => {
    return (data?.invoicesAll || [])
      .filter((i: any) => Number(i.remaining_amount || (i.final_amount - i.total_paid_amount)) > 0 && i.due_date && i.due_date < todayStr)
      .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date));
  }, [data]);

  const topBookings = useMemo(() => {
    return [...(data?.bookingsPeriod || [])]
      .sort((a: any, b: any) => Number(b.profit || 0) - Number(a.profit || 0))
      .slice(0, 10);
  }, [data]);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        icon={DollarSign}
        title="لوحة التحكم المالية التنفيذية"
        description="نظرة تنفيذية مبنية على البيانات الحالية (فواتير، حجوزات، مدفوعات، حسابات بنكية)."
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          هذه اللوحة عرض قراءة فقط مبني على الجداول القائمة. لم يتم استخدام أي RPC محاسبي. الأرقام تعرض لكل عملة على حدة بدون تحويل.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 flex gap-4 items-end flex-wrap">
          <div className="space-y-1"><Label>من</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="space-y-1"><Label>إلى</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ التحميل…</div>
      ) : (
        <>
          <SectionBlock title="النقدية في البنوك" icon={Wallet} totals={kpis.cashByCcy} tone="good" />
          <SectionBlock title="ذمم مدينة (مستحقة على العملاء)" icon={Receipt} totals={kpis.arByCcy} tone="warn" />
          <SectionBlock title="التحصيلات خلال الفترة" icon={TrendingUp} totals={kpis.collectionsByCcy} tone="good" />
          <SectionBlock title="سداد للموردين خلال الفترة" icon={Building2} totals={kpis.apPaidByCcy} />

          <Card>
            <CardHeader><CardTitle className="text-base">ربحية الحجوزات خلال الفترة</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {Object.keys(kpis.revenueByCcy).map((c) => (
                  <div key={c} className="border rounded-lg p-3 bg-card">
                    <div className="text-xs text-muted-foreground">{c}</div>
                    <div className="flex justify-between text-sm mt-1"><span className="text-muted-foreground">إيرادات</span><span className="font-mono">{fmt(kpis.revenueByCcy[c], c)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">تكلفة</span><span className="font-mono">{fmt(kpis.costByCcy[c] || 0, c)}</span></div>
                    <div className="flex justify-between text-sm font-bold"><span>ربح</span><span className={`font-mono ${(kpis.profitByCcy[c] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(kpis.profitByCcy[c] || 0, c)}</span></div>
                  </div>
                ))}
              </div>

              <Tabs defaultValue="top">
                <TabsList>
                  <TabsTrigger value="top">أعلى ربحية</TabsTrigger>
                  <TabsTrigger value="overdue">فواتير متأخرة ({overdue.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="top">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الحجز</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead className="text-left">بيع</TableHead>
                        <TableHead className="text-left">تكلفة</TableHead>
                        <TableHead className="text-left">ربح</TableHead>
                        <TableHead>العملة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topBookings.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.booking_number}</TableCell>
                          <TableCell className="text-sm">{b.customer_name}</TableCell>
                          <TableCell className="text-sm">{b.supplier_name || '—'}</TableCell>
                          <TableCell className="text-left font-mono">{fmt(Number(b.selling_price || 0), b.currency)}</TableCell>
                          <TableCell className="text-left font-mono">{fmt(Number(b.cost_price || 0), b.currency)}</TableCell>
                          <TableCell className="text-left font-mono font-bold text-green-600">{fmt(Number(b.profit || 0), b.currency)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{b.currency}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="overdue">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الفاتورة</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>الاستحقاق</TableHead>
                        <TableHead className="text-left">المتبقي</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdue.slice(0, 20).map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                          <TableCell className="text-sm">{i.customer_name}</TableCell>
                          <TableCell className="text-xs">{i.due_date}</TableCell>
                          <TableCell className="text-left font-mono text-red-600">{fmt(Number(i.remaining_amount || (i.final_amount - i.total_paid_amount)), i.currency)}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-[10px]">متأخرة</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const SectionBlock = ({ title, icon: Icon, totals, tone }: { title: string; icon: any; totals: Record<string, number>; tone?: 'good' | 'warn' }) => {
  const color = tone === 'good' ? 'text-green-600' : tone === 'warn' ? 'text-amber-600' : '';
  const keys = Object.keys(totals);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" /> {title}</CardTitle></CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <div className="text-xs text-muted-foreground">لا توجد بيانات.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {keys.map((c) => (
              <div key={c} className="border rounded-lg p-3 bg-card">
                <div className="text-xs text-muted-foreground">{c}</div>
                <div className={`text-lg font-bold font-mono ${color}`}>{fmt(totals[c], c)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
