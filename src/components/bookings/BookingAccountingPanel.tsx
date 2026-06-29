import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Wallet, BookOpenCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  bookingId: string;
  currency?: string;
}

export const BookingAccountingPanel: React.FC<Props> = ({ bookingId, currency = 'EGP' }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['booking-accounting', bookingId],
    queryFn: async () => {
      const [invRes, payRes, jeRes] = await Promise.all([
        (supabase as any).from('invoices').select('id, invoice_number, final_amount, total_paid_amount, payment_status, currency, issued_date').eq('booking_id', bookingId).maybeSingle(),
        (supabase as any).from('supplier_payments').select('id, amount, currency, status, paid_date, reference_number').eq('booking_id', bookingId).maybeSingle(),
        (supabase as any).from('journal_entries').select('id, entry_number, entry_date, total_debit, currency, status').eq('reference_type', 'booking').eq('reference_id', bookingId).maybeSingle(),
      ]);
      return {
        invoice: invRes.data,
        payment: payRes.data,
        journal: jeRes.data,
      };
    },
    enabled: !!bookingId,
  });

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
                {data.invoice.payment_status === 'paid' ? 'مدفوعة' : data.invoice.payment_status || 'غير محددة'}
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
            {data?.payment ? (
              <Badge variant={data.payment.status === 'paid' ? 'default' : 'outline'} className="text-[10px]">
                {data.payment.status === 'paid' ? 'مدفوع' : data.payment.status || 'غير محدد'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مسدد</Badge>
            )}
          </div>
          {data?.payment ? (
            <div>
              <div className="text-xs font-mono">{data.payment.reference_number}</div>
              <div className="text-xs text-muted-foreground">{data.payment.paid_date}</div>
              <div className="text-base font-bold">{Number(data.payment.amount).toLocaleString()} {data.payment.currency || currency}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">لم يُسدد للمورد بعد</div>
          )}
        </div>

        {/* Journal Entry */}
        <div className="border rounded-lg p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpenCheck className="h-3.5 w-3.5" /> القيد المحاسبي</span>
            {data?.journal ? (
              <Badge variant="default" className="text-[10px]">{data.journal.status === 'posted' ? 'مُرحَّل' : data.journal.status}</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">غير مُسجل</Badge>
            )}
          </div>
          {data?.journal ? (
            <Link to={`/journal-entries?id=${data.journal.id}`} className="block">
              <div className="text-sm font-mono">{data.journal.entry_number}</div>
              <div className="text-xs text-muted-foreground">{data.journal.entry_date}</div>
              <div className="text-base font-bold">{Number(data.journal.total_debit).toLocaleString()} {data.journal.currency || currency}</div>
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
