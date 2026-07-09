import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const fmt = (n: number, ccy = 'EGP') => `${(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${ccy}`;

interface Finding { severity: 'ok' | 'warn' | 'error'; category: string; message: string; count?: number; }

export default function FinancialValidation() {
  usePageTitle('تقرير التحقق المالي');
  const orgId = useOrgId();

  const { data, isLoading } = useQuery({
    queryKey: ['financial-validation', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const sb: any = supabase;
      const [bookings, invoices, supplierPayments, journals, journalLines, banks, expenses] = await Promise.all([
        sb.from('bookings').select('id, booking_number, selling_price, cost_price, profit, currency, customer_id, supplier_id, status').eq('organization_id', orgId),
        sb.from('invoices').select('id, invoice_number, booking_id, customer_id, currency, subtotal, vat_amount, discount_amount, final_amount, total_paid_amount, remaining_amount, payment_status').eq('organization_id', orgId),
        sb.from('supplier_payments').select('id, booking_id, supplier_id, amount, currency, status').eq('organization_id', orgId),
        sb.from('journal_entries').select('id, entry_number, total_debit, total_credit, status, reference_type, reference_id, currency').eq('organization_id', orgId),
        sb.from('journal_entry_lines').select('id, journal_entry_id, debit_amount, credit_amount').limit(5000),
        sb.from('bank_accounts').select('id, account_name, currency, current_balance').eq('organization_id', orgId),
        sb.from('expense_transactions').select('id, amount, currency, status').eq('organization_id', orgId),
      ]);
      return {
        bookings: bookings.data || [],
        invoices: invoices.data || [],
        supplierPayments: supplierPayments.data || [],
        journals: journals.data || [],
        journalLines: journalLines.data || [],
        banks: banks.data || [],
        expenses: expenses.data || [],
      };
    },
  });

  const findings = useMemo<Finding[]>(() => {
    if (!data) return [];
    const F: Finding[] = [];

    // 1) Booking profit consistency
    const bad = data.bookings.filter((b: any) => Math.abs(Number(b.profit || 0) - (Number(b.selling_price || 0) - Number(b.cost_price || 0))) > 0.01);
    F.push(bad.length
      ? { severity: 'error', category: 'ربح الحجز', message: `${bad.length} حجز ربحه المخزّن ≠ (البيع − التكلفة).`, count: bad.length }
      : { severity: 'ok', category: 'ربح الحجز', message: 'كل الحجوزات: profit == selling − cost.' });

    // 2) Bookings without supplier
    const noSup = data.bookings.filter((b: any) => !b.supplier_id && Number(b.cost_price || 0) > 0);
    if (noSup.length) F.push({ severity: 'warn', category: 'ربط المورد', message: `${noSup.length} حجز فيه تكلفة بدون supplier_id (لن يظهر في كشف المورد).`, count: noSup.length });

    // 3) Bookings without customer
    const noCust = data.bookings.filter((b: any) => !b.customer_id);
    if (noCust.length) F.push({ severity: 'warn', category: 'ربط العميل', message: `${noCust.length} حجز بدون customer_id.`, count: noCust.length });

    // 4) Bookings with no invoice
    const invByBooking = new Set(data.invoices.filter((i: any) => i.booking_id).map((i: any) => i.booking_id));
    const uninvoiced = data.bookings.filter((b: any) => !invByBooking.has(b.id) && Number(b.selling_price || 0) > 0);
    if (uninvoiced.length) F.push({ severity: 'warn', category: 'فواتير مفقودة', message: `${uninvoiced.length} حجز له سعر بيع بدون فاتورة مُصدرة.`, count: uninvoiced.length });

    // 5) Invoice math check
    const invBad = data.invoices.filter((i: any) => {
      const expectedFinal = Number(i.subtotal || 0) + Number(i.vat_amount || 0) - Number(i.discount_amount || 0);
      return Math.abs(expectedFinal - Number(i.final_amount || 0)) > 0.01;
    });
    F.push(invBad.length
      ? { severity: 'error', category: 'حسابات الفاتورة', message: `${invBad.length} فاتورة: subtotal + vat − discount ≠ final_amount.`, count: invBad.length }
      : { severity: 'ok', category: 'حسابات الفاتورة', message: 'كل الفواتير: subtotal + vat − discount = final_amount.' });

    // 6) Invoice remaining check
    const remBad = data.invoices.filter((i: any) => Math.abs((Number(i.final_amount || 0) - Number(i.total_paid_amount || 0)) - Number(i.remaining_amount || 0)) > 0.01);
    if (remBad.length) F.push({ severity: 'error', category: 'رصيد الفاتورة', message: `${remBad.length} فاتورة: remaining_amount ≠ final − paid.`, count: remBad.length });
    else F.push({ severity: 'ok', category: 'رصيد الفاتورة', message: 'remaining_amount مطابق في كل الفواتير.' });

    // 7) Currency mismatches: invoice vs booking
    const bookingCcy: Record<string, string> = {};
    data.bookings.forEach((b: any) => { bookingCcy[b.id] = b.currency; });
    const ccyMismatch = data.invoices.filter((i: any) => i.booking_id && bookingCcy[i.booking_id] && bookingCcy[i.booking_id] !== i.currency);
    if (ccyMismatch.length) F.push({ severity: 'warn', category: 'عملات', message: `${ccyMismatch.length} فاتورة بعملة مختلفة عن الحجز الأصلي.`, count: ccyMismatch.length });

    // 8) Supplier payments > cost
    const bySup: Record<string, number> = {};
    data.supplierPayments.filter((p: any) => p.status === 'paid' || p.status === 'completed').forEach((p: any) => {
      if (p.booking_id) bySup[p.booking_id] = (bySup[p.booking_id] || 0) + Number(p.amount || 0);
    });
    const overpaid = data.bookings.filter((b: any) => bySup[b.id] && bySup[b.id] - Number(b.cost_price || 0) > 0.01);
    if (overpaid.length) F.push({ severity: 'warn', category: 'سداد الموردين', message: `${overpaid.length} حجز مسدَّد للمورد أكثر من التكلفة.`, count: overpaid.length });

    // 9) Orphan supplier payments (no booking)
    const orphanSp = data.supplierPayments.filter((p: any) => !p.booking_id);
    if (orphanSp.length) F.push({ severity: 'warn', category: 'سداد الموردين', message: `${orphanSp.length} سداد مورد بدون ربط بحجز (لن يظهر في مساحة عمل الحجز).`, count: orphanSp.length });

    // 10) Journal entries: debit == credit
    const jeBad = data.journals.filter((j: any) => Math.abs(Number(j.total_debit || 0) - Number(j.total_credit || 0)) > 0.01);
    F.push(jeBad.length
      ? { severity: 'error', category: 'قيود اليومية', message: `${jeBad.length} قيد يومية غير متوازن (debit ≠ credit).`, count: jeBad.length }
      : { severity: 'ok', category: 'قيود اليومية', message: `كل قيود اليومية متوازنة (${data.journals.length} قيد).` });

    // 11) Journals not linked to source
    const untracked = data.journals.filter((j: any) => !j.reference_id || !j.reference_type);
    if (untracked.length) F.push({ severity: 'warn', category: 'قيود اليومية', message: `${untracked.length} قيد يومية بدون reference_id/reference_type (لن يُدرج تحت الحجز).`, count: untracked.length });

    // 12) Bookings without any journal (financial engine gap)
    const jrnByBooking = new Set(data.journals.filter((j: any) => j.reference_type === 'booking').map((j: any) => j.reference_id));
    const noJrn = data.bookings.filter((b: any) => !jrnByBooking.has(b.id));
    if (noJrn.length) F.push({ severity: 'warn', category: 'محرك التسجيل المحاسبي', message: `${noJrn.length} حجز بدون قيد يومية — المحرك المحاسبي غير مُفعّل.`, count: noJrn.length });

    // 13) Bank balances presence
    const noCash = data.banks.filter((b: any) => Number(b.current_balance || 0) === 0);
    if (noCash.length === data.banks.length && data.banks.length > 0) F.push({ severity: 'warn', category: 'حسابات بنكية', message: `كل الحسابات البنكية أرصدتها = 0. مصادقة يدوية مطلوبة.` });

    // 14) Missing RPC endpoints
    F.push({ severity: 'warn', category: 'RPCs المحاسبية',
      message: 'الدوال get_trial_balance / get_income_statement / get_balance_sheet / get_cash_flow / get_customer_aging غير موجودة في قاعدة البيانات. صفحات CFO Dashboard و Accounting Reports معطّلة جزئياً.' });

    return F;
  }, [data]);

  const totals = useMemo(() => {
    if (!data) return null;
    const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + Number(r[key] || 0), 0);
    return {
      bookings: data.bookings.length,
      totalSelling: sum(data.bookings, 'selling_price'),
      totalCost: sum(data.bookings, 'cost_price'),
      totalProfit: sum(data.bookings, 'profit'),
      invoices: data.invoices.length,
      totalInvoiced: sum(data.invoices, 'final_amount'),
      totalCollected: sum(data.invoices, 'total_paid_amount'),
      totalOutstanding: sum(data.invoices, 'remaining_amount'),
      spCount: data.supplierPayments.length,
      spPaid: sum(data.supplierPayments.filter((p: any) => p.status === 'paid' || p.status === 'completed'), 'amount'),
      journals: data.journals.length,
      expenses: data.expenses.length,
    };
  }, [data]);

  const counts = useMemo(() => ({
    ok: findings.filter(f => f.severity === 'ok').length,
    warn: findings.filter(f => f.severity === 'warn').length,
    err: findings.filter(f => f.severity === 'error').length,
  }), [findings]);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        icon={ShieldCheck}
        title="تقرير التحقق المالي"
        description="فحص شامل للتناسق بين الحجوزات، الفواتير، مدفوعات الموردين، وقيود اليومية. لا يعدّل أي بيانات."
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          هذا التقرير للقراءة فقط، ويعتمد على البيانات الحالية في قاعدة البيانات. أي "خطأ" أو "تحذير" يجب معالجته يدوياً قبل إطلاق المحرك المحاسبي.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جارٍ الفحص…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-500/30"><CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">{counts.ok}</div>
              <div className="text-xs text-muted-foreground">فحوصات ناجحة</div>
            </CardContent></Card>
            <Card className="border-amber-500/30"><CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-amber-600">{counts.warn}</div>
              <div className="text-xs text-muted-foreground">تحذيرات</div>
            </CardContent></Card>
            <Card className="border-red-500/30"><CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-600">{counts.err}</div>
              <div className="text-xs text-muted-foreground">أخطاء حرجة</div>
            </CardContent></Card>
          </div>

          {totals && (
            <Card>
              <CardHeader><CardTitle className="text-base">إجماليات التحقق (كل العملات مجمّعة رقمياً — للتحقق فقط)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="عدد الحجوزات" value={String(totals.bookings)} />
                <Stat label="إجمالي البيع" value={fmt(totals.totalSelling)} />
                <Stat label="إجمالي التكلفة" value={fmt(totals.totalCost)} />
                <Stat label="إجمالي الربح" value={fmt(totals.totalProfit)} />
                <Stat label="عدد الفواتير" value={String(totals.invoices)} />
                <Stat label="مجموع الفواتير" value={fmt(totals.totalInvoiced)} />
                <Stat label="محصّل" value={fmt(totals.totalCollected)} />
                <Stat label="متبقٍ" value={fmt(totals.totalOutstanding)} />
                <Stat label="مدفوعات موردين" value={String(totals.spCount)} />
                <Stat label="المسدَّد للموردين" value={fmt(totals.spPaid)} />
                <Stat label="قيود يومية" value={String(totals.journals)} />
                <Stat label="مصروفات" value={String(totals.expenses)} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">نتائج الفحص</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>الرسالة</TableHead>
                    <TableHead className="text-left">العدد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {f.severity === 'ok' && <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" /> ok</Badge>}
                        {f.severity === 'warn' && <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1"><AlertTriangle className="h-3 w-3" /> warn</Badge>}
                        {f.severity === 'error' && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> error</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{f.category}</TableCell>
                      <TableCell className="text-sm">{f.message}</TableCell>
                      <TableCell className="text-left font-mono">{f.count ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">التوصيات (المرحلة القادمة)</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2 leading-relaxed">
              <p>1. تركيب دوال RPC المفقودة: <code>get_trial_balance</code>, <code>get_income_statement</code>, <code>get_balance_sheet</code>, <code>get_cash_flow</code>, <code>get_customer_aging</code>.</p>
              <p>2. تفعيل محرك تسجيل تلقائي (AFTER INSERT/UPDATE على bookings/invoices/supplier_payments/expenses) يولّد قيود يومية متوازنة تلقائياً.</p>
              <p>3. إضافة قيد DB: <code>CHECK (total_debit = total_credit)</code> على journal_entries، و trigger يمنع حذف/تعديل القيود المرحّلة.</p>
              <p>4. حقول العملة الوظيفية: <code>functional_currency</code> و <code>fx_rate</code> على كل جدول معاملات.</p>
              <p>5. جدول <code>supplier_bills</code> منفصل عن bookings ليمثّل AP بشكل صريح.</p>
              <p>6. ربط <code>bank_account_transactions</code> بشكل تلقائي بكل عملية سداد/تحصيل.</p>
              <p>7. Period Close workflow يمنع الكتابة في الفترات المقفلة.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border rounded-lg p-3 bg-card">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-bold font-mono">{value}</div>
  </div>
);
