
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { WhatsAppMessage } from '@/types/whatsapp';

export const useWhatsAppMessages = (conversationId?: string) => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['whatsapp-messages', orgId, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      // Note: no `sender:profiles!sent_by(...)` embed — there is no FK from
      // whatsapp_messages.sent_by to profiles, so PostgREST rejects the embed
      // and the whole query fails (shows "لا توجد رسائل").
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('خطأ في جلب رسائل WhatsApp:', error);
        throw error;
      }

      const typedMessages: WhatsAppMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        message_id: msg.message_id,
        direction: msg.direction,
        message_type: msg.message_type,
        content: msg.content,
        media_url: msg.media_url,
        media_storage_path: msg.media_storage_path,
        media_mime_type: msg.media_mime_type,
        media_file_name: msg.media_file_name,
        media_caption: msg.media_caption,
        media_duration_seconds: msg.media_duration_seconds,
        media_provider_id: msg.media_provider_id,
        media_download_status: msg.media_download_status,
        media_download_error: msg.media_download_error,
        media_download_attempts: msg.media_download_attempts,
        media_last_attempt_at: msg.media_last_attempt_at,
        template_name: msg.template_name,
        template_language: msg.template_language,
        template_parameters: msg.template_parameters,
        status: msg.status,
        error_code: msg.error_code,
        error_message: msg.error_message,
        sent_by: msg.sent_by,
        sent_at: msg.sent_at,
        delivered_at: msg.delivered_at,
        read_at: msg.read_at,
        created_at: msg.created_at,
      }));

      return typedMessages;
    },
    enabled: !!conversationId && !!orgId,
    staleTime: 10_000,
    refetchInterval: 5_000,
  });

  // Realtime subscription — refresh instantly on new/updated messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`whatsapp_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['whatsapp-messages', orgId, conversationId],
          });
          queryClient.invalidateQueries({
            queryKey: ['whatsapp-conversations', orgId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, orgId, queryClient]);

  return { messages, isLoading, error };
};
