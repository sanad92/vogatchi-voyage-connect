
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Eye,
  Save,
  AlertCircle,
  Upload,
  ImageIcon
} from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

const SiteSettings = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'Vogatchi CRM',
    siteDescription: 'نظام إدارة علاقات العملاء',
    logoUrl: '',
    companyName: 'شركة Vogatchi للسياحة',
    companyAddress: 'القاهرة، مصر',
    companyPhone: '01103442881',
    companyEmail: 'ops@vogatchitrips.com'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // التحقق من صلاحيات السوبر أدمن
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

  // تحميل الإعدادات من قاعدة البيانات
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
        toast.error('فشل في تحميل إعدادات الموقع');
        return;
      }

      if (data) {
        const settingsMap = data.reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string>);

        setConfig({
          siteName: settingsMap.site_name || 'Vogatchi CRM',
          siteDescription: settingsMap.site_description || 'نظام إدارة علاقات العملاء',
          logoUrl: settingsMap.logo_url || '',
          companyName: settingsMap.company_name || 'شركة Vogatchi للسياحة',
          companyAddress: settingsMap.company_address || 'القاهرة، مصر',
          companyPhone: settingsMap.company_phone || '01103442881',
          companyEmail: settingsMap.company_email || 'ops@vogatchitrips.com'
        });

        if (settingsMap.logo_url) {
          setLogoPreview(settingsMap.logo_url);
        }
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات:', error);
      toast.error('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SiteConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // التحقق من حجم الملف (2MB كحد أقصى)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 2MB');
      return;
    }

    // معاينة الصورة وحفظها
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setConfig(prev => ({ ...prev, logoUrl: result }));
      toast.success('تم رفع اللوجو بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { setting_key: key, setting_value: value },
        { onConflict: 'setting_key' }
      );

    if (error) {
      throw error;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // التحقق من صحة البيانات
      if (!config.siteName.trim()) {
        toast.error('يرجى إدخال اسم الموقع');
        return;
      }

      if (!config.companyName.trim()) {
        toast.error('يرجى إدخال اسم الشركة');
        return;
      }

      // حفظ جميع الإعدادات في قاعدة البيانات
      await Promise.all([
        updateSetting('site_name', config.siteName),
        updateSetting('site_description', config.siteDescription),
        updateSetting('logo_url', config.logoUrl),
        updateSetting('company_name', config.companyName),
        updateSetting('company_address', config.companyAddress),
        updateSetting('company_phone', config.companyPhone),
        updateSetting('company_email', config.companyEmail)
      ]);
      
      toast.success('تم حفظ إعدادات الموقع بنجاح');
      
      // تحديث عنوان الصفحة
      document.title = config.siteName;
      
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    // فتح نافذة معاينة جديدة
    const previewWindow = window.open('/', '_blank');
    if (previewWindow) {
      toast.success('تم فتح معاينة في نافذة جديدة');
    }
  };

  if (isLoading && !config.siteName) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-2">جاري تحميل الإعدادات...</span>
      </div>
    );
  }

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
          {/* معلومات الموقع الأساسية */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الموقع</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                <Input
                  value={config.siteName}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  placeholder="اسم الموقع"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اسم الشركة</label>
                <Input
                  value={config.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="اسم الشركة"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">وصف الموقع</label>
              <Textarea
                value={config.siteDescription}
                onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                placeholder="وصف مختصر للموقع"
                rows={2}
              />
            </div>
          </div>

          {/* إعدادات اللوجو */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">لوجو الموقع</h3>
            
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  رفع لوجو جديد
                </Button>
                <p className="text-sm text-gray-500 mt-1">
                  الأحجام المدعومة: JPG, PNG, SVG (الحد الأقصى 2MB)
                </p>
              </div>
              
              {/* معاينة اللوجو */}
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {(logoPreview || config.logoUrl) ? (
                  <img
                    src={logoPreview || config.logoUrl}
                    alt="Logo Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* معلومات الشركة */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الاتصال</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <Input
                  value={config.companyPhone}
                  onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                  placeholder="01103442881"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <Input
                  value={config.companyEmail}
                  onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                  placeholder="ops@vogatchitrips.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العنوان</label>
              <Input
                value={config.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                placeholder="عنوان الشركة"
              />
            </div>
          </div>

          {/* معاينة التغييرات */}
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              ستصبح التغييرات نافذة فوراً بعد الحفظ. يمكنك معاينة الموقع بالإعدادات الجديدة قبل الحفظ.
            </AlertDescription>
          </Alert>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
            
            <Button 
              onClick={handlePreview}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              معاينة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettings;
