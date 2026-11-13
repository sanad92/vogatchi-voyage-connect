import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useOrgId } from '@/hooks/useOrgId';
import type { ServiceKind } from '@/hooks/useBookingServices';

export type AmendmentOperation = 'change' | 'cancel';
export type AmendmentRule = 'free' | 'repriced' | 'nonrefundable' | 'partial' | 'full';
export type ServiceSource = 'linked' | 'detail';

export interface AmendmentTerms {
  operation: AmendmentOperation;
  rule: AmendmentRule;
  policy: string;
  customer_currency: string;
  cancel_value: number;
  customer_fee: number;
  fare_delta: number;
  customer_invoice_id: string | null;
  supplier_currency: string;
  supplier_fee: number;
  supplier_fare_delta: number;
  supplier_wallet: number;
  supplier_invoice_id: string | null;
  supplier_finance_ref: string | null;
  start_date: string | null;
  end_date: string | null;
  new_ticket: string | null;
}

export interface ServiceAmendment {
  id: string;
  service_kind: ServiceKind;
  service_id: string;
  service_source: ServiceSource;
  ticket_number: string | null;
  status: 'pending' | 'applied' | 'rejected';
  requested_by: string;
  requested_at: string;
  resolved_at: string | null;
  terms: AmendmentTerms;
  decision: { note?: string; customer_reference?: string; supplier_reference?: string } | null;
  customer_due_reduction: number;
  customer_refund_id: string | null;
  supplier_claim_id: string | null;
  additional_invoice_id: string | null;
  supplier_order_id: string | null;
}

interface AmendmentHistoryRow {
  service_kind: ServiceKind;
  service_id: string;
  service_source: ServiceSource;
  ticket_number: string | null;
  operation: AmendmentOperation;
  start_date: string | null;
  end_date: string | null;
  new_ticket: string | null;
  applied_at: string;
}

type AmendmentQuery = PromiseLike<{ data: ServiceAmendment[] | null; error: { message: string } | null }> & {
  eq: (column: string, value: string) => AmendmentQuery;
  order: (column: string, options: { ascending: boolean }) => AmendmentQuery;
};
const client = supabase as unknown as {
  from: (table: 'trip_service_amendments') => { select: (columns: string) => AmendmentQuery };
};
const key = (orgId: string | undefined, bookingId: string) => ['trip-service-amendments', orgId, bookingId];
const historyKey = (orgId: string | undefined, bookingId: string) => ['trip-service-amendment-history', orgId, bookingId];

export const amendmentCustomerDelta = (t: AmendmentTerms) =>
  (Math.round(t.fare_delta * 100) + Math.round(t.customer_fee * 100) - Math.round(t.cancel_value * 100)) / 100;

export const amendmentSupplierDelta = (t: AmendmentTerms) =>
  (Math.round(t.supplier_fare_delta * 100) + (t.operation === 'change' ? Math.round(t.supplier_fee * 100) : 0)) / 100;

export function amendmentCreditSplit(delta: number, outstanding: number) {
  const credit = Math.max(-Math.round(delta * 100), 0);
  const due = Math.min(credit, Math.max(0, Math.round(outstanding * 100)));
  return { due: due / 100, wallet: (credit - due) / 100 };
}

export function useTripServiceAmendments(bookingId: string, canRead: boolean) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: key(orgId, bookingId),
    enabled: !!orgId && !!bookingId && canRead,
    queryFn: async (): Promise<ServiceAmendment[]> => {
      const { data, error } = await client.from('trip_service_amendments')
        .select('id,service_kind,service_id,service_source,ticket_number,status,requested_by,requested_at,resolved_at,terms,decision,customer_due_reduction,customer_refund_id,supplier_claim_id,additional_invoice_id,supplier_order_id')
        .eq('organization_id', orgId).eq('booking_id', bookingId).order('requested_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const documents = useQuery({
    queryKey: ['trip-service-amendment-documents', orgId, bookingId],
    enabled: !!orgId && !!bookingId && canRead,
    queryFn: async () => {
      const [customer, supplier] = await Promise.all([
        supabase.from('invoices').select('id,invoice_number,currency,remaining_amount,final_amount,total_paid_amount,customer_id')
          .eq('organization_id', orgId).eq('booking_id', bookingId).eq('is_demo', false)
          .is('pilgrimage_b2b_agreement_id', null).not('status', 'in', '(draft,cancelled)').order('issued_date', { ascending: false }),
        supabase.from('supplier_invoices').select('id,invoice_number,currency,amount_paid,supplier_id')
          .eq('organization_id', orgId).eq('booking_id', bookingId).neq('status', 'cancelled').order('invoice_date', { ascending: false }),
      ]);
      if (customer.error || supplier.error) throw customer.error ?? supplier.error;
      return { customer: customer.data ?? [], supplier: supplier.data ?? [] };
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      id: string; kind: ServiceKind; source: ServiceSource; serviceId: string; ticket: string | null; terms: AmendmentTerms;
    }) => {
      const { error } = await callUntypedRpc('create_trip_service_amendment', {
        _id: input.id, _booking: bookingId, _kind: input.kind, _source: input.source,
        _service: input.serviceId, _ticket: input.ticket, _terms: input.terms,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key(orgId, bookingId) }),
        queryClient.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] }),
      ]);
    },
  });

  const resolve = useMutation({
    mutationFn: async (input: {
      id: string; approve: boolean; customerReference: string; supplierReference: string; note: string; expectedDue: number | null;
    }) => {
      const { error } = await callUntypedRpc('resolve_trip_service_amendment', {
        _id: input.id, _approve: input.approve, _customer_reference: input.customerReference,
        _supplier_reference: input.supplierReference, _note: input.note,
        _expected_customer_due_reduction: input.expectedDue,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      const keys = [
        key(orgId, bookingId), historyKey(orgId, bookingId), ['trip-service-amendment-documents', orgId, bookingId],
        ['workspace-timeline', bookingId], ['workspace-itinerary', bookingId], ['workspace-invoices', bookingId],
        ['booking-linked-services', bookingId], ['booking-financials'], ['booking-profit-cockpit'], ['invoices'],
        ['supplier-payment-orders'], ['refund-balances', orgId], ['customer-ledger', orgId],
      ];
      await Promise.all(keys.map(queryKey => queryClient.invalidateQueries({ queryKey })));
    },
  });

  return { list, documents, create, resolve };
}

export function useTripServiceAmendmentHistory(bookingId?: string) {
  const orgId = useOrgId();
  const { getPermissionScope } = useSupabasePermissions();
  return useQuery({
    queryKey: historyKey(orgId, bookingId ?? ''),
    enabled: !!orgId && !!bookingId && getPermissionScope('bookings_view') === 'organization',
    queryFn: async (): Promise<AmendmentHistoryRow[]> => {
      const { data, error } = await callUntypedRpc<AmendmentHistoryRow[]>('get_trip_service_amendment_history', { _booking: bookingId });
      if (error) throw error;
      return data ?? [];
    },
  });
}
