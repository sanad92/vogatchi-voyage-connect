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
  const { data, isLoading } = useBookingFinancials(bookingId);

  if (isLoading) return <div className="text-sm text-muted-foreground py-4 text-center">جارٍ تحميل البيانات المحاسبية...</div>;

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
                {data.invoices.length} — {data.invoice.payment_status === 'paid' ? 'مدفوعة' : data.invoice.payment_status || 'غير محددة'}
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
            {data?.supplierInvoices.length ? (
              <Badge variant={data.totals.outstandingToSupplier === 0 ? 'default' : 'outline'} className="text-[10px]">
                {data.totals.outstandingToSupplier === 0 ? 'مسدد بالكامل' : 'مستحق'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مسدد</Badge>
            )}
          </div>
          {data?.supplierInvoices.length ? (
            <div>
              <div className="text-xs font-mono">{data.supplierInvoices.map((row) => row.invoice_number).join('، ')}</div>
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
            <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpenCheck className="h-3.5 w-3.5" /> القيد المحاسبي</span>
            {data?.journals.length ? (
              <Badge variant="default" className="text-[10px]">{data.journals.length} قيد</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مُسجل</Badge>
            )}
          </div>
          {data?.journals.length ? (
            <Link to={`/journal-entries?id=${data.journals.at(-1)?.id}`} className="block">
              <div className="text-sm font-mono">{data.journals.at(-1)?.entry_number}</div>
              <div className="text-xs text-muted-foreground">آخر ترحيل: {data.journals.at(-1)?.entry_date}</div>
              <div className="text-base font-bold">{Number(data.journals.reduce((sum, row) => sum + Number(row.total_debit || 0), 0)).toLocaleString()} {data.totals.currency || currency}</div>
            </Link>
          ) : (
            <div className="text-xs text-muted-foreground">سيتم التسجيل عند تأكيد الحجز</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingAccountingPanel;
