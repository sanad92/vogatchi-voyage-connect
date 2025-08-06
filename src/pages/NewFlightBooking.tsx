
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plane } from 'lucide-react';
import FlightBookingFormEnhanced from '@/components/flight-bookings/FlightBookingFormEnhanced';

const NewFlightBooking = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/flight-bookings');
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-sky-600" />
          <h1 className="text-2xl font-bold">حجز طيران جديد</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات حجز الطيران</CardTitle>
        </CardHeader>
        <CardContent>
          <FlightBookingFormEnhanced onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default NewFlightBooking;
