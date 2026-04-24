
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Eye, Save, AlertCircle } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

const SiteSettings = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'Vogantra',
    siteDescription: 'نظام إدارة علاقات العملاء',
    companyName: 'شركة Vogantra للسياحة',
    companyAddress: 'القاهرة، مصر',
    companyPhone: '01103442881',
    companyEmail: 'hello@vogantra.com'
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">ليس لديك صلاحية</h3>
            <p className="text-gray-600">هذه الميزة متاحة للسوبر أدمن فقط</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleInputChange = (field: keyof SiteConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!config.siteName.trim()) {
        toast.error('يرجى إدخال اسم الموقع');
        return;
      }
      // حفظ الإعدادات محلياً في الوقت الحالي
      document.title = config.siteName;
      toast.success('تم حفظ إعدادات الموقع بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            إعدادات الموقع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الموقع</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                <Input value={config.siteName} onChange={(e) => handleInputChange('siteName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اسم الشركة</label>
                <Input value={config.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">وصف الموقع</label>
              <Textarea value={config.siteDescription} onChange={(e) => handleInputChange('siteDescription', e.target.value)} rows={2} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الاتصال</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <Input value={config.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <Input value={config.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العنوان</label>
              <Input value={config.companyAddress} onChange={(e) => handleInputChange('companyAddress', e.target.value)} />
            </div>
          </div>

          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              ستصبح التغييرات نافذة فوراً بعد الحفظ.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettings;
