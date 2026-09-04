/** Booking financial workspace: one read model for AR, AP, cash and journals. */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type BookingRow = Tables['bookings']['Row'];
type InvoiceRow = Tables['invoices']['Row'];
type CustomerPaymentRow = Tables['customer_payments']['Row'];
type SupplierInvoiceRow = Tables['supplier_invoices']['Row'];
type SupplierPaymentOrderRow = Tables['supplier_payment_orders']['Row'];
type SupplierPaymentRow = Tables['supplier_payments']['Row'];
type JournalEntryRow = Tables['journal_entries']['Row'];
type GeneratedDocumentRow = Tables['generated_documents']['Row'];

export interface BookingFinancials {
  booking: BookingRow;
  invoices: InvoiceRow[];
  invoice: InvoiceRow | null;
  customerPayments: CustomerPaymentRow[];
  supplierInvoices: SupplierInvoiceRow[];
  paymentOrders: SupplierPaymentOrderRow[];
  supplierPayments: SupplierPaymentRow[];
  journals: JournalEntryRow[];
  documents: GeneratedDocumentRow[];
  totals: {
    selling: number;
    cost: number;
    profit: number;
    profitMargin: number;
    invoiced: number;
    customerReceipts: number;
    receivedFromCustomer: number;
    outstandingFromCustomer: number;
    supplierInvoiced: number;
    supplierCashPaid: number;
    paidToSupplier: number;
    outstandingToSupplier: number;
    payableSource: 'supplier_invoice' | 'booking_cost_estimate';
    currency: string;
  };
  timeline: Array<{
    date: string;
    kind: 'booking' | 'invoice' | 'receipt' | 'supplier_invoice' | 'supplier_order' | 'supplier_payment' | 'journal' | 'document';
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
      const [bk, invs, cpays, sinvs, orders, spays, jes, docs] = await Promise.all([
        supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle(),
        supabase.from('invoices').select('*').eq('booking_id', bookingId).order('issued_date', { ascending: true }),
        supabase.from('customer_payments').select('*').eq('booking_id', bookingId).order('payment_date', { ascending: true }),
        supabase.from('supplier_invoices').select('*').eq('booking_id', bookingId).order('invoice_date', { ascending: true }),
        supabase.from('supplier_payment_orders').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true }),
        supabase.from('supplier_payments').select('*').eq('booking_id', bookingId).order('payment_date', { ascending: true }),
        supabase.from('journal_entries').select('*').eq('booking_id', bookingId).order('entry_date', { ascending: true }),
        supabase.from('generated_documents').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }),
      ]);

      const firstError = [bk, invs, cpays, sinvs, orders, spays, jes, docs].find((result) => result.error)?.error;
      if (firstError) throw firstError;

      const booking = bk.data;
      if (!booking) return null;

      const invoices = (invs.data || []).filter((row) => row.status !== 'cancelled');
      const invoice = invoices.at(-1) || null;
      const customerPayments = (cpays.data || []).filter((row) => row.status === 'completed');
      const supplierInvoices = (sinvs.data || []).filter((row) => row.status !== 'cancelled');
      const paymentOrders = orders.data || [];
      const supplierPayments = spays.data || [];
      const journals = jes.data || [];
      const documents = docs.data || [];

      const selling = Number(booking.selling_price || 0);
      const cost = Number(booking.cost_price || 0);
      const profit = selling - cost;
      const profitMargin = selling > 0 ? (profit / selling) * 100 : 0;

      const invoiced = invoices.reduce((sum, row) => sum + Number(row.final_amount || 0), 0);
      const structuredReceipts = customerPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const invoicePaidTotal = invoices.reduce((sum, row) => sum + Number(row.total_paid_amount || 0), 0);
      const customerReceipts = structuredReceipts;
      const receivedFromCustomer = invoicePaidTotal;
      const outstandingFromCustomer = Math.max(0, invoiced - receivedFromCustomer);

      const supplierCashPaid = supplierPayments
        .filter((row) => row.status === 'paid' || row.status === 'completed')
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const supplierInvoiced = supplierInvoices.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const supplierInvoicePaid = supplierInvoices.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
      const payableSource = supplierInvoices.length > 0 ? 'supplier_invoice' : 'booking_cost_estimate';
      const paidToSupplier = supplierInvoices.length > 0 ? supplierInvoicePaid : supplierCashPaid;
      const outstandingToSupplier = Math.max(0, (supplierInvoices.length > 0 ? supplierInvoiced : cost) - paidToSupplier);

      const currency = booking.currency || invoice?.currency || 'EGP';

      // Validation warnings
      const warnings: string[] = [];
      if (invoices.length > 0 && Math.abs(invoiced - selling) > 0.01) {
        warnings.push(`قيمة الفاتورة (${invoiced}) لا تطابق سعر البيع (${selling}).`);
      }
      const mixedInvoiceCurrency = invoices.find((row) => row.currency && row.currency !== booking.currency);
      if (mixedInvoiceCurrency) {
        warnings.push(`عملة فاتورة العميل (${mixedInvoiceCurrency.currency}) تختلف عن عملة الحجز (${booking.currency}).`);
      }
      const mixedSupplierCcy = [...supplierInvoices, ...supplierPayments].find((row) => row.currency && row.currency !== currency);
      if (mixedSupplierCcy) {
        warnings.push(`حركة مورد بعملة (${mixedSupplierCcy.currency}) مختلفة عن عملة الحجز (${currency}).`);
      }
      if (Math.abs(Number(booking.profit || 0) - profit) > 0.01) {
        warnings.push(`الربح المخزّن (${booking.profit}) لا يطابق البيع − التكلفة (${profit}).`);
      }
      if (['confirmed', 'completed'].includes(booking.status) && cost > 0 && supplierInvoices.length === 0) {
        warnings.push('لم تُنشأ فاتورة/استحقاق للمورد رغم تأكيد الحجز وتسجيل التكلفة.');
      }
      if (supplierInvoices.length > 0 && Math.abs(supplierInvoiced - cost) > 0.01) {
        warnings.push(`إجمالي استحقاق المورد (${supplierInvoiced}) لا يطابق تكلفة الحجز (${cost}).`);
      }
      if (supplierInvoices.length > 0 && Math.abs(supplierInvoicePaid - supplierCashPaid) > 0.01) {
        warnings.push('تخصيص دفعات المورد لا يطابق إجمالي المدفوع على الحجز.');
      }
      if (customerReceipts > receivedFromCustomer + 0.01) {
        warnings.push(`يوجد ${customerReceipts - receivedFromCustomer} ${currency} محصل من العميل وغير مخصص على فاتورة.`);
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
      invoices.forEach((row) => {
        timeline.push({
          date: row.issued_date || row.created_at,
          kind: 'invoice',
          label: `إصدار فاتورة ${row.invoice_number}`,
          amount: Number(row.final_amount || 0),
          currency: row.currency,
          ref: row.id,
        });
      });
      customerPayments.forEach((row) => {
        timeline.push({ date: row.payment_date, kind: 'receipt', label: 'تحصيل من العميل', amount: Number(row.amount), currency: row.currency, ref: row.id });
      });
      supplierInvoices.forEach((row) => {
        timeline.push({ date: row.invoice_date, kind: 'supplier_invoice', label: `استحقاق مورد ${row.invoice_number}`, amount: Number(row.amount), currency: row.currency, ref: row.id });
      });
      paymentOrders.forEach((row) => {
        timeline.push({ date: row.created_at, kind: 'supplier_order', label: `أمر دفع ${row.reference_number} (${row.approval_status})`, amount: Number(row.amount), currency: row.currency, ref: row.id });
      });
      supplierPayments.forEach((p) => {
        timeline.push({
          date: p.paid_date || p.payment_date || p.created_at,
          kind: 'supplier_payment',
          label: `سداد للمورد ${p.reference_number || ''}`.trim(),
          amount: Number(p.amount || 0),
          currency: p.currency,
          ref: p.id,
        });
      });
      journals.forEach((j) => {
        timeline.push({
          date: j.entry_date,
          kind: 'journal',
          label: `قيد ${j.entry_number} (${j.status})`,
          amount: Number(j.total_debit || 0),
          currency: j.currency,
          ref: j.id,
        });
      });
      documents.forEach((d) => {
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
        invoices, invoice, customerPayments, supplierInvoices, paymentOrders,
        supplierPayments,
        journals,
        documents,
        totals: {
          selling, cost, profit, profitMargin,
          invoiced, customerReceipts, receivedFromCustomer, outstandingFromCustomer,
          supplierInvoiced, supplierCashPaid, paidToSupplier, outstandingToSupplier, payableSource,
          currency,
        },
        timeline,
        warnings,
      };
    },
  });
};
