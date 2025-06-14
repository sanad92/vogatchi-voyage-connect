
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Building2, DollarSign, Mail, Globe, Shield } from "lucide-react";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description: string;
  is_public: boolean;
}

const SystemSettingsTab = () => {
  const queryClient = useQueryClient();
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});

  // جلب جميع الإعدادات
  const { data: settings, isLoading } = useQuery({
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

  // تحديث إعداد
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
      toast({
        title: "تم التحديث",
        description: "تم حفظ الإعدادات بنجاح",
      });
      setEditingSettings({});
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSaveSetting = (key: string) => {
    const value = editingSettings[key];
    if (value !== undefined) {
      updateSettingMutation.mutate({ key, value });
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditingSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = editingSettings[setting.setting_key] ?? setting.setting_value;

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={currentValue === 'true'}
              onCheckedChange={(checked) => 
                handleSettingChange(setting.setting_key, checked.toString())
              }
            />
            <span className="text-sm text-gray-600">
              {currentValue === 'true' ? 'مفعل' : 'معطل'}
            </span>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
          />
        );
      default:
        return setting.setting_key.includes('address') || setting.setting_key.includes('description') ? (
          <Textarea
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            rows={3}
          />
        ) : (
          <Input
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
          />
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'company': return <Building2 className="h-5 w-5" />;
      case 'financial': return <DollarSign className="h-5 w-5" />;
      case 'notifications': return <Mail className="h-5 w-5" />;
      case 'general': return <Globe className="h-5 w-5" />;
      case 'security': return <Shield className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'company': return 'معلومات الشركة';
      case 'financial': return 'الإعدادات المالية';
      case 'notifications': return 'الإشعارات';
      case 'general': return 'الإعدادات العامة';
      case 'security': return 'الأمان';
      case 'booking': return 'الحجوزات';
      case 'automation': return 'الأتمتة';
      default: return category;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل الإعدادات...</div>;
  }

  // تجميع الإعدادات حسب الفئة
  const settingsByCategory = settings?.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>) || {};

  return (
    <div className="space-y-6">
      {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {getCategoryTitle(category)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySettings.map((setting) => (
              <div key={setting.setting_key} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">{setting.description}</Label>
                  <p className="text-sm text-gray-500 mt-1">{setting.setting_key}</p>
                </div>
                <div>
                  {renderSettingInput(setting)}
                </div>
                <div className="flex items-center gap-2">
                  {editingSettings[setting.setting_key] !== undefined && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting(setting.setting_key)}
                        disabled={updateSettingMutation.isPending}
                      >
                        حفظ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newSettings = { ...editingSettings };
                          delete newSettings[setting.setting_key];
                          setEditingSettings(newSettings);
                        }}
                      >
                        إلغاء
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SystemSettingsTab;
