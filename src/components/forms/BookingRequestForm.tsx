import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon, User, Phone, Mail, MapPin, Plane, Building2, Car } from 'lucide-react';
import { toast } from 'sonner';

const BookingRequestForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: '',
    destination: '',
    checkInDate: '',
    checkOutDate: '',
    passengers: '1',
    specialRequests: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceTypes = [
    { value: 'hotel', label: 'حجز فندق', icon: Building2 },
    { value: 'flight', label: 'حجز طيران', icon: Plane },
    { value: 'car', label: 'تأجير سيارة', icon: Car },
    { value: 'package', label: 'باقة سياحية', icon: MapPin },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.phone || !formData.serviceType) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success
      toast.success('تم إرسال طلبك بنجاح! سنتواصل معك قريباً');
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        serviceType: '',
        destination: '',
        checkInDate: '',
        checkOutDate: '',
        passengers: '1',
        specialRequests: ''
      });

      // Optional: Redirect to WhatsApp
      const whatsappMessage = `مرحباً، قمت بتقديم طلب حجز:
- الاسم: ${formData.name}
- نوع الخدمة: ${serviceTypes.find(s => s.value === formData.serviceType)?.label}
- الوجهة: ${formData.destination}
${formData.checkInDate ? `- تاريخ الوصول: ${formData.checkInDate}` : ''}
${formData.checkOutDate ? `- تاريخ المغادرة: ${formData.checkOutDate}` : ''}`;
      
      setTimeout(() => {
        window.open(`https://wa.me/201103442881?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
      }, 2000);

    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background to-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              احجز رحلتك القادمة
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              أرسل لنا تفاصيل رحلتك وسنقوم بإعداد أفضل عرض لك خلال 24 ساعة
            </p>
          </div>

          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-6 w-6 text-primary" />
                نموذج طلب الحجز
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      الاسم الكامل *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      رقم الجوال *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+966 50 123 4567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="example@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceType" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      نوع الخدمة *
                    </Label>
                    <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الخدمة" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            <div className="flex items-center gap-2">
                              <service.icon className="h-4 w-4" />
                              {service.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="destination">
                      الوجهة
                    </Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => handleInputChange('destination', e.target.value)}
                      placeholder="مثال: دبي، القاهرة، اسطنبول"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passengers">
                      عدد المسافرين
                    </Label>
                    <Select value={formData.passengers} onValueChange={(value) => handleInputChange('passengers', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'شخص' : 'أشخاص'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkInDate">
                      تاريخ الوصول / المغادرة
                    </Label>
                    <Input
                      id="checkInDate"
                      type="date"
                      value={formData.checkInDate}
                      onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkOutDate">
                      تاريخ العودة / الوصول
                    </Label>
                    <Input
                      id="checkOutDate"
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div className="space-y-2">
                  <Label htmlFor="specialRequests">
                    طلبات خاصة أو ملاحظات
                  </Label>
                  <Textarea
                    id="specialRequests"
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    placeholder="أي طلبات خاصة أو معلومات إضافية تود إضافتها..."
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        جارٍ الإرسال...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-5 w-5 mr-2" />
                        إرسال طلب الحجز
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => window.open('https://wa.me/201103442881?text=مرحباً، أريد الاستفسار عن خدماتكم السياحية', '_blank')}
                  >
                    تواصل مباشر عبر واتساب
                  </Button>
                </div>

                {/* Trust Signals */}
                <div className="mt-8 pt-6 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
                    <div>
                      ⭐ رد خلال ساعة واحدة
                    </div>
                    <div>
                      🔒 معلوماتك آمنة ومحمية
                    </div>
                    <div>
                      💯 أفضل الأسعار مضمونة
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default BookingRequestForm;