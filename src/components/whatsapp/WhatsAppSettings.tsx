
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Save, 
  TestTube, 
  Globe,
  Phone,
  Key
} from 'lucide-react';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { toast } from 'sonner';

export const WhatsAppSettings: React.FC = () => {
  const { settings, isLoading, updateSettings, isUpdating, testConnection, isTesting } = useWhatsAppSettings();
  
  const [formData, setFormData] = useState({
    business_name: settings?.business_name || '',
    phone_number_id: settings?.phone_number_id || '',
    access_token: '',
    webhook_verify_token: '',
    webhook_url: settings?.webhook_url || '',
    business_description: settings?.business_description || '',
    business_website: settings?.business_website || '',
    business_email: settings?.business_email || '',
    api_version: settings?.api_version || 'v18.0',
    rate_limit_per_minute: settings?.rate_limit_per_minute || 80,
    auto_assignment_enabled: settings?.auto_assignment_enabled ?? true,
    is_active: settings?.is_active ?? true
  });

  React.useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        business_name: settings.business_name || '',
        phone_number_id: settings.phone_number_id || '',
        // access_token & webhook_verify_token are write-only from the client;
        // keep whatever the user typed and never overwrite with values from the DB.
        webhook_url: settings.webhook_url || '',
        business_description: settings.business_description || '',
        business_website: settings.business_website || '',
        business_email: settings.business_email || '',
        api_version: settings.api_version || 'v18.0',
        rate_limit_per_minute: settings.rate_limit_per_minute || 80,
        auto_assignment_enabled: settings.auto_assignment_enabled ?? true,
        is_active: settings.is_active ?? true
      }));
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleTestConnection = async () => {
    if (!formData.phone_number_id || !formData.access_token) {
      toast.error('يرجى إدخال Phone Number ID و Access Token أولاً');
      return;
    }
    
    try {
      await testConnection({
        phone_number_id: formData.phone_number_id,
        access_token: formData.access_token
      });
    } catch (error) {
      console.error('خطأ في اختبار الاتصال:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          إعدادات WhatsApp Business API
        </h2>
        <p className="text-gray-600 mt-1">
          إعداد وتكوين WhatsApp Business API للتكامل مع النظام
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* معلومات الأعمال */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              معلومات الأعمال
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_name">اسم الشركة *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder="اسم شركتك"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="business_email">البريد الإلكتروني</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData({...formData, business_email: e.target.value})}
                  placeholder="info@company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="business_description">وصف الأعمال</Label>
              <Textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) => setFormData({...formData, business_description: e.target.value})}
                placeholder="وصف مختصر عن أعمالك"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="business_website">موقع الويب</Label>
              <Input
                id="business_website"
                type="url"
                value={formData.business_website}
                onChange={(e) => setFormData({...formData, business_website: e.target.value})}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              إعدادات API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                <Input
                  id="phone_number_id"
                  value={formData.phone_number_id}
                  onChange={(e) => setFormData({...formData, phone_number_id: e.target.value})}
                  placeholder="معرف رقم الهاتف"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="api_version">إصدار API</Label>
                <Input
                  id="api_version"
                  value={formData.api_version}
                  onChange={(e) => setFormData({...formData, api_version: e.target.value})}
                  placeholder="v18.0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="access_token">Access Token *</Label>
              <Input
                id="access_token"
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({...formData, access_token: e.target.value})}
                placeholder={settings?.id ? '•••••••• (اتركه فارغاً للإبقاء على القيمة الحالية)' : 'رمز الوصول الخاص بك'}
                required
              />
            </div>

            <div>
              <Label htmlFor="webhook_verify_token">Webhook Verify Token *</Label>
              <Input
                id="webhook_verify_token"
                value={formData.webhook_verify_token}
                onChange={(e) => setFormData({...formData, webhook_verify_token: e.target.value})}
                placeholder="رمز التحقق من الـ webhook"
                required
              />
            </div>

            <div>
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                placeholder="https://yourapp.supabase.co/functions/v1/whatsapp-webhook"
              />
            </div>

            <div>
              <Label htmlFor="rate_limit_per_minute">حد الرسائل في الدقيقة</Label>
              <Input
                id="rate_limit_per_minute"
                type="number"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData({...formData, rate_limit_per_minute: parseInt(e.target.value)})}
                min="1"
                max="1000"
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات عامة */}
        <Card>
          <CardHeader>
            <CardTitle>الإعدادات العامة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_assignment_enabled">التوزيع التلقائي</Label>
                <p className="text-sm text-gray-500">
                  توزيع المحادثات تلقائياً على الموظفين المتاحين
                </p>
              </div>
              <Switch
                id="auto_assignment_enabled"
                checked={formData.auto_assignment_enabled}
                onCheckedChange={(checked) => setFormData({...formData, auto_assignment_enabled: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">تفعيل WhatsApp Business</Label>
                <p className="text-sm text-gray-500">
                  تفعيل أو إيقاف خدمة WhatsApp Business
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* أزرار الإجراءات */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isUpdating ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {isTesting ? 'جاري الاختبار...' : 'اختبار الاتصال'}
          </Button>
        </div>
      </form>
    </div>
  );
};
