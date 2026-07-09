import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const mediaTypeFromMime = (mime: string): 'image' | 'audio' | 'video' | 'document' => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
};

export const useWhatsAppMessaging = () => {
  const queryClient = useQueryClient();

  const invalidate = (conversationId: string) => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    queryClient.invalidateQueries({ queryKey: ['customer-whatsapp'] });
  };

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
    onSuccess: (_d, vars) => {
      invalidate(vars.conversationId);
      toast.success('تم إرسال الرسالة');
    },
    onError: (error: any) => {
      console.error('WhatsApp send error:', error);
      toast.error(error?.message || 'فشل إرسال الرسالة عبر WhatsApp');
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: async (data: { conversationId: string; file: File; caption?: string }) => {
      // Resolve conversation organization for storage path
      const { data: conv, error: convErr } = await supabase
        .from('whatsapp_conversations')
        .select('id, organization_id')
        .eq('id', data.conversationId)
        .single();
      if (convErr || !conv) throw new Error('لم يتم العثور على المحادثة');

      const ext = data.file.name.includes('.') ? data.file.name.split('.').pop() : 'bin';
      const path = `${conv.organization_id}/${conv.id}/outbound-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('whatsapp-media')
        .upload(path, data.file, { contentType: data.file.type, upsert: false });
      if (upErr) throw upErr;

      const mime = data.file.type || 'application/octet-stream';
      const { data: result, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          conversationId: data.conversationId,
          messageType: mediaTypeFromMime(mime),
          mediaStoragePath: path,
          mediaMimeType: mime,
          mediaFileName: data.file.name,
          mediaCaption: data.caption || null,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.conversationId);
      toast.success('تم إرسال الملف');
    },
    onError: (error: any) => {
      console.error('WhatsApp media send error:', error);
      toast.error(error?.message || 'فشل إرسال الملف');
    },
  });

  return {
    sendTextMessage: (conversationId: string, content: string) =>
      sendTextMessageMutation.mutateAsync({ conversationId, content }),
    sendMedia: (conversationId: string, file: File, caption?: string) =>
      sendMediaMutation.mutateAsync({ conversationId, file, caption }),
    isSending: sendTextMessageMutation.isPending || sendMediaMutation.isPending,
  };
};
