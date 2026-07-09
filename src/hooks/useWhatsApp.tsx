
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

export const useWhatsApp = () => {
  const orgId = useOrgId();

  const {
    data: conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useQuery({
    queryKey: ['whatsapp-conversations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(name, email),
          assigned_employee:employees(full_name, employee_code)
        `)
        .eq('organization_id', orgId as string)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب محادثات WhatsApp:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  return { conversations, conversationsLoading, conversationsError };
};
