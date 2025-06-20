
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppConversation, WhatsAppMessage, QuickReply, WhatsAppSession } from '@/types/whatsapp';
import { toast } from 'sonner';

export const useWhatsApp = () => {
  const queryClient = useQueryClient();

  // Get conversations
  const {
    data: conversations,
    isLoading: conversationsLoading,
    error: conversationsError
  } = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(name, email),
          assigned_employee:employees(full_name, employee_code)
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppConversation[];
    }
  });

  // Get messages for a conversation
  const getConversationMessages = (conversationId: string) => {
    return useQuery({
      queryKey: ['whatsapp-messages', conversationId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select(`
            *,
            sender:employees(full_name)
          `)
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: true });

        if (error) throw error;
        return data as WhatsAppMessage[];
      },
      enabled: !!conversationId
    });
  };

  // Get quick replies
  const {
    data: quickReplies,
    isLoading: quickRepliesLoading
  } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as QuickReply[];
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      conversationId: string;
      messageType: string;
      content?: string;
      mediaUrl?: string;
      templateName?: string;
      templateLanguage?: string;
      templateParameters?: any;
      sentBy: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: messageData
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('تم إرسال الرسالة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: any) => {
      toast.error(`خطأ في إرسال الرسالة: ${error.message}`);
    }
  });

  // Update conversation status
  const updateConversationMutation = useMutation({
    mutationFn: async ({ conversationId, updates }: { conversationId: string; updates: Partial<WhatsAppConversation> }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم تحديث المحادثة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: any) => {
      toast.error(`خطأ في تحديث المحادثة: ${error.message}`);
    }
  });

  // Get employee session
  const getEmployeeSession = (employeeId: string) => {
    return useQuery({
      queryKey: ['whatsapp-session', employeeId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('employee_id', employeeId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data as WhatsAppSession | null;
      },
      enabled: !!employeeId
    });
  };

  // Update session status
  const updateSessionMutation = useMutation({
    mutationFn: async ({ employeeId, status }: { employeeId: string; status: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          employee_id: employeeId,
          status,
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-session'] });
    }
  });

  // Set up real-time subscriptions
  useEffect(() => {
    const conversationsChannel = supabase
      .channel('whatsapp-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('whatsapp-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [queryClient]);

  return {
    conversations,
    conversationsLoading,
    conversationsError,
    getConversationMessages,
    quickReplies,
    quickRepliesLoading,
    sendMessage: sendMessageMutation.mutate,
    sendMessageLoading: sendMessageMutation.isPending,
    updateConversation: updateConversationMutation.mutate,
    getEmployeeSession,
    updateSession: updateSessionMutation.mutate
  };
};
