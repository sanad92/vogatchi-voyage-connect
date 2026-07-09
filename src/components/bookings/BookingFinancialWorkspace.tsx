import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import {
  Wallet, FileText, Receipt, BookOpenCheck, AlertTriangle, TrendingUp,
  FileCheck2, Clock, User, Building2,
} from 'lucide-react';
import { useBookingFinancials } from '@/hooks/useBookingFinancials';

interface Props { bookingId: string }

const fmt = (n: number, ccy = 'EGP') =>
  `${(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${ccy}`;

const KindMeta: Record<string, { icon: any; color: string; label: string }> = {
  booking: { icon: FileCheck2, color: 'text-primary', label: 'حجز' },
  invoice: { icon: FileText, color: 'text-blue-600', label: 'فاتورة' },
  receipt: { icon: Receipt, color: 'text-green-600', label: 'تحصيل' },
  supplier_payment: { icon: Wallet, color: 'text-purple-600', label: 'سداد مورد' },
  journal: { icon: BookOpenCheck, color: 'text-amber-600', label: 'قيد' },
  document: { icon: FileCheck2, color: 'text-muted-foreground', label: 'مستند' },
};

export const BookingFinancialWorkspace: React.FC<Props> = ({ bookingId }) => {
  const { data, isLoading } = useBookingFinancials(bookingId);

  if (isLoading) return <div className="text-sm text-muted-foreground py-6 text-center">جارٍ تحميل مساحة العمل المالية…</div>;
  if (!data) return null;

  const { booking, invoice, supplierPayments, totals, timeline, warnings } = data;
  const ccy = totals.currency;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          مساحة العمل المالية للحجز
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {warnings.length > 0 && (
          <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pr-4 space-y-1 text-xs">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3.5 w-3.5" /> العميل</div>
            <div className="font-medium mt-1">{booking.customer_name || '—'}</div>
            {booking.customer_id && (
              <Link to={`/customer-ledger?id=${booking.customer_id}`} className="text-xs text-primary hover:underline">
                فتح كشف الحساب →
              </Link>
            )}
          </div>
          <div className="border rounded-lg p-3 bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> المورد</div>
            <div className="font-medium mt-1">{booking.supplier_name || '—'}</div>
            {booking.supplier_id && (
              <Link to={`/supplier-ledger?id=${booking.supplier_id}`} className="text-xs text-primary hover:underline">
                فتح كشف الحساب →
              </Link>
            )}
          </div>
        </div>

        {/* Financial totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="سعر البيع" value={fmt(totals.selling, ccy)} />
          <KPI label="تكلفة المورد" value={fmt(totals.cost, ccy)} tone="warn" />
          <KPI label="الربح المقدّر" value={fmt(totals.profit, ccy)} tone={totals.profit >= 0 ? 'good' : 'bad'} sub={`${totals.profitMargin.toFixed(1)}%`} />
          <KPI label="عملة الحجز" value={ccy} />
        </div>

        <Separator />

        {/* AR / AP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1"><Receipt className="h-4 w-4" /> جهة العميل</span>
              {invoice ? (
                <Link to={`/invoices?id=${invoice.id}`}>
                  <Badge variant="outline" className="text-[10px] font-mono">{invoice.invoice_number}</Badge>
                </Link>
              ) : <Badge variant="outline" className="text-[10px] border-amber-500/40">لا توجد فاتورة</Badge>}
            </div>
            <Row label="قيمة الفاتورة" value={fmt(totals.invoiced, ccy)} />
            <Row label="المحصّل" value={fmt(totals.receivedFromCustomer, ccy)} tone="good" />
            <Row label="المتبقي على العميل" value={fmt(totals.outstandingFromCustomer, ccy)} tone={totals.outstandingFromCustomer > 0 ? 'bad' : 'muted'} bold />
          </div>

          <div className="border rounded-lg p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1"><Wallet className="h-4 w-4" /> جهة المورد</span>
              <Badge variant="outline" className="text-[10px]">{supplierPayments.length} سداد</Badge>
            </div>
            <Row label="تكلفة الحجز" value={fmt(totals.cost, ccy)} />
            <Row label="المسدّد للمورد" value={fmt(totals.paidToSupplier, ccy)} tone="good" />
            <Row label="المتبقي للمورد" value={fmt(totals.outstandingToSupplier, ccy)} tone={totals.outstandingToSupplier > 0 ? 'bad' : 'muted'} bold />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="text-sm font-medium flex items-center gap-1 mb-2">
            <Clock className="h-4 w-4" /> الخط الزمني المالي
          </div>
          {timeline.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">لا توجد أحداث مالية بعد.</div>
          ) : (
            <ol className="relative border-r border-border pr-4 space-y-3">
              {timeline.map((ev, i) => {
                const meta = KindMeta[ev.kind];
                const Icon = meta.icon;
                return (
                  <li key={i} className="relative">
                    <span className="absolute -right-[22px] top-1 h-3 w-3 rounded-full bg-background border-2 border-primary" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${meta.color}`}>
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </div>
                        <div className="text-sm">{ev.label}</div>
                        <div className="text-[11px] text-muted-foreground">{ev.date ? new Date(ev.date).toLocaleString('ar-EG') : ''}</div>
                      </div>
                      {typeof ev.amount === 'number' && (
                        <div className="text-sm font-mono whitespace-nowrap">{fmt(ev.amount, ev.currency || ccy)}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const KPI = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) => {
  const color = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : '';
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
};

const Row = ({ label, value, tone, bold }: { label: string; value: string; tone?: 'good' | 'bad' | 'muted'; bold?: boolean }) => {
  const color = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : tone === 'muted' ? 'text-muted-foreground' : '';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${color}`}>{value}</span>
    </div>
  );
};

export default BookingFinancialWorkspace;
