
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

  const createTemplate = useMutation({
    mutationFn: async (templateData: any) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم إنشاء القالب بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في إنشاء القالب:', error);
      toast.error('فشل في إنشاء القالب');
    }
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updateData }: any) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم تحديث القالب بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في تحديث القالب:', error);
      toast.error('فشل في تحديث القالب');
    }
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('تم حذف القالب بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في حذف القالب:', error);
      toast.error('فشل في حذف القالب');
    }
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending
  };
};
