
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface LogoUploadSectionProps {
  logoUrl: string;
  logoPreview: string;
  onLogoChange: (logoData: string) => void;
}

const LogoUploadSection = ({ 
  logoUrl, 
  logoPreview, 
  onLogoChange 
}: LogoUploadSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onLogoChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
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
        {(logoPreview || logoUrl) && (
          <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            <img
              src={logoPreview || logoUrl}
              alt="Logo Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
        
        {!logoPreview && !logoUrl && (
          <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoUploadSection;
