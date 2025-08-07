import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  bucket: 'destinations' | 'hotels' | 'media';
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  bucket,
  folder = '',
  accept = 'image/*',
  maxSize = 10,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'حجم الملف كبير جداً',
        description: `يجب أن يكون حجم الملف أقل من ${maxSize} ميجابايت`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'نوع ملف غير صحيح',
        description: 'يرجى اختيار ملف صورة صحيح',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create file name with timestamp to avoid conflicts
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setPreview(publicUrl);
      onChange(publicUrl);

      // Save to media library
      await supabase.from('media_library').insert({
        filename: fileName,
        original_name: file.name,
        file_path: data.path,
        file_size: file.size,
        mime_type: file.type,
        category: bucket,
        alt_text: file.name.split('.')[0],
      });

      toast({
        title: 'تم رفع الصورة بنجاح',
        description: 'تم حفظ الصورة في المكتبة',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'خطأ في رفع الصورة',
        description: 'حدث خطأ أثناء رفع الصورة، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label>الصورة</Label>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 ml-2" />
            إزالة
          </Button>
        )}
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-6">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="معاينة الصورة"
              className="max-w-full h-48 object-cover rounded-lg mx-auto"
            />
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleClick}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 ml-2" />
                تغيير الصورة
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              اسحب وأفلت الصورة هنا أو انقر للاختيار
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleClick}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 ml-2" />
              {isUploading ? 'جاري الرفع...' : 'اختيار صورة'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              أقصى حجم: {maxSize} ميجابايت
            </p>
          </div>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};