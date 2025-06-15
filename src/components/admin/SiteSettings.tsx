
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Eye,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import SiteInfoSection from './site-settings/SiteInfoSection';
import LogoUploadSection from './site-settings/LogoUploadSection';
import CompanyInfoSection from './site-settings/CompanyInfoSection';

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
  const { isSuperAdmin } = useAuth();
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'Vogatchi CRM',
    siteDescription: 'نظام إدارة علاقات العملاء',
    logoUrl: '',
    companyName: 'شركة Vogatchi للسياحة',
    companyAddress: '',
    companyPhone: '',
    companyEmail: ''
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

  const handleInputChange = (field: keyof SiteConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (logoData: string) => {
    setLogoPreview(logoData);
    setConfig(prev => ({ ...prev, logoUrl: logoData }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // هنا يمكن حفظ الإعدادات في قاعدة البيانات
      // await saveSettings(config);
      
      // محاكاة عملية الحفظ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('تم حفظ إعدادات الموقع بنجاح');
      
      // تحديث عنوان الصفحة
      document.title = config.siteName;
      
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    // فتح نافذة معاينة جديدة
    const previewWindow = window.open('/', '_blank');
    if (previewWindow) {
      // يمكن إضافة منطق لتطبيق الإعدادات مؤقتاً في النافذة الجديدة
      toast.success('تم فتح معاينة في نافذة جديدة');
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
          {/* معلومات الموقع الأساسية */}
          <SiteInfoSection
            siteName={config.siteName}
            companyName={config.companyName}
            siteDescription={config.siteDescription}
            onInputChange={handleInputChange}
          />

          {/* إعدادات اللوجو */}
          <LogoUploadSection
            logoUrl={config.logoUrl}
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
          />

          {/* معلومات الشركة */}
          <CompanyInfoSection
            companyAddress={config.companyAddress}
            companyPhone={config.companyPhone}
            companyEmail={config.companyEmail}
            onInputChange={handleInputChange}
          />

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
