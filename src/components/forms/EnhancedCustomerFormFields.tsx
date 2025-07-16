import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Percent } from 'lucide-react';
import EnhancedFormField from '@/components/common/EnhancedFormField';
import { useEnhancedFormValidation } from '@/hooks/useEnhancedFormValidation';

interface EnhancedCustomerFormFieldsProps {
  formData: any;
  onChange: (name: string, value: any) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  isEditMode?: boolean;
}

const EnhancedCustomerFormFields = ({
  formData,
  onChange,
  onSubmit,
  isSubmitting,
  onCancel,
  isEditMode = false
}: EnhancedCustomerFormFieldsProps) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const { validateForm, hasErrors } = useEnhancedFormValidation({
    formType: 'customer',
    onValidationChange: (isValid, validationErrors) => {
      setErrors(validationErrors);
    }
  });

  // معالج إرسال النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm(formData)) {
      onSubmit(formData);
    }
  };

  // معالج تغيير الحقول مع التحقق التلقائي
  const handleFieldChange = (name: string, value: any) => {
    onChange(name, value);
  };

  const segmentOptions = [
    { value: 'bronze', label: 'برونزي' },
    { value: 'silver', label: 'فضي' },
    { value: 'gold', label: 'ذهبي' },
    { value: 'platinum', label: 'بلاتيني' },
    { value: 'vip', label: 'VIP' }
  ];

  const nationalityOptions = [
    { value: 'EG', label: 'مصري' },
    { value: 'SA', label: 'سعودي' },
    { value: 'AE', label: 'إماراتي' },
    { value: 'KW', label: 'كويتي' },
    { value: 'QA', label: 'قطري' },
    { value: 'BH', label: 'بحريني' },
    { value: 'OM', label: 'عماني' },
    { value: 'JO', label: 'أردني' },
    { value: 'LB', label: 'لبناني' },
    { value: 'SY', label: 'سوري' },
    { value: 'IQ', label: 'عراقي' },
    { value: 'YE', label: 'يمني' },
    { value: 'LY', label: 'ليبي' },
    { value: 'TN', label: 'تونسي' },
    { value: 'DZ', label: 'جزائري' },
    { value: 'MA', label: 'مغربي' },
    { value: 'SD', label: 'سوداني' },
    { value: 'US', label: 'أمريكي' },
    { value: 'GB', label: 'بريطاني' },
    { value: 'FR', label: 'فرنسي' },
    { value: 'DE', label: 'ألماني' },
    { value: 'IT', label: 'إيطالي' },
    { value: 'ES', label: 'إسباني' },
    { value: 'RU', label: 'روسي' },
    { value: 'CN', label: 'صيني' },
    { value: 'IN', label: 'هندي' },
    { value: 'OTHER', label: 'أخرى' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* المعلومات الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            المعلومات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedFormField
              name="name"
              label="اسم العميل"
              type="text"
              value={formData.name}
              onChange={handleFieldChange}
              placeholder="أدخل اسم العميل"
              required
              validation={{
                required: true,
                min: 2,
                message: "اسم العميل يجب أن يكون حرفين على الأقل"
              }}
            />

            <EnhancedFormField
              name="nationality"
              label="الجنسية"
              type="select"
              value={formData.nationality}
              onChange={handleFieldChange}
              options={nationalityOptions}
              placeholder="اختر الجنسية"
            />
          </div>

          <EnhancedFormField
            name="passport_number"
            label="رقم جواز السفر"
            type="text"
            value={formData.passport_number}
            onChange={handleFieldChange}
            placeholder="أدخل رقم جواز السفر (اختياري)"
          />
        </CardContent>
      </Card>

      {/* معلومات الاتصال */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            معلومات الاتصال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedFormField
              name="phone"
              label="رقم الهاتف"
              type="tel"
              value={formData.phone}
              onChange={handleFieldChange}
              placeholder="+20 123 456 7890"
              required
              validation={{
                required: true,
                pattern: /^[\+]?[0-9\s\-\(\)]{10,}$/,
                message: "رقم الهاتف غير صحيح"
              }}
            />

            <EnhancedFormField
              name="email"
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={handleFieldChange}
              placeholder="example@email.com"
              validation={{
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "البريد الإلكتروني غير صحيح"
              }}
            />
          </div>

          <EnhancedFormField
            name="address"
            label="العنوان"
            type="textarea"
            value={formData.address}
            onChange={handleFieldChange}
            placeholder="أدخل العنوان الكامل (اختياري)"
          />
        </CardContent>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            معلومات إضافية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnhancedFormField
              name="segment_id"
              label="فئة العميل"
              type="select"
              value={formData.segment_id}
              onChange={handleFieldChange}
              options={segmentOptions}
              placeholder="اختر فئة العميل"
            />

            <EnhancedFormField
              name="loyalty_points"
              label="نقاط الولاء"
              type="number"
              value={formData.loyalty_points}
              onChange={handleFieldChange}
              placeholder="0"
              validation={{
                min: 0,
                message: "نقاط الولاء يجب أن تكون صفر أو أكثر"
              }}
            />
          </div>

          <EnhancedFormField
            name="preferences"
            label="تفضيلات العميل"
            type="textarea"
            value={formData.preferences}
            onChange={handleFieldChange}
            placeholder="أدخل تفضيلات العميل (نوع الغرفة، الطعام، إلخ...)"
            description="ملاحظات حول تفضيلات العميل لتحسين الخدمة"
          />
        </CardContent>
      </Card>

      {/* أزرار الإجراءات */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || hasErrors}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  جاري الحفظ...
                </div>
              ) : (
                <>
                  {isEditMode ? 'تحديث العميل' : 'حفظ العميل'}
                </>
              )}
            </Button>
          </div>

          {/* عرض الأخطاء إذا وُجدت */}
          {hasErrors && Object.keys(errors).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium mb-2">يرجى تصحيح الأخطاء التالية:</p>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.entries(errors).map(([field, fieldErrors]) => 
                  fieldErrors.map((error, index) => (
                    <li key={`${field}-${index}`} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {error}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
};

export default EnhancedCustomerFormFields;