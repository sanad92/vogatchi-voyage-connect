
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Upload, 
  Image as ImageIcon, 
  Eye,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // معاينة الصورة
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setConfig(prev => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الموقع</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">اسم الموقع</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  placeholder="اسم الموقع"
                />
              </div>
              
              <div>
                <Label htmlFor="companyName">اسم الشركة</Label>
                <Input
                  id="companyName"
                  value={config.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="اسم الشركة"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="siteDescription">وصف الموقع</Label>
              <Textarea
                id="siteDescription"
                value={config.siteDescription}
                onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                placeholder="وصف مختصر للموقع"
                rows={3}
              />
            </div>
          </div>

          {/* إعدادات اللوجو */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">لوجو الموقع</h3>
            
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
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
              {(logoPreview || config.logoUrl) && (
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <img
                    src={logoPreview || config.logoUrl}
                    alt="Logo Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              
              {!logoPreview && !config.logoUrl && (
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* معلومات الشركة */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات الشركة</h3>
            
            <div>
              <Label htmlFor="companyAddress">عنوان الشركة</Label>
              <Textarea
                id="companyAddress"
                value={config.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                placeholder="العنوان الكامل للشركة"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyPhone">هاتف الشركة</Label>
                <Input
                  id="companyPhone"
                  value={config.companyPhone}
                  onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                  placeholder="رقم هاتف الشركة"
                />
              </div>
              
              <div>
                <Label htmlFor="companyEmail">بريد الشركة الإلكتروني</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={config.companyEmail}
                  onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                  placeholder="البريد الإلكتروني للشركة"
                />
              </div>
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
