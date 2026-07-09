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
      const [quotesRes, hotelsRes, flightsRes, followupsRes] = await Promise.all([
        (supabase as any).from('quotes')
          .select('id, quote_number, status, total_amount, currency, created_at, valid_until')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        (supabase as any).from('hotel_bookings')
          .select('id, hotel_name, check_in_date, check_out_date, status, total_amount, currency')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        (supabase as any).from('flight_bookings')
          .select('id, departure_airport, arrival_airport, departure_date, status, total_amount, currency')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }).limit(10),
        (supabase as any).from('customer_follow_ups')
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

  // Search customers by name/phone/email
  const searchCustomers = async (q: string) => {
    if (!q.trim() || !orgId) return [];
    const like = `%${q.trim()}%`;
    const { data } = await (supabase as any)
      .from('customers')
      .select('id, name, full_name, phone, email')
      .eq('organization_id', orgId)
      .or(`name.ilike.${like},full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(10);
    return data || [];
  };

  // Link conversation → existing customer
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

  // Create new customer from conversation + link
  const createAndLinkCustomer = useMutation({
    mutationFn: async ({ name, phone, email }: { name: string; phone: string; email?: string }) => {
      const { data, error } = await (supabase as any)
        .from('customers')
        .insert({
          organization_id: orgId,
          name,
          full_name: name,
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
