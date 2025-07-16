
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hotel, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import HotelBookingForm from '@/components/hotel-bookings/HotelBookingForm';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useToast } from '@/hooks/use-toast';

const NewHotelBooking = () => {
  const navigate = useNavigate();
  const { currentEmployee, isLoading } = useCurrentEmployee();
  const { toast } = useToast();

  const handleSuccess = (bookingData?: any) => {
    toast({
      title: "تم إنشاء الحجز بنجاح",
      description: "تم حفظ حجز الفندق الجديد بنجاح",
    });
    
    // إعادة التوجيه إلى صفحة تفاصيل الحجز إذا كانت متوفرة، وإلا إلى قائمة الحجوزات
    if (bookingData?.id) {
      navigate(`/hotel-bookings/${bookingData.id}`);
    } else {
      navigate('/hotel-bookings');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري تحميل بيانات الموظف...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <Hotel className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">حجز فندق جديد</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>معلومات الحجز</span>
            {currentEmployee && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600">بواسطة:</span>
                <Badge variant="outline">{currentEmployee.full_name}</Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HotelBookingForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewHotelBooking;
