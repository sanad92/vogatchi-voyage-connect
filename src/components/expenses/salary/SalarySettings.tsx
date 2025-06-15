
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';
import { useSalarySettings } from '@/hooks/useSalarySettings';
import { toast } from 'sonner';

const SalarySettings = () => {
  const { salarySettings, settingsLoading, updateSalarySetting, isUpdatingSetting } = useSalarySettings();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  const handleUpdateSetting = async (id: string, key: string) => {
    if (!editedSettings[id]) return;

    try {
      await updateSalarySetting({
        id,
        setting_value: editedSettings[id]
      });
      toast.success(`تم تحديث ${getSettingName(key)} بنجاح`);
      setEditedSettings(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('حدث خطأ في تحديث الإعداد');
    }
  };

  const getSettingName = (key: string) => {
    const names: Record<string, string> = {
      'tax_rate': 'معدل الضريبة',
      'insurance_rate': 'معدل التأمين',
      'overtime_multiplier': 'مضاعف الساعات الإضافية',
      'working_days_per_month': 'أيام العمل في الشهر',
      'working_hours_per_day': 'ساعات العمل في اليوم'
    };
    return names[key] || key;
  };

  const getSettingUnit = (key: string) => {
    const units: Record<string, string> = {
      'tax_rate': '%',
      'insurance_rate': '%',
      'overtime_multiplier': 'مرة',
      'working_days_per_month': 'يوم',
      'working_hours_per_day': 'ساعة'
    };
    return units[key] || '';
  };

  if (settingsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إعدادات الرواتب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {salarySettings?.map((setting) => (
          <div key={setting.id} className="border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>{getSettingName(setting.setting_key)}</Label>
                <p className="text-sm text-gray-600">{setting.description}</p>
              </div>
              
              <div className="space-y-2">
                <Label>القيمة الحالية</Label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{setting.setting_value}</span>
                  <span className="text-sm text-gray-500">{getSettingUnit(setting.setting_key)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="قيمة جديدة"
                  value={editedSettings[setting.id] || ''}
                  onChange={(e) => setEditedSettings(prev => ({
                    ...prev,
                    [setting.id]: e.target.value
                  }))}
                />
                <Button
                  onClick={() => handleUpdateSetting(setting.id, setting.setting_key)}
                  disabled={!editedSettings[setting.id] || isUpdatingSetting}
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SalarySettings;
