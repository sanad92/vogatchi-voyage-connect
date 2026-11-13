import { useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { RefundLedgerSummary } from '@/components/finance/RefundLedgerSummary';
import { useSupplierLedgerRpc } from '@/hooks/finance/useFinanceRpcs';
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
  const supplierId = params.get('id') || params.get('supplier_id') || '';

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

  const { data, isLoading, isError } = useSupplierLedgerRpc(supplierId);
  const rows = useMemo(() => (data ?? []).map(row => ({
    date: row.entry_date?.slice(0, 10),
    ref: row.reference,
    description: {
      supplier_invoice: 'استحقاق مورد',
      payment_order: 'أمر دفع مورد',
      payment: 'سداد للمورد',
      booking_cancellation: 'تسوية إلغاء المورد',
      supplier_wallet_offset: 'تسوية من محفظة المورد',
    }[row.entry_type] || row.entry_type,
    debit: Number(row.debit),
    credit: Number(row.credit),
    balance: -Number(row.balance),
    currency: row.currency,
    link: row.booking_id ? `/bookings/${row.booking_id}/workspace?tab=financials` : null,
  })), [data]);

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
        description="فواتير المورد وأوامر الدفع والمدفوعات والتسويات."
      />

      {supplierId && <RefundLedgerSummary kind="supplier" partyId={supplierId} />}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          الرصيد الموجب هو المبلغ المستحق للمورد.
        </AlertDescription>
      </Alert>

      {isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>تعذر تحميل كشف حساب المورد.</AlertDescription></Alert>}
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
                    <TableCell>{r.link ? <Link to={r.link} className="font-mono text-xs text-primary hover:underline">{r.ref}</Link> : r.ref}</TableCell>
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
