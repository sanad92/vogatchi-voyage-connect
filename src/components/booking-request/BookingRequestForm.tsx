
import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { PublicBookingError, type PublicBookingRequest } from '@/lib/publicBooking';

interface BookingRequestFormProps {
  onSubmit?: (data: PublicBookingRequest, requestKey: string) => Promise<{ reference: string }>;
}

type BookingRequestData = Omit<PublicBookingRequest, 'departureDate' | 'returnDate'> & {
  departureDate: Date | null;
  returnDate: Date | null;
};

const emptyRequest: BookingRequestData = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  serviceType: '',
  destination: '',
  departureDate: null,
  returnDate: null,
  adults: 1,
  budget: '',
  specialRequests: '',
};

const BookingRequestForm = ({ onSubmit }: BookingRequestFormProps) => {
  const [formData, setFormData] = useState(emptyRequest);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const submitting = useRef(false);
  const lastAttempt = useRef<{ request: string; key: string } | null>(null);

  const handleInputChange = <Field extends keyof BookingRequestData>(field: Field, value: BookingRequestData[Field]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onSubmit || submitting.current) return;
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.serviceType) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }
    if (formData.returnDate && formData.departureDate && formData.returnDate < formData.departureDate) {
      toast.error('تاريخ العودة يجب ألّا يسبق تاريخ المغادرة');
      return;
    }

    const data: PublicBookingRequest = {
      ...formData,
      departureDate: formData.departureDate ? format(formData.departureDate, 'yyyy-MM-dd') : null,
      returnDate: formData.returnDate ? format(formData.returnDate, 'yyyy-MM-dd') : null,
    };
    const request = JSON.stringify(data);
    if (lastAttempt.current?.request !== request) lastAttempt.current = { request, key: crypto.randomUUID() };

    submitting.current = true;
    setIsSubmitting(true);
    setReceipt(null);
    try {
      const response = await onSubmit(data, lastAttempt.current.key);
      if (!response.reference?.trim()) throw new Error('Missing booking request receipt');
      setReceipt(response.reference);
      setFormData(emptyRequest);
      lastAttempt.current = null;
    } catch (error) {
      toast.error(error instanceof PublicBookingError ? error.message : 'تعذّر إرسال الطلب. حاول مرة أخرى.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  if (!onSubmit) {
    return (
      <Card className="mx-auto w-full max-w-4xl">
        <CardContent className="py-6 text-center">
          <p role="status">استقبال طلبات الحجز عبر الإنترنت غير متاح حاليًا.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-blue-700">
          طلب حجز جديد
        </CardTitle>
      </CardHeader>
      <CardContent>
        {receipt && (
          <p role="status" className="mb-5 rounded-md border p-4">
            تم استلام طلب عرض السعر. رقم الطلب <bdi className="font-semibold">{receipt}</bdi>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isSubmitting} className="space-y-6">
          {/* معلومات العميل */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">اسم العميل *</Label>
              <Input
                id="customerName" autoComplete="name" maxLength={120}
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="أدخل اسم العميل"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerPhone">رقم الهاتف *</Label>
              <Input
                id="customerPhone" type="tel" autoComplete="tel" maxLength={40}
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
              id="customerEmail" autoComplete="email" maxLength={254}
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
                <SelectTrigger id="serviceType" disabled={isSubmitting}>
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
                id="destination" maxLength={160}
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
                    type="button"
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
                    onSelect={(date) => handleInputChange('departureDate', date ?? null)}
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
                    type="button"
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
                    onSelect={(date) => handleInputChange('returnDate', date ?? null)}
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
              <Label htmlFor="adults">عدد البالغين</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="20"
                value={formData.adults}
                onChange={(e) => handleInputChange('adults', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">الميزانية المتوقعة</Label>
              <Input
                id="budget" maxLength={120}
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
              id="specialRequests" maxLength={1500}
              value={formData.specialRequests}
              onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              placeholder="أضف أي طلبات خاصة أو ملاحظات..."
              rows={4}
            />
          </div>

          <p className="text-sm text-muted-foreground">بنرسل التفاصيل وبيانات التواصل للشركة عشان ترد على طلبك.</p>

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
              disabled={isSubmitting}
              onClick={() => {
                setFormData(emptyRequest);
                setReceipt(null);
              }}
            >
              مسح النموذج
            </Button>
          </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingRequestForm;
