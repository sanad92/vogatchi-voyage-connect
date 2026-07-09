import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export const useConversationCRM = (conversationId: string, customerId?: string | null) => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const linked = useQuery({
    queryKey: ['conversation-crm', orgId, customerId],
    enabled: !!orgId && !!customerId,
    queryFn: async () => {
      const s = supabase as any;
      const [quotesRes, hotelsRes, flightsRes, followupsRes] = await Promise.all([
        s.from('quotes')
          .select('id, quote_number, status, total_amount, created_at, valid_until')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        s.from('hotel_bookings')
          .select('id, hotel_name, check_in_date, check_out_date, total_cost_customer, currency, status:booking_statuses(name)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        s.from('flight_bookings')
          .select('id, departure_date, total_cost, currency, status:booking_statuses(name), departure_airport:airports!flight_bookings_departure_airport_id_fkey(iata_code, city), arrival_airport:airports!flight_bookings_arrival_airport_id_fkey(iata_code, city)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        s.from('customer_follow_ups')
          .select('id, follow_up_type, status, scheduled_date, notes')
          .eq('customer_id', customerId)
          .order('scheduled_date', { ascending: false }).limit(10),
      ]);
      return {
        quotes: quotesRes.data || [],
        hotelBookings: hotelsRes.data || [],
        flightBookings: flightsRes.data || [],
        followUps: followupsRes.data || [],
      };
    },
  });

  const searchCustomers = async (q: string) => {
    if (!q.trim() || !orgId) return [];
    const like = `%${q.trim()}%`;
    const { data } = await (supabase as any)
      .from('customers')
      .select('id, name, phone, email')
      .eq('organization_id', orgId)
      .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(10);
    return data || [];
  };

  const linkCustomer = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await (supabase as any)
        .from('whatsapp_conversations')
        .update({ customer_id: cid })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم ربط العميل بالمحادثة');
      qc.invalidateQueries({ queryKey: ['whatsapp-conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      qc.invalidateQueries({ queryKey: ['customer-360'] });
    },
    onError: (e: any) => toast.error(e.message || 'فشل الربط'),
  });

  const createAndLinkCustomer = useMutation({
    mutationFn: async ({ name, phone, email }: { name: string; phone: string; email?: string }) => {
      const { data, error } = await (supabase as any)
        .from('customers')
        .insert({
          organization_id: orgId,
          name,
          phone,
          email: email || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const { error: uErr } = await (supabase as any)
        .from('whatsapp_conversations')
        .update({ customer_id: data.id })
        .eq('id', conversationId);
      if (uErr) throw uErr;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success('تم إنشاء العميل وربطه بالمحادثة');
      qc.invalidateQueries({ queryKey: ['whatsapp-conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      qc.invalidateQueries({ queryKey: ['customer-360'] });
    },
    onError: (e: any) => toast.error(e.message || 'فشل إنشاء العميل'),
  });

  return { ...linked, searchCustomers, linkCustomer, createAndLinkCustomer };
};
