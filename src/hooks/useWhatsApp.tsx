
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export const useWhatsApp = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useQuery({
    queryKey: ['whatsapp-conversations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(name, email),
          assigned_employee:employees(full_name, employee_code)
        `)
        .eq('organization_id', orgId as string)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب محادثات WhatsApp:', error);
        throw error;
      }

      const conversations = data || [];
      if (conversations.length === 0) return conversations;

      // Enrich with last inbound (sync) timestamp per conversation
      const ids = conversations.map((c: any) => c.id);
      const { data: inboundRows } = await supabase
        .from('whatsapp_messages')
        .select('conversation_id, sent_at')
        .in('conversation_id', ids)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false });

      const lastInboundMap = new Map<string, string>();
      (inboundRows || []).forEach((r: any) => {
        if (!lastInboundMap.has(r.conversation_id)) {
          lastInboundMap.set(r.conversation_id, r.sent_at);
        }
      });

      return conversations.map((c: any) => ({
        ...c,
        last_inbound_at: lastInboundMap.get(c.id) || null,
      }));
    },
    enabled: !!orgId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  // Realtime — new conversations and new messages both refresh the list
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`whatsapp_conversations:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', orgId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return { conversations, conversationsLoading, conversationsError };
};
