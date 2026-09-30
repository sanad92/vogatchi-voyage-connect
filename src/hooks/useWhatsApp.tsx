
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
    refetch,
  } = useQuery({
    queryKey: ['whatsapp-conversations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          assigned_employee:employees(full_name, employee_code),
          inbox:whatsapp_settings(id, label, business_name, display_phone_number)
        `)
        .eq('organization_id', orgId as string)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب محادثات WhatsApp:', error);
        throw error;
      }

      const conversations = data || [];
      if (conversations.length === 0) return conversations;

      // Enrich with the last inbound timestamp and newest message, computed server-side
      // (a plain message query is capped at 1000 rows and silently dropped queue entries).
      const { data: summaries, error: sumError } = await (supabase as any)
        .rpc('wa_conversation_summaries', { _org: orgId });
      if (sumError) throw sumError;

      const byId = new Map<string, any>();
      (summaries || []).forEach((r: any) => byId.set(r.conversation_id, r));

      return conversations.map((c: any) => {
        const s = byId.get(c.id);
        return {
          ...c,
          last_inbound_at: s?.last_inbound_at || null,
          last_message: s?.sent_at ? s : null,
          unread_count: s?.unread_count ?? 0,
        };
      });

    },
    enabled: !!orgId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  // Realtime — new conversations and new messages both refresh the list
  useEffect(() => {
    if (!orgId) return;
    // Campaigns insert many messages per second; coalesce refreshes to one every 3s.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', orgId] });
      }, 3000);
    };
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
        refresh
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `organization_id=eq.${orgId}`,
        },
        refresh
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return { conversations, conversationsLoading, conversationsError, refetch };
};
