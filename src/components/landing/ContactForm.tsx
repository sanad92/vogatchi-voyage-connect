
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceRequest {
  name: string;
  phone: string;
  email: string;
  service_type: string;
  message: string;
  preferred_contact: string;
}

interface ContactFormProps {
  onWhatsAppClick: () => void;
}

const ContactForm = ({ onWhatsAppClick }: ContactFormProps) => {
  const [formData, setFormData] = useState<ServiceRequest>({
    name: '',
    phone: '',
    email: '',
    service_type: 'hotel',
    message: '',
    preferred_contact: 'phone'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('تم إرسال طلبك بنجاح! سنتواصل معك قريباً');
      setFormData({
        name: '',
        phone: '',
        email: '',
        service_type: 'hotel',
        message: '',
        preferred_contact: 'phone'
      });
    } catch (error) {
      toast.error('حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى');
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">اطلب خدمتك الآن</h2>
            <p className="text-gray-600 text-lg">
              املأ النموذج وسنتواصل معك خلال 24 ساعة لتقديم أفضل العروض
            </p>
            <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                💬 أو تواصل معنا فوراً عبر الواتساب للحصول على رد سريع وعروض حصرية!
              </p>
              <Button
                onClick={onWhatsAppClick}
                className="mt-3 bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                تواصل عبر الواتساب الآن
              </Button>
            </div>
          </div>
          
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم الكامل *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full"
                      placeholder="ادخل اسمك الكامل"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الهاتف *
                    </label>
                    <Input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full"
                      placeholder="01xxxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الخدمة المطلوبة *
                  </label>
                  <select
                    required
                    value={formData.service_type}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hotel">حجز فندق</option>
                    <option value="flight">حجز طيران</option>
                    <option value="package">باقة سياحية</option>
                    <option value="transport">نقل ومواصلات</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تفاصيل الطلب
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full"
                    rows={4}
                    placeholder="اكتب تفاصيل طلبك هنا..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    طريقة التواصل المفضلة
                  </label>
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="phone"
                        checked={formData.preferred_contact === 'phone'}
                        onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                        className="mr-2"
                      />
                      مكالمة هاتفية
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="whatsapp"
                        checked={formData.preferred_contact === 'whatsapp'}
                        onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                        className="mr-2"
                      />
                      واتساب
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="email"
                        checked={formData.preferred_contact === 'email'}
                        onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                        className="mr-2"
                      />
                      إيميل
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-lg"
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
