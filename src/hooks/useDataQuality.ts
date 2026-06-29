import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface DataQualityCounts {
  bookings_missing_dates: number;
  bookings_missing_prices: number;
  bookings_missing_supplier: number;
  bookings_no_customer: number;
  customers_no_email: number;
  customers_no_phone: number;
}

export const useDataQuality = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['data-quality', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<DataQualityCounts> => {
      const { data, error } = await supabase.rpc('get_incomplete_records', {
        _org_id: orgId!,
      });
      if (error) throw error;
      return (data as unknown as DataQualityCounts) || {
        bookings_missing_dates: 0,
        bookings_missing_prices: 0,
        bookings_missing_supplier: 0,
        bookings_no_customer: 0,
        customers_no_email: 0,
        customers_no_phone: 0,
      };
    },
    staleTime: 60_000,
  });
};

export interface IncompleteBooking {
  id: string;
  booking_number: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  service_type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  selling_price: number | null;
  cost_price: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  currency: string | null;
  created_at: string;
}

export const useIncompleteBookings = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['incomplete-bookings', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<IncompleteBooking[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_number, customer_id, service_type, status, start_date, end_date, selling_price, cost_price, supplier_id, supplier_name, currency, created_at, customers(name)')
        .eq('organization_id', orgId!)
        .or('start_date.is.null,end_date.is.null,selling_price.is.null,selling_price.eq.0,cost_price.is.null,cost_price.eq.0,supplier_id.is.null')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        customer_name: b.customers?.name ?? null,
      }));
    },
  });
};
