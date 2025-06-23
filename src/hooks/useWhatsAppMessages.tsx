
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppMessage } from '@/types/whatsapp';

export const useWhatsAppMessages = (conversationId?: string) => {
  const { 
    data: messages, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          sender:profiles!sent_by(full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('خطأ في جلب رسائل WhatsApp:', error);
        throw error;
      }

      // تحويل البيانات للتأكد من مطابقة الأنواع
      const typedMessages: WhatsAppMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        message_id: msg.message_id,
        direction: msg.direction as 'inbound' | 'outbound',
        message_type: msg.message_type as 'text' | 'image' | 'document' | 'audio' | 'video' | 'template',
        content: msg.content,
        media_url: msg.media_url,
        media_mime_type: msg.media_mime_type,
        template_name: msg.template_name,
        template_language: msg.template_language,
        template_parameters: msg.template_parameters,
        status: msg.status as 'sent' | 'delivered' | 'read' | 'failed',
        error_code: msg.error_code,
        error_message: msg.error_message,
        sent_by: msg.sent_by,
        sent_at: msg.sent_at,
        delivered_at: msg.delivered_at,
        read_at: msg.read_at,
        created_at: msg.created_at,
        sender: msg.sender
      }));

      return typedMessages;
    },
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 5000 // Refresh every 5 seconds for real-time feel
  });

  return {
    messages,
    isLoading,
    error
  };
};
