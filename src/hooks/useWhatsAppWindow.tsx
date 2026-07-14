import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface CustomerRefContext {
  customer_name?: string | null;
  customer_phone?: string | null;
  booking_reference?: string | null;
  booking_destination?: string | null;
  booking_check_in?: string | null;
  booking_check_out?: string | null;
  invoice_number?: string | null;
  invoice_total?: string | null;
  invoice_currency?: string | null;
}

export interface WhatsAppWindowState {
  isWindowOpen: boolean;
  lastInboundAt: Date | null;
  expiresAt: Date | null;
  minutesRemaining: number;
  hoursRemaining: number;
  isLoading: boolean;
  contextVars: CustomerRefContext;
}

/**
 * Detects Meta's 24-hour customer-service window for a WhatsApp conversation.
 * Also fetches customer/booking/invoice context to prefill template variables.
 */
export const useWhatsAppWindow = (conversationId?: string | null): WhatsAppWindowState => {
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0);

  // 60-second tick so time-remaining updates
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const lastInboundQuery = useQuery({
    queryKey: ['wa-window', 'last-inbound', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await (supabase as any)
        .from('whatsapp_messages')
        .select('sent_at')
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data?.sent_at ? new Date(data.sent_at) : null;
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  });

  const contextQuery = useQuery({
    queryKey: ['wa-window', 'context', conversationId],
    queryFn: async (): Promise<CustomerRefContext> => {
      if (!conversationId) return {};
      const { data: conv } = await (supabase as any)
        .from('whatsapp_conversations')
        .select('phone_number, customer_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) return {};

      const ctx: CustomerRefContext = { customer_phone: conv.phone_number };

      if (conv.customer_id) {
        const { data: customer } = await (supabase as any)
          .from('customers')
          .select('name, phone')
          .eq('id', conv.customer_id)
          .maybeSingle();
        if (customer) {
          ctx.customer_name = customer.name;
          ctx.customer_phone = customer.phone || ctx.customer_phone;
        }

        const { data: booking } = await (supabase as any)
          .from('bookings')
          .select('booking_reference, destination, check_in_date, check_out_date, travel_date')
          .eq('customer_id', conv.customer_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (booking) {
          ctx.booking_reference = booking.booking_reference;
          ctx.booking_destination = booking.destination;
          ctx.booking_check_in = booking.check_in_date || booking.travel_date;
          ctx.booking_check_out = booking.check_out_date;
        }

        const { data: invoice } = await (supabase as any)
          .from('invoices')
          .select('invoice_number, total_amount, currency')
          .eq('customer_id', conv.customer_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (invoice) {
          ctx.invoice_number = invoice.invoice_number;
          ctx.invoice_total = invoice.total_amount != null ? String(invoice.total_amount) : null;
          ctx.invoice_currency = invoice.currency;
        }
      }

      return ctx;
    },
    enabled: !!conversationId,
    staleTime: 5 * 60_000,
  });

  // Realtime: flip badge instantly when a new inbound arrives
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`wa-window-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          if (payload?.new?.direction === 'inbound') {
            queryClient.invalidateQueries({ queryKey: ['wa-window', 'last-inbound', conversationId] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useMemo<WhatsAppWindowState>(() => {
    const lastInboundAt = lastInboundQuery.data ?? null;
    const expiresAt = lastInboundAt ? new Date(lastInboundAt.getTime() + WINDOW_MS) : null;
    const now = Date.now();
    const remainingMs = expiresAt ? expiresAt.getTime() - now : 0;
    const isWindowOpen = remainingMs > 0;
    const minutesRemaining = Math.max(0, Math.floor(remainingMs / 60_000));
    const hoursRemaining = Math.max(0, Math.floor(remainingMs / 3_600_000));
    return {
      isWindowOpen,
      lastInboundAt,
      expiresAt,
      minutesRemaining,
      hoursRemaining,
      isLoading: lastInboundQuery.isLoading,
      contextVars: contextQuery.data || {},
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInboundQuery.data, lastInboundQuery.isLoading, contextQuery.data, tick]);
};
