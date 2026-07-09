import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export interface Customer360 {
  customer: any | null;
  bookings: any[];
  hotelBookings: any[];
  flightBookings: any[];
  payments: any[];
  conversations: any[];
  stats: {
    totalBookings: number;
    totalSpent: number;
    lastBookingDate: string | null;
    lifetimeMonths: number;
    conversationsCount: number;
    customerScore: number; // 0-100
  };
}

/**
 * Aggregates a full 360° view for a customer by phone number.
 */
export const useCustomer360 = (phone?: string | null, customerId?: string | null) => {
  const orgId = useOrgId();

  return useQuery({
    queryKey: ['customer-360', orgId, phone, customerId],
    enabled: !!orgId && (!!phone || !!customerId),
    queryFn: async (): Promise<Customer360> => {
      // 1) Find customer by id or phone
      let customer: any = null;
      if (customerId) {
        const { data } = await (supabase as any)
          .from('customers').select('*, segment:customer_segments(*)')
          .eq('id', customerId).maybeSingle();
        customer = data;
      } else if (phone) {
        const normalized = phone.replace(/[^\d]/g, '');
        const { data } = await (supabase as any)
          .from('customers').select('*, segment:customer_segments(*)')
          .or(`phone.eq.${phone},phone.eq.+${normalized},phone.eq.${normalized}`)
          .limit(1).maybeSingle();
        customer = data;
      }

      const cid = customer?.id;

      // 2) Fetch bookings / hotels / flights / payments in parallel
      // payment_transactions has no customer_id column — resolve payments through invoices → booking → paid amount
      const [bookingsRes, hotelsRes, flightsRes, invoicesRes, convsRes] = await Promise.all([
        cid ? (supabase as any).from('bookings').select('*').eq('customer_id', cid).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        cid ? (supabase as any).from('hotel_bookings').select('*').eq('customer_id', cid).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
        cid ? (supabase as any).from('flight_bookings').select('*').eq('customer_id', cid).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
        cid ? (supabase as any).from('invoices').select('id, invoice_number, final_amount, total_paid_amount, currency, status, payment_status, issued_date').eq('customer_id', cid).order('issued_date', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        cid ? (supabase as any).from('whatsapp_conversations').select('id, status, last_message_at, created_at').eq('customer_id', cid).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
      ]);

      const bookings = bookingsRes.data || [];
      const hotelBookings = hotelsRes.data || [];
      const flightBookings = flightsRes.data || [];
      const payments = invoicesRes.data || [];
      const conversations = convsRes.data || [];

      const totalSpent = payments.reduce((sum: number, p: any) => sum + Number(p.total_paid_amount || 0), 0);


      const totalBookings = bookings.length + hotelBookings.length + flightBookings.length;
      const lastBookingDate =
        [...bookings, ...hotelBookings, ...flightBookings]
          .map((b: any) => b.created_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

      const created = customer?.created_at ? new Date(customer.created_at) : null;
      const lifetimeMonths = created
        ? Math.max(1, Math.round((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 0;

      // Customer Score (0-100)
      let score = 0;
      score += Math.min(30, totalBookings * 6);           // up to 30 for bookings
      score += Math.min(40, totalSpent / 500);            // up to 40 for spending
      score += Math.min(15, conversations.length * 3);     // engagement
      if (lastBookingDate) {
        const daysSince = (Date.now() - new Date(lastBookingDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) score += 15;
        else if (daysSince < 90) score += 10;
        else if (daysSince < 180) score += 5;
      }
      score = Math.min(100, Math.round(score));

      return {
        customer,
        bookings,
        hotelBookings,
        flightBookings,
        payments,
        conversations,
        stats: {
          totalBookings,
          totalSpent,
          lastBookingDate,
          lifetimeMonths,
          conversationsCount: conversations.length,
          customerScore: score,
        },
      };
    },
  });
};
