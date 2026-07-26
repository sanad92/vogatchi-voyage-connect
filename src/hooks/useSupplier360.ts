import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export function useSupplier360(supplierId?: string) {
  const orgId = useOrgId();
  const enabled = !!supplierId && !!orgId;

  const supplierQ = useQuery({
    queryKey: ['sup360-supplier', supplierId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('suppliers').select('*').eq('id', supplierId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const bookingsQ = useQuery({
    queryKey: ['sup360-bookings', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('id, booking_reference, customer_name, workflow_stage, total_amount, currency, created_at, travel_date')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const posQ = useQuery({
    queryKey: ['sup360-pos', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_payment_orders')
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ['sup360-payments', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_payments')
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const invoicesQ = useQuery({
    queryKey: ['sup360-invoices', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_invoices')
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const contactsQ = useQuery({
    queryKey: ['sup360-contacts', supplierId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('is_primary', { ascending: false });
      return data ?? [];
    },
  });

  const notesQ = useQuery({
    queryKey: ['sup360-notes', supplierId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_notes')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const ratingsQ = useQuery({
    queryKey: ['sup360-ratings', supplierId, orgId],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('supplier_ratings')
        .select('*')
        .eq('organization_id', orgId)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // KPIs
  const kpi = (() => {
    const bookings = bookingsQ.data ?? [];
    const payments = paymentsQ.data ?? [];
    const pos = posQ.data ?? [];
    const invoices = invoicesQ.data ?? [];
    const ratings = ratingsQ.data ?? [];

    const totalPurchases = invoices.reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const openPOs = pos.filter((p: any) => (p.status ?? '') !== 'paid' && (p.status ?? '') !== 'cancelled').length;
    const outstandingBalance = totalPurchases - totalPaid;
    const avgRating = ratings.length
      ? ratings.reduce((s: number, r: any) => s + Number(r.rating ?? 0), 0) / ratings.length
      : Number(supplierQ.data?.rating ?? 0);

    return {
      totalPurchases, totalPaid, outstandingBalance,
      bookingsCount: bookings.length, openPOs,
      avgRating, invoicesCount: invoices.length,
    };
  })();

  return {
    supplier: supplierQ.data,
    isLoading: supplierQ.isLoading,
    bookings: bookingsQ.data ?? [],
    purchaseOrders: posQ.data ?? [],
    payments: paymentsQ.data ?? [],
    invoices: invoicesQ.data ?? [],
    contacts: contactsQ.data ?? [],
    notes: notesQ.data ?? [],
    ratings: ratingsQ.data ?? [],
    kpi,
    refetch: () => {
      supplierQ.refetch(); bookingsQ.refetch(); posQ.refetch();
      paymentsQ.refetch(); invoicesQ.refetch(); contactsQ.refetch();
      notesQ.refetch(); ratingsQ.refetch();
    },
  };
}
