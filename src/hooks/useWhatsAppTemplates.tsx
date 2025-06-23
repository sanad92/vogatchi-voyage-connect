
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWhatsAppTemplates = () => {
  const queryClient = useQueryClient();

  const { 
    data: templates, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب قوالب WhatsApp:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 60000 // 1 minute
  });

  return {
    templates,
    isLoading,
    error
  };
};
