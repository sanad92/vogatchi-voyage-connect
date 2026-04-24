import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Source of truth for sending WhatsApp messages.
 * Calls the `send-whatsapp-message` edge function which:
 *  - Sends the message to Meta's WhatsApp Cloud API
 *  - Persists the outbound message in `whatsapp_messages`
 *  - Updates the conversation's last_message_at
 */
export const useWhatsAppMessaging = () => {
  const queryClient = useQueryClient();

  const sendTextMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const { data: result, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          conversationId: data.conversationId,
          messageType: 'text',
          content: data.content,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-whatsapp'] });
      toast.success('تم إرسال الرسالة');
    },
    onError: (error: any) => {
      console.error('WhatsApp send error:', error);
      toast.error(error?.message || 'فشل إرسال الرسالة عبر WhatsApp');
    },
  });

  return {
    sendTextMessage: (conversationId: string, content: string) =>
      sendTextMessageMutation.mutateAsync({ conversationId, content }),
    isSending: sendTextMessageMutation.isPending,
  };
};
