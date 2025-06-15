
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SalarySetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const useSalarySettings = () => {
  const queryClient = useQueryClient();

  // جلب إعدادات الرواتب
  const { data: salarySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['salary-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data as SalarySetting[];
    },
  });

  // تحديث إعداد راتب
  const { mutateAsync: updateSalarySetting, isPending: isUpdatingSetting } = useMutation({
    mutationFn: async ({ id, setting_value }: { id: string; setting_value: string }) => {
      const { data, error } = await supabase
        .from('salary_settings')
        .update({ setting_value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-settings'] });
    },
  });

  // الحصول على قيمة إعداد معين
  const getSetting = (key: string): string => {
    const setting = salarySettings?.find(s => s.setting_key === key);
    return setting?.setting_value || '0';
  };

  return {
    salarySettings,
    settingsLoading,
    updateSalarySetting,
    isUpdatingSetting,
    getSetting,
  };
};
