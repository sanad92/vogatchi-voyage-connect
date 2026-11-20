import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/customerMetrics';
import type { SpecializedBookingDocumentFields } from '@/lib/specializedBookingFinance';

const invoiceLabels = {
  issued: 'فاتورة صادرة',
  draft: 'فاتورة مسودة',
  archived: 'فاتورة ملغاة',
  missing: 'بدون فاتورة',
};

const voucherLabels = {
  issued: 'فاوتشر صادر',
  awaiting_confirmation: 'الفاوتشر بعد تأكيد الحجز',
  archived: 'فاوتشر مؤرشف',
  cancelled: 'الحجز ملغي',
  missing: 'بدون فاوتشر',
};

type BookingFinance = SpecializedBookingDocumentFields & {
  id: string;
  currency?: string | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
};

export function BookingListFinance({ booking }: { booking: BookingFinance }) {
  const {
    id, currency, paid_amount: paid, remaining_amount: remaining,
    invoice_id: invoiceId, invoice_document_status: invoice, voucher_document_status: voucher,
  } = booking;
  const showAmounts = currency && paid != null && remaining != null;
  if (!showAmounts && !invoice && !voucher) return null;

  return (
    <div className="space-y-2 text-sm">
      {showAmounts && (
        <dl className="grid gap-1">
          <div className="flex justify-between gap-2">
            <dt>المسدّد على الفواتير</dt><dd><bdi>{formatMoney(Number(paid), currency)}</bdi></dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>المتبقي على الفواتير</dt><dd><bdi>{formatMoney(Number(remaining), currency)}</bdi></dd>
          </div>
        </dl>
      )}
      {(invoice || voucher) && (
        <div className="flex flex-wrap gap-2">
          {invoice && (invoiceId
            ? <Link to={`/invoices?id=${invoiceId}`}><Badge variant="outline">{invoiceLabels[invoice]}</Badge></Link>
            : <Badge variant="secondary">{invoiceLabels[invoice]}</Badge>)}
          {voucher && (
            <Link to={`/bookings/${id}?tab=documents`}><Badge variant="outline">{voucherLabels[voucher]}</Badge></Link>
          )}
        </div>
      )}
    </div>
  );
}
