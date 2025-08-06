
import BookingRequestForm from '@/components/booking-request/BookingRequestForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Hotel, Car, Package } from 'lucide-react';

const BookingRequest = () => {
  const handleBookingSubmit = async (data: any) => {
    console.log('📋 تم استلام طلب الحجز:', data);
    // هنا سيتم إرسال البيانات لقاعدة البيانات
    // يمكن إضافة API call لاحقاً
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            طلب حجز خدمات السفر
          </h1>
          <p className="text-muted-foreground text-lg">
            نحن هنا لتلبية جميع احتياجاتك السياحية - املأ النموذج وسنتواصل معك قريباً
          </p>
        </div>

        {/* خدماتنا */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Hotel className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">حجز الفنادق</h3>
                <p className="text-sm text-muted-foreground">أفضل الأسعار</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Plane className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">حجز الطيران</h3>
              <p className="text-sm text-muted-foreground">رحلات مريحة</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Car className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">تأجير السيارات</h3>
              <p className="text-sm text-muted-foreground">أحدث الموديلات</p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">باقات شاملة</h3>
              <p className="text-sm text-muted-foreground">عروض مميزة</p>
            </CardContent>
          </Card>
        </div>

        {/* نموذج طلب الحجز */}
        <BookingRequestForm onSubmit={handleBookingSubmit} />

        {/* معلومات التواصل */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-center text-white">
              تحتاج مساعدة؟ تواصل معنا
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">الهاتف</h4>
                <p>+20 123 456 789</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">البريد الإلكتروني</h4>
                <p>info@vogatchi.com</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">ساعات العمل</h4>
                <p>9 صباحاً - 6 مساءً</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingRequest;
