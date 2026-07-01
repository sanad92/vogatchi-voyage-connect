
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppSettingsData {
  id?: string;
  business_name: string;
  phone_number_id: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url?: string;
  is_active?: boolean;
  api_version?: string;
  rate_limit_per_minute?: number;
  auto_assignment_enabled?: boolean;
  business_description?: string;
  business_website?: string;
  business_email?: string;
}

interface TestConnectionParams {
  phone_number_id: string;
  access_token: string;
}

interface TestConnectionResult {
  success: boolean;
  error?: string;
  data?: any;
}

export const useWhatsAppSettings = () => {
  const queryClient = useQueryClient();

  // جلب الإعدادات الحالية
  const { 
    data: settings, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: async () => {
      // Note: access_token and webhook_verify_token are intentionally NOT selected.
      // Sensitive credentials are only readable by the backend service role.
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('id, business_name, phone_number_id, webhook_url, is_active, api_version, rate_limit_per_minute, auto_assignment_enabled, business_description, business_website, business_email, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('خطأ في جلب إعدادات WhatsApp:', error);
        throw error;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // تحديث الإعدادات
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: WhatsAppSettingsData) => {
      // إنشاء webhook URL
      const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
      
      const dataToSave = {
        ...settingsData,
        webhook_url: webhookUrl,
        updated_at: new Date().toISOString()
      };

      if (settings?.id) {
        // تحديث الإعدادات الموجودة
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .update(dataToSave)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) {
          console.error('خطأ في تحديث إعدادات WhatsApp:', error);
          throw error;
        }

        return data;
      } else {
        // إنشاء إعدادات جديدة
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .insert([dataToSave])
          .select()
          .single();

        if (error) {
          console.error('خطأ في إنشاء إعدادات WhatsApp:', error);
          throw error;
        }

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
      toast.success('تم حفظ إعدادات WhatsApp بنجاح');
    },
    onError: (error) => {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast.error('فشل في حفظ إعدادات WhatsApp');
    }
  });

  // اختبار الاتصال مع WhatsApp API
  const testConnectionMutation = useMutation({
    mutationFn: async (params: TestConnectionParams): Promise<TestConnectionResult> => {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${params.phone_number_id}`,
          {
            headers: {
              'Authorization': `Bearer ${params.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data
          };
        } else {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error?.message || 'فشل في الاتصال مع WhatsApp API'
          };
        }
      } catch (error) {
        console.error('خطأ في اختبار الاتصال:', error);
        return {
          success: false,
          error: 'خطأ في الشبكة أو في معاملات الاتصال'
        };
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم اختبار الاتصال بنجاح! ✅');
      } else {
        toast.error(`فشل في الاتصال: ${result.error}`);
      }
    },
    onError: (error) => {
      console.error('خطأ في اختبار الاتصال:', error);
      toast.error('فشل في اختبار الاتصال');
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending
  };
};
