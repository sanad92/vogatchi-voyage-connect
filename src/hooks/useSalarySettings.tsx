
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

  // محاكاة إعدادات الرواتب (سيتم استبدالها بالبيانات الحقيقية لاحقاً)
  const { data: salarySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['salary-settings'],
    queryFn: async () => {
      // بيانات وهمية للعرض
      const mockSettings: SalarySetting[] = [
        {
          id: '1',
          setting_key: 'tax_rate',
          setting_value: '14',
          description: 'معدل الضريبة الافتراضي (%)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          setting_key: 'insurance_rate',
          setting_value: '9',
          description: 'معدل التأمين الاجتماعي (%)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          setting_key: 'overtime_multiplier',
          setting_value: '1.5',
          description: 'مضاعف الساعات الإضافية',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          setting_key: 'working_days_per_month',
          setting_value: '30',
          description: 'أيام العمل في الشهر',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          setting_key: 'working_hours_per_day',
          setting_value: '8',
          description: 'ساعات العمل في اليوم',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      return mockSettings;
    },
  });

  // تحديث إعداد راتب (محاكاة)
  const { mutateAsync: updateSalarySetting, isPending: isUpdatingSetting } = useMutation({
    mutationFn: async ({ id, setting_value }: { id: string; setting_value: string }) => {
      // محاكاة العملية
      return { id, setting_value } as any;
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
