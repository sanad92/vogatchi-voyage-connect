
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWhatsApp = () => {
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

      if (error) {
        console.error('خطأ في جلب محادثات WhatsApp:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  return {
    conversations,
    conversationsLoading,
    conversationsError
  };
};
