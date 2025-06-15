
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description: string;
  is_public: boolean;
}

interface SystemSettings {
  [key: string]: string | number | boolean;
}

export const useSystemSettings = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // جلب جميع الإعدادات
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as SystemSetting[];
    }
  });

  // تحويل الإعدادات إلى كائن سهل الاستخدام
  const getSettingsObject = (): SystemSettings => {
    if (!settings) return {};
    
    const settingsObj: SystemSettings = {};
    settings.forEach(setting => {
      let value: string | number | boolean = setting.setting_value;
      
      // تحويل القيم حسب النوع
      switch (setting.setting_type) {
        case 'number':
          value = parseFloat(setting.setting_value);
          break;
        case 'boolean':
          value = setting.setting_value === 'true';
          break;
        default:
          value = setting.setting_value;
      }
      
      settingsObj[setting.setting_key] = value;
    });
    
    return settingsObj;
  };

  // تحديث إعداد واحد
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.rpc('update_system_setting', {
        setting_key_param: key,
        setting_value_param: value
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('تم تحديث الإعداد بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الإعداد');
    }
  });

  // تحديث عدة إعدادات
  const updateMultipleSettingsMutation = useMutation({
    mutationFn: async (settingsToUpdate: { [key: string]: string }) => {
      setIsLoading(true);
      
      const promises = Object.entries(settingsToUpdate).map(([key, value]) =>
        supabase.rpc('update_system_setting', {
          setting_key_param: key,
          setting_value_param: value
        })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`فشل في تحديث ${errors.length} من الإعدادات`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('تم تحديث جميع الإعدادات بنجاح');
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث الإعدادات');
      setIsLoading(false);
    }
  });

  // الحصول على إعداد محدد
  const getSetting = (key: string, defaultValue?: any) => {
    const settingsObj = getSettingsObject();
    return settingsObj[key] ?? defaultValue;
  };

  // الحصول على إعدادات فئة معينة
  const getSettingsByCategory = (category: string) => {
    if (!settings) return [];
    return settings.filter(setting => setting.category === category);
  };

  // التحقق من صحة الإعداد
  const validateSetting = (key: string, value: string, type: string): boolean => {
    switch (type) {
      case 'number':
        return !isNaN(parseFloat(value));
      case 'boolean':
        return value === 'true' || value === 'false';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return value.length > 0;
    }
  };

  // إعادة تعيين الإعدادات للقيم الافتراضية
  const resetToDefaultsMutation = useMutation({
    mutationFn: async (category?: string) => {
      // يمكن تطبيق هذا لاحقاً عند وجود قيم افتراضية محددة
      throw new Error('لم يتم تطبيق هذه الميزة بعد');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('تم إعادة تعيين الإعدادات للقيم الافتراضية');
    }
  });

  return {
    settings,
    settingsObject: getSettingsObject(),
    isLoading: settingsLoading || isLoading,
    getSetting,
    getSettingsByCategory,
    updateSetting: updateSettingMutation.mutate,
    updateMultipleSettings: updateMultipleSettingsMutation.mutate,
    validateSetting,
    resetToDefaults: resetToDefaultsMutation.mutate,
    isUpdating: updateSettingMutation.isPending || updateMultipleSettingsMutation.isPending
  };
};
