import { ListLoadError } from '@/components/common/ListLoadError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Wallet, BookOpenCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBookingFinancials } from '@/hooks/useBookingFinancials';

interface Props {
  bookingId: string;
  currency?: string;
}

export const BookingAccountingPanel: React.FC<Props> = ({ bookingId, currency = 'EGP' }) => {
  const { data, isLoading, isError, refetch, isFetching } = useBookingFinancials(bookingId);

  const postedJournals = data?.journals.filter(journal => journal.status === 'posted') ?? [];
  const latestJournal = postedJournals.at(-1);
  const sourceInvoice = latestJournal?.source_type === 'invoice'
    ? data?.invoices.find(invoice => invoice.id === latestJournal.source_id) : undefined;
  const sourceSupplierInvoice = latestJournal?.source_type === 'supplier_invoice'
    ? data?.supplierInvoices.find(invoice => invoice.id === latestJournal.source_id) : undefined;
  const sourcePayment = latestJournal?.source_type === 'customer_payment'
    ? data?.customerPayments.find(payment => payment.id === latestJournal.source_id) : undefined;
  const supplierCancelled = data?.totals.payableSource === 'cancelled_supplier_invoices';

  if (isLoading) return <div className="text-sm text-muted-foreground py-4 text-center">جارٍ تحميل البيانات المحاسبية...</div>;

  if (isError) return <ListLoadError message="تعذر تحميل الربط المحاسبي" retry={() => void refetch()} pending={isFetching} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpenCheck className="h-5 w-5" />
          الربط المحاسبي
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Invoice */}
        <div className="border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> فاتورة العميل</span>
            {data?.invoice ? (
              <Badge variant={data.invoice.payment_status === 'paid' ? 'default' : 'outline'} className="text-[10px]">
                {data.invoice.status === 'cancelled' ? 'ملغاة' : data.invoice.payment_status === 'paid' ? 'مدفوعة' : data.invoice.payment_status || 'غير محددة'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مُصدرة</Badge>
            )}
          </div>
          {data?.invoice ? (
            <Link to={`/invoices?id=${data.invoice.id}`} className="block">
              <div className="text-sm font-mono">{data.invoice.invoice_number}</div>
              <div className="text-xs text-muted-foreground">{data.invoice.issued_date}</div>
              <div className="text-base font-bold">{Number(data.invoice.final_amount).toLocaleString()} {data.invoice.currency || currency}</div>
            </Link>
          ) : (
            <div className="text-xs text-muted-foreground">لم يتم إصدار فاتورة بعد</div>
          )}
        </div>

        {/* Supplier Payment */}
        <div className="border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> سداد المورد</span>
            {supplierCancelled ? <Badge variant="outline" className="text-[10px]">ملغي</Badge> : data && (data.supplierInvoices.length > 0 || data.supplierPayments.length > 0) ? (
              <Badge variant={data.totals.outstandingToSupplier === 0 ? 'default' : 'outline'} className="text-[10px]">
                {data.totals.outstandingToSupplier === 0 ? 'مسدد بالكامل' : 'مستحق'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مسدد</Badge>
            )}
          </div>
          {supplierCancelled ? <div className="text-sm">المتبقي للمورد: <strong>0 {data?.totals.currency || currency}</strong></div> : data && (data.supplierInvoices.length > 0 || data.supplierPayments.length > 0) ? (
            <div>
              {data.supplierInvoices.length > 0 ? (
                <div className="text-xs font-mono">{data.supplierInvoices.map((row) => row.invoice_number).join('، ')}</div>
              ) : (
                <div className="text-xs text-muted-foreground">دفعات مسجلة بدون فاتورة مورد</div>
              )}
              <div className="text-xs text-muted-foreground">{data.supplierPayments.length} دفعة مسجلة</div>
              <div className="text-base font-bold">{data.totals.outstandingToSupplier.toLocaleString()} {data.totals.currency || currency} متبقي</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">لم يُسدد للمورد بعد</div>
          )}
        </div>

        {/* Journal Entry */}
        <div className="border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpenCheck className="h-3.5 w-3.5" /> القيود المحاسبية</span>
            {data?.journals.length ? (
              <Badge variant="default" className="text-[10px]">{data.journals.length} قيد</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مُسجل</Badge>
            )}
          </div>
          {latestJournal ? (
            <div className="space-y-1">
            <Link to={`/journal-entries?entry=${latestJournal.id}`} className="block hover:underline">
              <div className="text-sm font-mono">{latestJournal.entry_number}</div>
              <div className="text-xs text-muted-foreground">آخر ترحيل: {latestJournal.entry_date}</div>
              <div className="text-sm">{latestJournal.description}</div>
              <div className="text-base font-bold">إجمالي المدين في آخر قيد مُرحّل: {Number(latestJournal.total_debit).toLocaleString()} {latestJournal.currency || currency}</div>
            </Link>
            {sourceInvoice && <Link className="block text-sm text-primary underline" to={`/invoices?id=${sourceInvoice.id}`}>
              فاتورة العميل {sourceInvoice.invoice_number}
            </Link>}
            {sourceSupplierInvoice && (sourceSupplierInvoice.payment_order_id
              ? <Link className="block text-sm text-primary underline" to={`/payment-orders?id=${sourceSupplierInvoice.payment_order_id}`}>
                أمر الدفع المرتبط بفاتورة المورد {sourceSupplierInvoice.invoice_number}
              </Link>
              : <p className="text-sm">فاتورة المورد {sourceSupplierInvoice.invoice_number}</p>)}
            {sourcePayment && <Link className="block text-sm text-primary underline" to={`/bookings/${bookingId}?tab=financials`}>دفعة العميل المرتبطة بالقيد</Link>}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">لا توجد قيود مُرحّلة مرتبطة بالحجز</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingAccountingPanel;
