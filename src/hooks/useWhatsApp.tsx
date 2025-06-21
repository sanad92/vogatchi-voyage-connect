
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WhatsAppConversation, WhatsAppMessage, QuickReply } from '@/types/whatsapp';
import { handleError, withRetry } from '@/utils/errorHandling';

export const useWhatsApp = () => {
  const queryClient = useQueryClient();

  // جلب المحادثات مع معالجة محسنة للأخطاء
  const { 
    data: conversations, 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      return withRetry(async () => {
        const { data, error } = await supabase
          .from('whatsapp_conversations')
          .select(`
            *,
            customer:customers(name, phone),
            assigned_employee:employees(full_name),
            last_message:whatsapp_messages(content, sent_at, direction)
          `)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('خطأ في جلب محادثات الواتس اب:', error);
          throw error;
        }

        return data || [];
      });
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      handleError(error, 'useWhatsApp - conversations');
    }
  });

  // جلب الردود السريعة
  const { 
    data: quickReplies, 
    isLoading: quickRepliesLoading,
    error: quickRepliesError 
  } = useQuery({
    queryKey: ['whatsapp-quick-replies'],
    queryFn: async () => {
      return withRetry(async () => {
        const { data, error } = await supabase
          .from('whatsapp_quick_replies')
          .select('*')
          .eq('is_active', true)
          .order('usage_count', { ascending: false });

        if (error) {
          console.error('خطأ في جلب الردود السريعة:', error);
          throw error;
        }

        return data || [];
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      handleError(error, 'useWhatsApp - quick replies');
    }
  });

  // إرسال رسالة
  const sendMessage = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      employeeId 
    }: { 
      conversationId: string; 
      content: string; 
      employeeId: string;
    }) => {
      if (!content.trim()) {
        throw new Error('محتوى الرسالة مطلوب');
      }

      if (content.length > 4096) {
        throw new Error('الرسالة طويلة جداً (الحد الأقصى 4096 حرف)');
      }

      const messageData = {
        conversation_id: conversationId,
        content: content.trim(),
        direction: 'outbound' as const,
        sender_id: employeeId,
        sent_at: new Date().toISOString(),
        status: 'sent' as const
      };

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        throw error;
      }

      // تحديث آخر نشاط في المحادثة
      await supabase
        .from('whatsapp_conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('تم إرسال الرسالة بنجاح');
      
      // تحديث cache المحادثات
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-messages', variables.conversationId] 
      });
    },
    onError: (error) => {
      console.error('خطأ في إرسال الرسالة:', error);
      toast.error('فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى.');
      handleError(error, 'useWhatsApp - send message');
    }
  });

  // جلب رسائل محادثة معينة
  const getConversationMessages = (conversationId: string) => {
    return useQuery({
      queryKey: ['whatsapp-messages', conversationId],
      queryFn: async () => {
        if (!conversationId) {
          throw new Error('معرف المحادثة مطلوب');
        }

        return withRetry(async () => {
          const { data, error } = await supabase
            .from('whatsapp_messages')
            .select(`
              *,
              sender:employees(full_name)
            `)
            .eq('conversation_id', conversationId)
            .order('sent_at', { ascending: true });

          if (error) {
            console.error('خطأ في جلب رسائل المحادثة:', error);
            throw error;
          }

          return data || [];
        });
      },
      enabled: !!conversationId,
      staleTime: 10000, // 10 seconds
      onError: (error) => {
        handleError(error, 'useWhatsApp - conversation messages');
      }
    });
  };

  // إدارة جلسة الموظف
  const getEmployeeSession = (employeeId: string) => {
    return useQuery({
      queryKey: ['whatsapp-session', employeeId],
      queryFn: async () => {
        if (!employeeId) {
          throw new Error('معرف الموظف مطلوب');
        }

        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('employee_id', employeeId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('خطأ في جلب جلسة الموظف:', error);
          throw error;
        }

        return data;
      },
      enabled: !!employeeId,
      staleTime: 30000,
      onError: (error) => {
        handleError(error, 'useWhatsApp - employee session');
      }
    });
  };

  // تحديث حالة جلسة الموظف
  const updateSession = useMutation({
    mutationFn: async ({ employeeId, status }: { employeeId: string; status: string }) => {
      if (!employeeId || !status) {
        throw new Error('معرف الموظف والحالة مطلوبان');
      }

      const validStatuses = ['online', 'busy', 'away', 'offline'];
      if (!validStatuses.includes(status)) {
        throw new Error('حالة غير صحيحة');
      }

      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          employee_id: employeeId,
          status,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('خطأ في تحديث جلسة الموظف:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-session', variables.employeeId] 
      });
    },
    onError: (error) => {
      handleError(error, 'useWhatsApp - update session');
    }
  });

  return {
    // البيانات
    conversations: conversations || [],
    quickReplies: quickReplies || [],
    
    // حالات التحميل
    conversationsLoading,
    quickRepliesLoading,
    
    // الأخطاء
    conversationsError,
    quickRepliesError,
    
    // العمليات
    sendMessage: sendMessage.mutate,
    isSendingMessage: sendMessage.isPending,
    
    // الوظائف المساعدة
    getConversationMessages,
    getEmployeeSession,
    updateSession: updateSession.mutate,
    
    // إعادة التحميل
    refetchConversations
  };
};
