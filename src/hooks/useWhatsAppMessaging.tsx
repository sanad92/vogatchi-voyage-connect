
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWhatsAppMessaging = () => {
  const queryClient = useQueryClient();

  const sendTextMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const { data: messageData, error } = await supabase
        .from('whatsapp_messages')
        .insert([{
          conversation_id: data.conversationId,
          direction: 'outbound',
          message_type: 'text',
          content: data.content,
          sent_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'sent'
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        throw error;
      }

      // Update conversation last message time
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', data.conversationId);

      return messageData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast.success('تم إرسال الرسالة بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة');
    }
  });

  return {
    sendTextMessage: (conversationId: string, content: string) => 
      sendTextMessageMutation.mutate({ conversationId, content }),
    isSending: sendTextMessageMutation.isPending
  };
};
