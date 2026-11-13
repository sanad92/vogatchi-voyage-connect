import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { allRows } from '@/lib/pagedRows';

export function useSupplier360(supplierId: string | undefined, canViewFinance: boolean) {
  const orgId = useOrgId();
  const enabled = !!supplierId && !!orgId;

  const supplierQ = useQuery({
    queryKey: ['sup360-supplier', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers').select('*').eq('organization_id', orgId!).eq('id', supplierId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const bookingsQ = useQuery({
    queryKey: ['sup360-bookings', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_reference:booking_number, customer_name, workflow_stage, status, total_amount:selling_price, currency, created_at, travel_date:start_date')
        .eq('organization_id', orgId!)
        .eq('supplier_id', supplierId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const posQ = useQuery({
    queryKey: ['sup360-pos', supplierId, orgId],
    enabled: enabled && canViewFinance,
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_payment_orders')
        .select('id,reference_number,status,approval_status,amount,currency,due_date,created_at')
        .eq('organization_id', orgId!).eq('supplier_id', supplierId!)
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const paymentsQ = useQuery({
    queryKey: ['sup360-payments', supplierId, orgId],
    enabled: enabled && canViewFinance,
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_payments')
        .select('id,reference_number,payment_reference,status,amount,currency,paid_date,payment_date,payment_method,created_at,notes')
        .eq('organization_id', orgId!).eq('supplier_id', supplierId!)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const invoicesQ = useQuery({
    queryKey: ['sup360-invoices', supplierId, orgId],
    enabled: enabled && canViewFinance,
    queryFn: ({ signal }) => allRows((from, to) => supabase.from('supplier_invoices')
      .select('id,invoice_number,invoice_date,due_date,amount,amount_paid,status,currency,payment_order_id,booking_id')
      .eq('organization_id', orgId!).eq('supplier_id', supplierId!)
      .order('invoice_date', { ascending: false }).order('id').range(from, to).abortSignal(signal)),
  });

  const contactsQ = useQuery({
    queryKey: ['sup360-contacts', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_contacts')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('supplier_id', supplierId!)
        .order('is_primary', { ascending: false });
      return data ?? [];
    },
  });

  const notesQ = useQuery({
    queryKey: ['sup360-notes', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_notes')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('supplier_id', supplierId!)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  return {
    supplier: supplierQ.data,
    isLoading: supplierQ.isLoading,
    bookings: bookingsQ.data ?? [],
    purchaseOrders: canViewFinance ? posQ.data ?? [] : [],
    payments: canViewFinance ? paymentsQ.data ?? [] : [],
    invoices: canViewFinance ? invoicesQ.data ?? [] : [],
    invoiceState: { isPending: invoicesQ.isPending, isError: invoicesQ.isError },
    orderState: { isPending: posQ.isPending, isError: posQ.isError },
    paymentState: { isPending: paymentsQ.isPending, isError: paymentsQ.isError },
    contacts: contactsQ.data ?? [],
    notes: notesQ.data ?? [],
    refetch: () => {
      supplierQ.refetch(); bookingsQ.refetch(); contactsQ.refetch(); notesQ.refetch();
      if (canViewFinance) {
        posQ.refetch(); paymentsQ.refetch(); invoicesQ.refetch();
      }
    },
  };
}
