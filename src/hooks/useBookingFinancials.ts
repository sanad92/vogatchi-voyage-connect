/**
 * Booking Financial Workspace hook.
 * Presentation-only: reads from existing tables, does not mutate or post journals.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookingFinancials {
  booking: any;
  invoice: any | null;
  supplierPayments: any[];
  journals: any[];
  documents: any[];
  totals: {
    selling: number;
    cost: number;
    profit: number;
    profitMargin: number;
    invoiced: number;
    receivedFromCustomer: number;
    outstandingFromCustomer: number;
    paidToSupplier: number;
    outstandingToSupplier: number;
    currency: string;
  };
  timeline: Array<{
    date: string;
    kind: 'booking' | 'invoice' | 'receipt' | 'supplier_payment' | 'journal' | 'document';
    label: string;
    amount?: number;
    currency?: string;
    ref?: string;
  }>;
  warnings: string[];
}

export const useBookingFinancials = (bookingId?: string) => {
  return useQuery<BookingFinancials | null>({
    queryKey: ['booking-financials', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      if (!bookingId) return null;
      const sb: any = supabase;

      const [bk, inv, spays, jes, docs] = await Promise.all([
        sb.from('bookings').select('*').eq('id', bookingId).maybeSingle(),
        sb.from('invoices').select('*').eq('booking_id', bookingId).maybeSingle(),
        sb.from('supplier_payments').select('*').eq('booking_id', bookingId).order('payment_date', { ascending: true }),
        sb.from('journal_entries').select('id, entry_number, entry_date, total_debit, total_credit, currency, status')
          .eq('reference_type', 'booking').eq('reference_id', bookingId).order('entry_date', { ascending: true }),
        sb.from('generated_documents').select('id, document_type, file_url, created_at').eq('booking_id', bookingId).order('created_at', { ascending: false }),
      ]);

      const booking = bk.data;
      if (!booking) return null;

      const invoice = inv.data || null;
      const supplierPayments = spays.data || [];
      const journals = jes.data || [];
      const documents = docs.data || [];

      const selling = Number(booking.selling_price || 0);
      const cost = Number(booking.cost_price || 0);
      const profit = Number(booking.profit ?? selling - cost);
      const profitMargin = selling > 0 ? (profit / selling) * 100 : 0;

      const invoiced = Number(invoice?.final_amount || 0);
      const receivedFromCustomer = Number(invoice?.total_paid_amount || 0);
      const outstandingFromCustomer = Math.max(0, invoiced - receivedFromCustomer);

      const paidToSupplier = supplierPayments
        .filter((p: any) => p.status === 'paid' || p.status === 'completed')
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const outstandingToSupplier = Math.max(0, cost - paidToSupplier);

      const currency = booking.currency || invoice?.currency || 'EGP';

      // Validation warnings
      const warnings: string[] = [];
      if (invoice && Math.abs(invoiced - selling) > 0.01) {
        warnings.push(`قيمة الفاتورة (${invoiced}) لا تطابق سعر البيع (${selling}).`);
      }
      if (invoice && invoice.currency && invoice.currency !== booking.currency) {
        warnings.push(`عملة الفاتورة (${invoice.currency}) تختلف عن عملة الحجز (${booking.currency}).`);
      }
      const mixedSupplierCcy = supplierPayments.find((p: any) => p.currency && p.currency !== currency);
      if (mixedSupplierCcy) {
        warnings.push(`سداد للمورد بعملة (${mixedSupplierCcy.currency}) مختلفة عن عملة الحجز (${currency}).`);
      }
      if (Math.abs(profit - (selling - cost)) > 0.01) {
        warnings.push(`الربح المخزّن (${profit}) لا يطابق البيع − التكلفة (${selling - cost}).`);
      }

      // Timeline
      const timeline: BookingFinancials['timeline'] = [];
      timeline.push({
        date: booking.created_at,
        kind: 'booking',
        label: `تم إنشاء الحجز ${booking.booking_number || ''}`,
        amount: selling,
        currency,
      });
      if (invoice) {
        timeline.push({
          date: invoice.issued_date || invoice.created_at,
          kind: 'invoice',
          label: `إصدار فاتورة ${invoice.invoice_number}`,
          amount: invoiced,
          currency: invoice.currency,
          ref: invoice.id,
        });
        if (receivedFromCustomer > 0) {
          timeline.push({
            date: invoice.updated_at || invoice.created_at,
            kind: 'receipt',
            label: `تحصيل من العميل`,
            amount: receivedFromCustomer,
            currency: invoice.currency,
          });
        }
      }
      supplierPayments.forEach((p: any) => {
        timeline.push({
          date: p.paid_date || p.payment_date || p.created_at,
          kind: 'supplier_payment',
          label: `سداد للمورد ${p.reference_number || ''}`.trim(),
          amount: Number(p.amount || 0),
          currency: p.currency,
          ref: p.id,
        });
      });
      journals.forEach((j: any) => {
        timeline.push({
          date: j.entry_date,
          kind: 'journal',
          label: `قيد ${j.entry_number} (${j.status})`,
          amount: Number(j.total_debit || 0),
          currency: j.currency,
          ref: j.id,
        });
      });
      documents.forEach((d: any) => {
        timeline.push({
          date: d.created_at,
          kind: 'document',
          label: `مستند: ${d.document_type}`,
          ref: d.id,
        });
      });
      timeline.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      return {
        booking,
        invoice,
        supplierPayments,
        journals,
        documents,
        totals: {
          selling, cost, profit, profitMargin,
          invoiced, receivedFromCustomer, outstandingFromCustomer,
          paidToSupplier, outstandingToSupplier,
          currency,
        },
        timeline,
        warnings,
      };
    },
  });
};
