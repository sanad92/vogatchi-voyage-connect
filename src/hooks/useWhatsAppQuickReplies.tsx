
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickReplyData {
  id?: string;
  title: string;
  content: string;
  category?: string;
  is_global?: boolean;
}

export const useWhatsAppQuickReplies = () => {
  const queryClient = useQueryClient();

  // جلب جميع الردود السريعة
  const { 
    data: quickReplies, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('quick_replies' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('خطأ في جلب الردود السريعة:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 30000 // 30 seconds
  });

  // إنشاء رد سريع جديد
  const createQuickReplyMutation = useMutation({
    mutationFn: async (replyData: QuickReplyData) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('يجب تسجيل الدخول أولاً');

      const { data, error } = await (supabase
        .from('quick_replies' as any)
        .insert([{
          ...replyData,
          created_by: authData.user.id,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single() as any);

      if (error) {
        console.error('خطأ في إنشاء رد سريع:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
    },
    onError: (error) => {
      console.error('خطأ في إنشاء الرد السريع:', error);
      toast.error('فشل في إنشاء الرد السريع');
    }
  });

  // تحديث رد سريع
  const updateQuickReplyMutation = useMutation({
    mutationFn: async (replyData: QuickReplyData & { id: string }) => {
      const { id, ...updateData } = replyData;
      
      const { data, error } = await (supabase
        .from('quick_replies' as any)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single() as any);

      if (error) {
        console.error('خطأ في تحديث رد سريع:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
    },
    onError: (error) => {
      console.error('خطأ في تحديث الرد السريع:', error);
      toast.error('فشل في تحديث الرد السريع');
    }
  });

  // حذف رد سريع
  const deleteQuickReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await (supabase
        .from('quick_replies' as any)
        .delete()
        .eq('id', replyId) as any);

      if (error) {
        console.error('خطأ في حذف رد سريع:', error);
        throw error;
      }

      return replyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-quick-replies'] });
    },
    onError: (error) => {
      console.error('خطأ في حذف الرد السريع:', error);
      toast.error('فشل في حذف الرد السريع');
    }
  });

  return {
    quickReplies,
    isLoading,
    error,
    createQuickReply: createQuickReplyMutation.mutate,
    updateQuickReply: updateQuickReplyMutation.mutate,
    deleteQuickReply: deleteQuickReplyMutation.mutate,
    isCreating: createQuickReplyMutation.isPending,
    isUpdating: updateQuickReplyMutation.isPending,
    isDeleting: deleteQuickReplyMutation.isPending
  };
};
