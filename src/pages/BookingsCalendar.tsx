
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Hotel, Plane, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const BookingsCalendar = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // جلب الحجوزات للشهر الحالي
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['calendar-bookings', selectedDate.getMonth(), selectedDate.getFullYear()],
    queryFn: async () => {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data: hotelBookings } = await supabase
        .from('hotel_bookings')
        .select('*, customer_name, check_in_date, check_out_date')
        .gte('check_in_date', startOfMonth.toISOString().split('T')[0])
        .lte('check_in_date', endOfMonth.toISOString().split('T')[0]);

      const { data: flightBookings } = await supabase
        .from('flight_bookings')
        .select('*, customer_name, departure_date')
        .gte('departure_date', startOfMonth.toISOString().split('T')[0])
        .lte('departure_date', endOfMonth.toISOString().split('T')[0]);

      return {
        hotels: hotelBookings || [],
        flights: flightBookings || []
      };
    }
  });

  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // أيام فارغة في بداية الشهر
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // أيام الشهر
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getBookingsForDate = (day: number) => {
    if (!bookings || !day) return [];
    
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const hotels = bookings.hotels.filter(booking => booking.check_in_date === dateStr);
    const flights = bookings.flights.filter(booking => booking.departure_date === dateStr);
    
    return [...hotels, ...flights];
  };

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  if (isLoading) {
    return <div className="container mx-auto p-6 text-center">جاري تحميل التقويم...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">تقويم الحجوزات</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
              >
                السابق
              </Button>
              <Button 
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
              >
                اليوم
              </Button>
              <Button 
                variant="outline"
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
              >
                التالي
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-600 border-b">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map((day, index) => {
              const dayBookings = day ? getBookingsForDate(day) : [];
              
              return (
                <div key={index} className={`min-h-[100px] p-2 border rounded-lg ${
                  day ? 'bg-white hover:bg-gray-50' : 'bg-gray-100'
                }`}>
                  {day && (
                    <>
                      <div className="font-medium text-sm mb-2">{day}</div>
                      <div className="space-y-1">
                        {dayBookings.map((booking) => (
                          <div key={booking.id} className="text-xs">
                            {'hotel_name' in booking ? (
                              <Badge variant="outline" className="text-xs p-1 flex items-center gap-1">
                                <Hotel className="h-3 w-3" />
                                {booking.customer_name}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs p-1 flex items-center gap-1">
                                <Plane className="h-3 w-3" />
                                {booking.customer_name}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsCalendar;
