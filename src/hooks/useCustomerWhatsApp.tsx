import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';

/**
 * Normalize phone for WhatsApp matching:
 * - strips non-digits
 * - WhatsApp Cloud API stores numbers without leading '+'
 */
const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
};

/**
 * Resolves (or auto-creates) the WhatsApp conversation linked to a CRM customer
 * and provides realtime-aware messages for the in-CRM chat panel.
 */
export const useCustomerWhatsApp = (customerId: string, customerPhone?: string | null) => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const phone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);

  // 1. Resolve conversation: by customer_id first, fallback to phone match (auto-link)
  const conversationQuery = useQuery({
    queryKey: ['customer-whatsapp', 'conversation', customerId, phone],
    queryFn: async () => {
      if (!customerId) return null;

      // Try: existing conversation linked to this customer
      const { data: linked } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('customer_id', customerId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (linked) return linked;

      if (!phone) return null;

      // Try: existing conversation by phone (link it to this customer)
      const { data: byPhone } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('phone_number', phone)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byPhone) {
        if (!byPhone.customer_id) {
          await supabase
            .from('whatsapp_conversations')
            .update({ customer_id: customerId })
            .eq('id', byPhone.id);
        }
        return { ...byPhone, customer_id: customerId };
      }

      return null;
    },
    enabled: !!customerId,
    staleTime: 30_000,
  });

  const conversationId = conversationQuery.data?.id;

  // 2. Messages for the resolved conversation
  const messagesQuery = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  // 3. Realtime: refetch messages on insert/update for this conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`wa-customer-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // 4. Create a fresh conversation if customer has phone but no conversation yet
  const createConversation = async () => {
    if (!phone) throw new Error('لا يوجد رقم هاتف صالح للعميل');
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .insert({
        phone_number: phone,
        customer_id: customerId,
        organization_id: orgId,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['customer-whatsapp', 'conversation', customerId, phone] });
    return data;
  };

  return {
    conversation: conversationQuery.data,
    conversationId,
    messages: messagesQuery.data || [],
    isLoading: conversationQuery.isLoading || messagesQuery.isLoading,
    hasPhone: !!phone,
    createConversation,
    refetch: () => {
      conversationQuery.refetch();
      messagesQuery.refetch();
    },
  };
};
