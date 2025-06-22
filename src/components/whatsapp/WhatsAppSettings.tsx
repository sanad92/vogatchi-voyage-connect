
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Phone, 
  Key, 
  Globe, 
  Shield, 
  TestTube,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { toast } from 'sonner';

export const WhatsAppSettings: React.FC = () => {
  const { 
    settings, 
    isLoading, 
    updateSettings, 
    testConnection,
    isUpdating,
    isTesting 
  } = useWhatsAppSettings();
  
  const [formData, setFormData] = useState({
    business_name: settings?.business_name || '',
    phone_number_id: settings?.phone_number_id || '',
    access_token: settings?.access_token || '',
    webhook_verify_token: settings?.webhook_verify_token || '',
    webhook_url: settings?.webhook_url || '',
    business_description: settings?.business_description || '',
    business_website: settings?.business_website || '',
    business_email: settings?.business_email || '',
    api_version: settings?.api_version || 'v18.0',
    rate_limit_per_minute: settings?.rate_limit_per_minute || 80,
    auto_assignment_enabled: settings?.auto_assignment_enabled || true,
    is_active: settings?.is_active || false
  });

  const [showTokens, setShowTokens] = useState({
    access_token: false,
    webhook_verify_token: false
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || '',
        phone_number_id: settings.phone_number_id || '',
        access_token: settings.access_token || '',
        webhook_verify_token: settings.webhook_verify_token || '',
        webhook_url: settings.webhook_url || '',
        business_description: settings.business_description || '',
        business_website: settings.business_website || '',
        business_email: settings.business_email || '',
        api_version: settings.api_version || 'v18.0',
        rate_limit_per_minute: settings.rate_limit_per_minute || 80,
        auto_assignment_enabled: settings.auto_assignment_enabled || true,
        is_active: settings.is_active || false
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name || !formData.phone_number_id || !formData.access_token) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    try {
      await updateSettings(formData);
      toast.success('تم حفظ إعدادات WhatsApp بنجاح');
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  const handleTestConnection = async () => {
    if (!formData.phone_number_id || !formData.access_token) {
      toast.error('يرجى إدخال Phone Number ID وAccess Token أولاً');
      return;
    }

    try {
      const result = await testConnection({
        phone_number_id: formData.phone_number_id,
        access_token: formData.access_token
      });
      
      if (result.success) {
        toast.success('تم اختبار الاتصال بنجاح! ✅');
      } else {
        toast.error(`فشل في الاتصال: ${result.error}`);
      }
    } catch (error) {
      console.error('خطأ في اختبار الاتصال:', error);
      toast.error('فشل في اختبار الاتصال');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            إعدادات WhatsApp Business
          </h2>
          <p className="text-gray-600 mt-1">
            إدارة إعدادات WhatsApp Business API والتحكم في الاتصال
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={settings?.is_active ? "default" : "secondary"}>
            {settings?.is_active ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>
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
                <Label htmlFor="business_name">اسم الأعمال *</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder="مثال: شركة فيزيت تورز"
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
                  placeholder="info@visittours.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="business_website">موقع الويب</Label>
              <Input
                id="business_website"
                value={formData.business_website}
                onChange={(e) => setFormData({...formData, business_website: e.target.value})}
                placeholder="https://visittours.com"
              />
            </div>

            <div>
              <Label htmlFor="business_description">وصف الأعمال</Label>
              <Textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) => setFormData({...formData, business_description: e.target.value})}
                placeholder="وصف قصير عن نشاط الشركة..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* إعدادات API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              إعدادات WhatsApp API
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
                  placeholder="123456789012345"
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
              <div className="relative">
                <Input
                  id="access_token"
                  type={showTokens.access_token ? "text" : "password"}
                  value={formData.access_token}
                  onChange={(e) => setFormData({...formData, access_token: e.target.value})}
                  placeholder="EAAxxxxxxxx"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokens({...showTokens, access_token: !showTokens.access_token})}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                >
                  {showTokens.access_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="webhook_verify_token">Webhook Verify Token *</Label>
              <div className="relative">
                <Input
                  id="webhook_verify_token"
                  type={showTokens.webhook_verify_token ? "text" : "password"}
                  value={formData.webhook_verify_token}
                  onChange={(e) => setFormData({...formData, webhook_verify_token: e.target.value})}
                  placeholder="your_verify_token"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokens({...showTokens, webhook_verify_token: !showTokens.webhook_verify_token})}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                >
                  {showTokens.webhook_verify_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                placeholder="https://your-domain.com/webhook"
                readOnly
              />
              <p className="text-sm text-gray-500 mt-1">
                سيتم إنشاء هذا الرابط تلقائياً عند حفظ الإعدادات
              </p>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات متقدمة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              الإعدادات المتقدمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">تفعيل WhatsApp Business</Label>
                <p className="text-sm text-gray-500">
                  تشغيل/إيقاف استقبال وإرسال الرسائل
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_assignment">التوزيع التلقائي للمحادثات</Label>
                <p className="text-sm text-gray-500">
                  توزيع المحادثات الجديدة تلقائياً على الموظفين
                </p>
              </div>
              <Switch
                id="auto_assignment"
                checked={formData.auto_assignment_enabled}
                onCheckedChange={(checked) => setFormData({...formData, auto_assignment_enabled: checked})}
              />
            </div>

            <div>
              <Label htmlFor="rate_limit">حد الرسائل في الدقيقة</Label>
              <Input
                id="rate_limit"
                type="number"
                min="1"
                max="1000"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData({...formData, rate_limit_per_minute: parseInt(e.target.value) || 80})}
              />
              <p className="text-sm text-gray-500 mt-1">
                الحد الأقصى: 1000 رسالة في الدقيقة (حسب خطة Meta)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* أزرار الحفظ والاختبار */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !formData.phone_number_id || !formData.access_token}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            اختبار الاتصال
          </Button>

          <Button
            type="submit"
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </form>
    </div>
  );
};
