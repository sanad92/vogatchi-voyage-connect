
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateData {
  id?: string;
  name: string;
  category: string;
  language: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
}

export const useWhatsAppTemplates = () => {
  const queryClient = useQueryClient();

  // جلب جميع القوالب
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
    staleTime: 30000 // 30 seconds
  });

  // إنشاء قالب جديد
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateData) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert([{
          ...templateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء قالب WhatsApp:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (error) => {
      console.error('خطأ في إنشاء القالب:', error);
      toast.error('فشل في إنشاء القالب');
    }
  });

  // تحديث قالب
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateData & { id: string }) => {
      const { id, ...updateData } = templateData;
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('خطأ في تحديث قالب WhatsApp:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (error) => {
      console.error('خطأ في تحديث القالب:', error);
      toast.error('فشل في تحديث القالب');
    }
  });

  // حذف قالب
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('خطأ في حذف قالب WhatsApp:', error);
        throw error;
      }

      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
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
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending
  };
};
