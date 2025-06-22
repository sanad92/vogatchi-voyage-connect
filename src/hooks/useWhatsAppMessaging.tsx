
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendMessageParams {
  conversationId: string;
  messageType: 'text' | 'image' | 'document' | 'template';
  content?: string;
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: string[];
}

export const useWhatsAppMessaging = () => {
  const queryClient = useQueryClient();

  // إرسال رسالة
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      // جلب معرف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          ...params,
          sentBy: user.id
        }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // تحديث قائمة الرسائل
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-messages', variables.conversationId] 
      });
      
      // تحديث قائمة المحادثات
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations'] 
      });

      toast.success('تم إرسال الرسالة بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة: ' + (error.message || 'خطأ غير محدد'));
    }
  });

  // إرسال رسالة نصية سريعة
  const sendTextMessage = (conversationId: string, content: string) => {
    return sendMessageMutation.mutateAsync({
      conversationId,
      messageType: 'text',
      content: content.trim()
    });
  };

  // إرسال رسالة من قالب
  const sendTemplateMessage = (
    conversationId: string, 
    templateName: string, 
    templateLanguage: string = 'ar',
    parameters?: string[]
  ) => {
    return sendMessageMutation.mutateAsync({
      conversationId,
      messageType: 'template',
      templateName,
      templateLanguage,
      templateParameters: parameters
    });
  };

  // إرسال رسالة وسائط
  const sendMediaMessage = (
    conversationId: string,
    messageType: 'image' | 'document',
    mediaUrl: string
  ) => {
    return sendMessageMutation.mutateAsync({
      conversationId,
      messageType,
      mediaUrl
    });
  };

  return {
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    sendTextMessage,
    sendTemplateMessage,
    sendMediaMessage,
    isSending: sendMessageMutation.isPending,
    error: sendMessageMutation.error
  };
};
