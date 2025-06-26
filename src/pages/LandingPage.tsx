
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Star,
  Plane,
  Hotel,
  Car,
  Shield,
  Clock,
  Users,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ServiceRequest {
  name: string;
  phone: string;
  email: string;
  service_type: string;
  message: string;
  preferred_contact: string;
}

const LandingPage = () => {
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
      const { error } = await supabase
        .from('service_requests')
        .insert([formData]);

      if (error) throw error;

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

  const cairoHotels = [
    {
      id: 1,
      name: 'فور سيزونز القاهرة',
      image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'النيل - القاهرة',
      price: '2500',
      features: ['إطلالة على النيل', 'سبا فاخر', 'مطاعم متنوعة']
    },
    {
      id: 2,
      name: 'فيرمونت نايل سيتي',
      image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'نايل سيتي - القاهرة',
      price: '2200',
      features: ['برج حديث', 'مرافق متكاملة', 'موقع متميز']
    },
    {
      id: 3,
      name: 'كيمبينسكي نايل هوتل',
      image: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 5,
      location: 'جاردن سيتي - القاهرة',
      price: '2800',
      features: ['تصميم فاخر', 'خدمة راقية', 'مطاعم عالمية']
    }
  ];

  const services = [
    {
      icon: Hotel,
      title: 'حجز الفنادق',
      description: 'احجز أفضل الفنادق في مصر والعالم بأسعار تنافسية',
      color: 'bg-blue-500'
    },
    {
      icon: Plane,
      title: 'حجز الطيران',
      description: 'رحلات جوية مريحة لجميع الوجهات العالمية',
      color: 'bg-green-500'
    },
    {
      icon: Car,
      title: 'تأجير السيارات',
      description: 'سيارات حديثة ومريحة لرحلتك',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Vogatchi Travel
              </span>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                <Phone className="h-5 w-5" />
                <span className="font-medium">+20 100 123 4567</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
                <Mail className="h-5 w-5" />
                <span className="font-medium">info@vogatchi.com</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              رحلتك المميزة تبدأ 
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
                من هنا
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر 
              مع ضمان الجودة والأسعار التنافسية
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Shield className="h-4 w-4 mr-2" />
                مرخص رسمياً
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Users className="h-4 w-4 mr-2" />
                +10,000 عميل راضي
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Clock className="h-4 w-4 mr-2" />
                خدمة 24/7
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">خدماتنا المميزة</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cairo Hotels Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">فنادق القاهرة الفاخرة</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              اكتشف أفضل الفنادق الخمس نجوم في القاهرة مع إمكانية الدفع عند الوصول
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {cairoHotels.map((hotel) => (
              <Card key={hotel.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="relative overflow-hidden">
                  <img 
                    src={hotel.image} 
                    alt={hotel.name}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-500 text-white px-3 py-1">
                      <div className="flex items-center">
                        {Array.from({ length: hotel.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <Badge className="bg-green-500 text-white w-full justify-center py-2">
                      الدفع عند الوصول متاح
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{hotel.name}</h3>
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="h-4 w-4 mr-2" />
                    {hotel.location}
                  </div>
                  <div className="space-y-2 mb-4">
                    {hotel.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{hotel.price}</span>
                      <span className="text-gray-500 text-sm mr-1">جنيه / ليلة</span>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      احجز الآن
                      <ArrowRight className="h-4 w-4 mr-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">اطلب خدمتك الآن</h2>
              <p className="text-gray-600 text-lg">
                املأ النموذج وسنتواصل معك خلال 24 ساعة لتقديم أفضل العروض
              </p>
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">V</span>
                </div>
                <span className="text-xl font-bold">Vogatchi Travel</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية بجودة عالية وأسعار تنافسية.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">خدماتنا</h3>
              <ul className="space-y-2 text-gray-400">
                <li>حجز الفنادق</li>
                <li>حجز الطيران</li>
                <li>الباقات السياحية</li>
                <li>تأجير السيارات</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">الوجهات</h3>
              <ul className="space-y-2 text-gray-400">
                <li>القاهرة</li>
                <li>الإسكندرية</li>
                <li>شرم الشيخ</li>
                <li>الغردقة</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">تواصل معنا</h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +20 100 123 4567
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  info@vogatchi.com
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  القاهرة، مصر
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Vogatchi Travel. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
