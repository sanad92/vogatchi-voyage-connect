import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpLeft, CheckCircle2, CircleDollarSign, ReceiptText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookingProfitCockpit, type BookingProfitLine } from '@/hooks/useBookingProfitCockpit';

const money = (value: number | null | undefined, currency: string) =>
  `${Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;

const tone = (value: number) => value < 0 ? 'text-destructive' : 'text-emerald-600';

export const BookingProfitCockpit = ({ bookingId }: { bookingId: string }) => {
  const { data, isLoading, error } = useBookingProfitCockpit(bookingId);

  if (isLoading) return <Card className="p-5 text-sm text-muted-foreground">جاري تجهيز ربحية الحجز والتسويات...</Card>;
  if (error || !data) return <Alert variant="destructive"><AlertTitle>تعذر تحميل التحليل المالي</AlertTitle><AlertDescription>{error instanceof Error ? error.message : 'حاول مرة أخرى.'}</AlertDescription></Alert>;

  const { summary: s, settlement, ledger, warnings, drilldowns, booking } = data;
  const currency = booking.currency;
  const cards = [
    ['سعر البيع', s.selling],
    ['تكلفة المورد', -s.supplier_cost],
    [`إجمالي الربح (${s.gross_margin_pct.toFixed(1)}%)`, s.gross_profit],
    ['مصروفات مرتبطة', -s.direct_expenses],
    ['عمولات مستحقة', -s.commissions],
    [`صافي المساهمة (${s.net_margin_pct.toFixed(1)}%)`, s.net_contribution],
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><CircleDollarSign className="h-5 w-5" />مركز ربحية الحجز</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">ربح حقيقي بعد المصروفات والعمولات، مع مقارنة الترحيل المحاسبي</p>
          </div>
          <Badge className={settlement.financially_complete ? 'bg-emerald-600' : ''} variant={settlement.financially_complete ? 'default' : 'secondary'}>
            {settlement.financially_complete ? 'مكتمل ماليًا' : 'غير مكتمل ماليًا'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {cards.map(([label, value], index) => (
              <div key={label} className={`rounded-lg border p-3 ${index === cards.length - 1 ? 'bg-muted/50' : ''}`}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 font-semibold ${index >= 2 ? tone(value) : ''}`}>{money(value, currency)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettlementCard title="تسوية العميل" settled={settlement.customer_settled} progress={settlement.customer_progress_pct} rows={[
              [s.customer_due_basis === 'customer_invoices' ? 'فواتير العميل' : 'سعر البيع', s.customer_due_basis === 'customer_invoices' ? s.customer_invoiced : s.selling], ['المتحصل', s.customer_collected], ['المتبقي', s.customer_remaining],
            ]} currency={currency} />
            <SettlementCard title="تسوية المورد" settled={settlement.supplier_settled} progress={settlement.supplier_progress_pct} rows={[
              [s.supplier_due_basis === 'supplier_invoices' ? 'فواتير المورد' : 'تكلفة الحجز', s.supplier_due_basis === 'supplier_invoices' ? s.supplier_invoiced : s.supplier_cost],
              ['المدفوع', s.supplier_paid], ['المتبقي', s.supplier_remaining],
            ]} currency={currency} />
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between"><p className="font-medium">مقارنة دفتر الأستاذ</p><Badge variant="outline">{ledger.journal_count} قيود مرحلة</Badge></div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Metric label="إيراد مرحل" value={money(ledger.posted_revenue, currency)} />
              <Metric label="تكلفة مرحلة" value={money(ledger.posted_cost, currency)} />
              <Metric label="مصروف مرحل" value={money(ledger.posted_expenses, currency)} />
              <Metric label="صافي الدفتر" value={money(ledger.posted_net, currency)} className={tone(ledger.posted_net)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {warnings.length > 0 && <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>تنبيهات المراجعة</AlertTitle><AlertDescription><ul className="mt-2 list-disc space-y-1 pr-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-5 w-5" />تفاصيل الحركات المرتبطة</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="customer">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="customer">العميل ({drilldowns.invoices.length + drilldowns.customer_payments.length})</TabsTrigger>
              <TabsTrigger value="supplier">المورد ({drilldowns.supplier_invoices.length + drilldowns.supplier_payments.length})</TabsTrigger>
              <TabsTrigger value="costs">مصروفات وعمولات ({drilldowns.expenses.length + drilldowns.commissions.length})</TabsTrigger>
              <TabsTrigger value="journals">القيود ({drilldowns.journals.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="customer"><Lines title="فواتير العميل" lines={drilldowns.invoices} currency={currency} href="/invoices" /><Lines title="تحصيلات العميل" lines={drilldowns.customer_payments} currency={currency} /></TabsContent>
            <TabsContent value="supplier"><Lines title="فواتير المورد" lines={drilldowns.supplier_invoices} currency={currency} /><Lines title="مدفوعات المورد" lines={drilldowns.supplier_payments} currency={currency} /></TabsContent>
            <TabsContent value="costs"><Lines title="المصروفات المباشرة" lines={drilldowns.expenses} currency={currency} href="/expense-management" /><Lines title="العمولات" lines={drilldowns.commissions} currency={currency} /></TabsContent>
            <TabsContent value="journals"><Lines title="قيود اليومية" lines={drilldowns.journals} currency={currency} href="/journal-entries" journal /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const SettlementCard = ({ title, settled, progress, rows, currency }: { title: string; settled: boolean; progress: number; rows: readonly (readonly [string, number])[]; currency: string }) => (
  <div className="rounded-lg border p-4 space-y-3">
    <div className="flex items-center justify-between"><p className="font-medium">{title}</p><Badge variant={settled ? 'default' : 'secondary'} className={settled ? 'bg-emerald-600' : ''}>{settled ? <><CheckCircle2 className="ml-1 h-3.5 w-3.5" />مسددة</> : 'مفتوحة'}</Badge></div>
    <Progress value={Math.max(0, Math.min(progress, 100))} className="h-2" />
    <div className="grid grid-cols-3 gap-2">{rows.map(([label, value]) => <Metric key={label} label={label} value={money(value, currency)} className={label === 'المتبقي' && value > 0 ? 'text-destructive' : ''} />)}</div>
  </div>
);

const Metric = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 font-semibold ${className}`}>{value}</p></div>;

const Lines = ({ title, lines, currency, href, journal = false }: { title: string; lines: BookingProfitLine[]; currency: string; href?: string; journal?: boolean }) => (
  <div className="mt-4 space-y-2">
    <p className="text-sm font-medium">{title}</p>
    {lines.length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد حركات.</p> : lines.map((line) => {
      const amount = journal ? line.debit : line.amount;
      const target = href ? `${href}${line.id ? `?${journal ? 'entry' : 'id'}=${line.id}` : ''}` : undefined;
      return <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
        <div><p className="font-medium">{line.number || line.description || 'حركة مالية'}</p><p className="text-xs text-muted-foreground">{line.date ? new Date(line.date).toLocaleDateString('ar-EG') : 'بدون تاريخ'} · {line.status || '—'}</p></div>
        <div className="flex items-center gap-2"><span className="font-semibold">{money(amount, line.currency || currency)}</span>{target && <Button asChild size="sm" variant="ghost"><Link to={target}>فتح<ArrowUpLeft className="mr-1 h-3.5 w-3.5" /></Link></Button>}</div>
      </div>;
    })}
  </div>
);
