
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface BookingRequestFormProps {
  onSubmit?: (data: BookingRequestData) => void;
}

interface BookingRequestData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  destination: string;
  departureDate: Date | null;
  returnDate: Date | null;
  numberOfPeople: number;
  budget: string;
  specialRequests: string;
  images: File[];
}

const BookingRequestForm = ({ onSubmit }: BookingRequestFormProps) => {
  const [formData, setFormData] = useState<BookingRequestData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: '',
    destination: '',
    departureDate: null,
    returnDate: null,
    numberOfPeople: 1,
    budget: '',
    specialRequests: '',
    images: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof BookingRequestData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isValidType) {
        toast.error(`الملف ${file.name} ليس صورة`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`الملف ${file.name} كبير جداً (أكثر من 5MB)`);
        return false;
      }
      
      return true;
    });

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...validFiles].slice(0, 5) // أقصى 5 صور
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.serviceType) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // هنا سيتم إرسال البيانات لقاعدة البيانات
      console.log('📋 بيانات طلب الحجز:', formData);
      
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      toast.success('تم إرسال طلب الحجز بنجاح!');
      
      // إعادة تعيين النموذج
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        serviceType: '',
        destination: '',
        departureDate: null,
        returnDate: null,
        numberOfPeople: 1,
        budget: '',
        specialRequests: '',
        images: []
      });
      
    } catch (error) {
      console.error('خطأ في إرسال طلب الحجز:', error);
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-blue-700">
          طلب حجز جديد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* معلومات العميل */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">اسم العميل *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="أدخل اسم العميل"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerPhone">رقم الهاتف *</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                placeholder="أدخل رقم الهاتف"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">البريد الإلكتروني</Label>
            <Input
              id="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              placeholder="أدخل البريد الإلكتروني"
            />
          </div>

          {/* تفاصيل الخدمة */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceType">نوع الخدمة *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value) => handleInputChange('serviceType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">حجز فندق</SelectItem>
                  <SelectItem value="flight">حجز طيران</SelectItem>
                  <SelectItem value="transport">حجز نقل</SelectItem>
                  <SelectItem value="car_rental">تأجير سيارة</SelectItem>
                  <SelectItem value="package">باقة سياحية</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">الوجهة</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
                placeholder="أدخل الوجهة"
              />
            </div>
          </div>

          {/* التواريخ */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تاريخ المغادرة</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.departureDate 
                      ? format(formData.departureDate, "PPP", { locale: ar })
                      : "اختر تاريخ المغادرة"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.departureDate || undefined}
                    onSelect={(date) => handleInputChange('departureDate', date)}
                    initialFocus
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>تاريخ العودة</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.returnDate 
                      ? format(formData.returnDate, "PPP", { locale: ar })
                      : "اختر تاريخ العودة"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.returnDate || undefined}
                    onSelect={(date) => handleInputChange('returnDate', date)}
                    initialFocus
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* تفاصيل إضافية */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfPeople">عدد الأشخاص</Label>
              <Input
                id="numberOfPeople"
                type="number"
                min="1"
                max="20"
                value={formData.numberOfPeople}
                onChange={(e) => handleInputChange('numberOfPeople', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">الميزانية المتوقعة</Label>
              <Input
                id="budget"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                placeholder="مثال: 5000 جنيه"
              />
            </div>
          </div>

          {/* طلبات خاصة */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">طلبات خاصة أو ملاحظات</Label>
            <Textarea
              id="specialRequests"
              value={formData.specialRequests}
              onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              placeholder="أضف أي طلبات خاصة أو ملاحظات..."
              rows={4}
            />
          </div>

          {/* رفع الصور */}
          <div className="space-y-2">
            <Label>صور مرفقة (اختياري - حتى 5 صور)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">اضغط لرفع الصور</span>
                <span className="text-xs text-gray-500">JPG, PNG حتى 5MB لكل صورة</span>
              </label>

              {/* عرض الصور المرفوعة */}
              {formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* أزرار الإرسال */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الإرسال...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  إرسال طلب الحجز
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  customerName: '',
                  customerPhone: '',
                  customerEmail: '',
                  serviceType: '',
                  destination: '',
                  departureDate: null,
                  returnDate: null,
                  numberOfPeople: 1,
                  budget: '',
                  specialRequests: '',
                  images: []
                });
              }}
            >
              مسح النموذج
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingRequestForm;
