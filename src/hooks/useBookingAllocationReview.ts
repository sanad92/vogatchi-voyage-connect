import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import type { BookingFinancials } from '@/hooks/useBookingFinancials';
import type { BookingSourceEvidence } from '@/hooks/useBookingChangeSourceEvidence';
import {
  reviewBookingEvidenceAllocations,
  type CustomerAllocationRow,
  type SupplierAllocationRow,
  type FinanceSourceRow,
} from '@/lib/tripFile/allocationReview';

type AllocationRows = {
  customer: CustomerAllocationRow[];
  supplier: SupplierAllocationRow[];
  incompleteData: boolean;
};

const client = supabase as any;
const MAX_ROWS_PER_QUERY = 400;
const MAX_DOCUMENT_IDS = 120;
const unique = (ids: Array<string | null | undefined>) =>
  [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];

/**
 * Read existing allocation tables ONLY (never mutates invoice or cash).
 * Query by real booking invoice/payment IDs plus organization scope; RLS must
 * still enforce the signed-in user. A full/truncated result fails closed.
 */
export function useBookingAllocationReview(
  bookingId: string,
  financials: BookingFinancials | null | undefined,
  linkedEvidence: BookingSourceEvidence[] | undefined,
) {
  const orgId = useOrgId();
  const invoiceIds = unique(financials?.invoices.map(i => i.id) ?? []);
  const customerPaymentIds = unique(financials?.customerPayments.map(p => p.id) ?? []);
  const supplierInvoiceIds = unique(financials?.supplierInvoices.map(i => i.id) ?? []);
  const supplierPaymentIds = unique(financials?.supplierPayments.map(p => p.id) ?? []);
  const keys = [invoiceIds, customerPaymentIds, supplierInvoiceIds, supplierPaymentIds];
  const sourceCount = keys.reduce((n, ids) => n + ids.length, 0);
  const tooManyIds = keys.some(ids => ids.length > MAX_DOCUMENT_IDS);

  const allocationQuery = useQuery({
    queryKey: ['trip-file-allocation-review', orgId, bookingId, ...keys.map(ids => ids.join(','))],
    enabled: Boolean(orgId && bookingId && financials && !tooManyIds),
    staleTime: 30_000,
    queryFn: async (): Promise<AllocationRows> => {
      if (!orgId || !financials || financials.booking.organization_id !== orgId) {
        throw new Error('شركة الحجز لا تطابق الشركة المحددة');
      }

      async function fetchRows(
        table: 'customer_payment_allocations' | 'supplier_payment_allocations',
        selectFields: string,
        field: string,
        ids: string[],
      ): Promise<{ rows: any[]; truncated: boolean }> {
        if (!ids.length) return { rows: [], truncated: false };
        const { data, error } = await client.from(table)
          .select(selectFields)
          .eq('organization_id', orgId)
          .in(field, ids)
          .limit(MAX_ROWS_PER_QUERY);
        if (error) throw error;
        const rows = (data ?? []) as any[];
        // Exactly MAX rows may mean more unseen; never certify completeness.
        return { rows, truncated: rows.length >= MAX_ROWS_PER_QUERY };
      }

      const [customerByInvoice, customerByPayment, supplierByInvoice, supplierByPayment] =
        await Promise.all([
          fetchRows('customer_payment_allocations',
            'id,organization_id,invoice_id,payment_id,amount',
            'invoice_id', invoiceIds),
          fetchRows('customer_payment_allocations',
            'id,organization_id,invoice_id,payment_id,amount',
            'payment_id', customerPaymentIds),
          fetchRows('supplier_payment_allocations',
            'id,organization_id,supplier_invoice_id,supplier_payment_id,amount',
            'supplier_invoice_id', supplierInvoiceIds),
          fetchRows('supplier_payment_allocations',
            'id,organization_id,supplier_invoice_id,supplier_payment_id,amount',
            'supplier_payment_id', supplierPaymentIds),
        ]);

      const customer = new Map<string, CustomerAllocationRow>();
      const supplier = new Map<string, SupplierAllocationRow>();
      for (const x of [...customerByInvoice.rows, ...customerByPayment.rows]) {
        customer.set(x.id, x as CustomerAllocationRow);
      }
      for (const x of [...supplierByInvoice.rows, ...supplierByPayment.rows]) {
        supplier.set(x.id, x as SupplierAllocationRow);
      }
      return {
        customer: [...customer.values()],
        supplier: [...supplier.values()],
        incompleteData: [customerByInvoice, customerByPayment, supplierByInvoice, supplierByPayment]
          .some(x => x.truncated),
      };
    },
  });

  const review = orgId && financials && linkedEvidence && allocationQuery.data && !tooManyIds
    ? reviewBookingEvidenceAllocations({
        orgId,
        bookingId,
        links: linkedEvidence,
        incompleteData: allocationQuery.data.incompleteData,
        customerAllocations: allocationQuery.data.customer,
        supplierAllocations: allocationQuery.data.supplier,
        customerInvoices: financials.invoices.map(i => ({
          id: i.id, organization_id: i.organization_id, booking_id: i.booking_id,
          currency: i.currency, status: i.status, amount: i.final_amount,
          recordedPaid: i.total_paid_amount,
        } satisfies FinanceSourceRow)),
        supplierInvoices: financials.supplierInvoices.map(i => ({
          id: i.id, organization_id: i.organization_id, booking_id: i.booking_id,
          currency: i.currency, status: i.status, amount: i.amount,
          recordedPaid: i.amount_paid,
        } satisfies FinanceSourceRow)),
        customerPayments: financials.customerPayments.map(p => ({
          id: p.id, organization_id: p.organization_id, booking_id: p.booking_id,
          currency: p.currency, status: p.status, amount: p.amount,
        } satisfies FinanceSourceRow)),
        supplierPayments: financials.supplierPayments.map(p => ({
          id: p.id, organization_id: p.organization_id, booking_id: p.booking_id,
          currency: p.currency, status: p.status, amount: p.amount,
        } satisfies FinanceSourceRow)),
        generatedDocuments: financials.documents.map(d => ({
          id: d.id, organization_id: d.organization_id, booking_id: d.booking_id,
          currency: d.currency, status: 'document_record', amount: d.total_amount,
        } satisfies FinanceSourceRow)),
      })
    : [];

  return {
    ...allocationQuery,
    review,
    tooManyIds,
    sourceCount,
    incompleteData: tooManyIds || Boolean(allocationQuery.data?.incompleteData),
  };
}
