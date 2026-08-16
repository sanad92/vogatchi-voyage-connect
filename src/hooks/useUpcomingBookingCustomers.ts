import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

export interface UpcomingBookingCustomer {
  customer_id: string;
  name: string;
  phone: string;
  next_start_date: string;
  bookings_count: number;
  booking_number: string;
}

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Customers that have at least one non-cancelled booking starting within the
 * next `days` days. Used to target WhatsApp campaigns at travellers with
 * upcoming trips.
 */
export const useUpcomingBookingCustomers = (days = 30) => {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ['upcoming-booking-customers', orgId, days],
    enabled: !!orgId,
    queryFn: async (): Promise<UpcomingBookingCustomer[]> => {
      const today = new Date().toISOString().slice(0, 10);

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, booking_number, customer_id, customer_name, start_date, status')
        .eq('organization_id', orgId!)
        .not('customer_id', 'is', null)
        .gte('start_date', today)
        .lte('start_date', addDays(days))
        .order('start_date', { ascending: true })
        .limit(5000);
      if (error) throw error;

      const active = (bookings || []).filter(
        (b: any) => String(b.status || '').toLowerCase() !== 'cancelled',
      );
      if (active.length === 0) return [];

      const customerIds = Array.from(new Set(active.map((b: any) => b.customer_id as string)));

      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp_opt_out')
        .eq('organization_id', orgId!)
        .in('id', customerIds);
      if (custErr) throw custErr;

      const byId = new Map((customers || []).map((c: any) => [c.id, c]));
      const result = new Map<string, UpcomingBookingCustomer>();

      for (const b of active as any[]) {
        const c: any = byId.get(b.customer_id);
        if (!c || !c.phone || c.whatsapp_opt_out) continue;
        const existing = result.get(c.id);
        if (existing) {
          existing.bookings_count += 1;
          continue;
        }
        result.set(c.id, {
          customer_id: c.id,
          name: c.name,
          phone: c.phone,
          next_start_date: b.start_date,
          bookings_count: 1,
          booking_number: b.booking_number,
        });
      }

      return Array.from(result.values()).sort((a, b) =>
        a.next_start_date.localeCompare(b.next_start_date),
      );
    },
  });
};
