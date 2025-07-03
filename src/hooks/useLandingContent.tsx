import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LandingContent {
  id: string;
  section: string;
  title: string;
  content: string;
  image_url?: string;
  is_active: boolean;
  order_index: number;
  background_image_url?: string;
  icon_name?: string;
  button_text?: string;
  button_link?: string;
  badge_text?: string;
  subtitle?: string;
  section_type: string;
  layout_config: Record<string, any>;
  style_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  is_active?: boolean;
}

export const useLandingContent = () => {
  const queryClient = useQueryClient();

  // جلب محتوى صفحة الهبوط
  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['landing-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_content')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('خطأ في جلب محتوى الصفحة:', error);
        throw error;
      }
      
      return data as LandingContent[];
    }
  });

  // جلب إعدادات الموقع
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      
      if (error) {
        console.error('خطأ في جلب إعدادات الموقع:', error);
        throw error;
      }
      
      return data as SiteSetting[];
    }
  });

  // تحديث المحتوى
  const updateContentMutation = useMutation({
    mutationFn: async (updatedContent: any) => {
      const { error } = await supabase
        .from('landing_content')
        .update(updatedContent)
        .eq('id', updatedContent.id);
      
      if (error) throw error;
      return updatedContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('تم تحديث المحتوى بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في تحديث المحتوى:', error);
      toast.error('حدث خطأ في تحديث المحتوى');
    }
  });

  // إضافة محتوى جديد
  const addContentMutation = useMutation({
    mutationFn: async (newContent: any) => {
      const { data, error } = await supabase
        .from('landing_content')
        .insert(newContent)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('تم إضافة المحتوى بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في إضافة المحتوى:', error);
      toast.error('حدث خطأ في إضافة المحتوى');
    }
  });

  // حذف المحتوى
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const { error } = await supabase
        .from('landing_content')
        .delete()
        .eq('id', contentId);
      
      if (error) throw error;
      return contentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-content'] });
      toast.success('تم حذف المحتوى بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في حذف المحتوى:', error);
      toast.error('حدث خطأ في حذف المحتوى');
    }
  });

  // تحديث إعدادات الموقع
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      
      if (error) throw error;
      return { key, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast.success('تم تحديث الإعدادات بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في تحديث الإعدادات:', error);
      toast.error('حدث خطأ في تحديث الإعدادات');
    }
  });

  // دالة مساعدة للحصول على قيمة إعداد معين
  const getSetting = (key: string) => {
    return settings?.find(s => s.setting_key === key)?.setting_value || '';
  };

  // دالة مساعدة للحصول على محتوى قسم معين
  const getContentBySection = (section: string) => {
    return content?.filter(c => c.section === section) || [];
  };

  return {
    // البيانات
    content,
    settings,
    
    // حالات التحميل
    isLoading: contentLoading || settingsLoading,
    contentLoading,
    settingsLoading,
    
    // العمليات
    updateContent: updateContentMutation.mutate,
    addContent: addContentMutation.mutate,
    deleteContent: deleteContentMutation.mutate,
    updateSetting: updateSettingMutation.mutate,
    
    // حالات العمليات
    isUpdating: updateContentMutation.isPending,
    isAdding: addContentMutation.isPending,
    isDeleting: deleteContentMutation.isPending,
    isUpdatingSetting: updateSettingMutation.isPending,
    
    // دوال مساعدة
    getSetting,
    getContentBySection,
  };
};