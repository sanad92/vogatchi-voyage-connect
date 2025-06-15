
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Hotel } from 'lucide-react';
import HotelBookingForm from '@/components/hotel-bookings/HotelBookingForm';

const NewHotelBooking = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/hotel-bookings');
  };

  const handleCancel = () => {
    navigate(-1);
  };

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
          <CardTitle>معلومات الحجز</CardTitle>
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
