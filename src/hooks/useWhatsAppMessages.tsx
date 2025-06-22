
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      return data || [];
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
