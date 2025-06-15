
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Plane } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";
import BookingStatusBadge from "@/components/hotel-bookings/BookingStatusBadge";
import { format } from "date-fns";

interface FlightBookingCardProps {
  booking: FlightBooking;
  onEdit: (booking: FlightBooking) => void;
}

const FlightBookingCard = ({ booking, onEdit }: FlightBookingCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* معلومات الرحلة الأساسية */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{booking.customer_name}</h3>
              <Badge variant="outline">{booking.booking_reference}</Badge>
              {booking.booking_status && (
                <BookingStatusBadge status={booking.booking_status} />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
              {/* مسار الرحلة */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {booking.departure_airport?.iata_code} → {booking.arrival_airport?.iata_code}
                </span>
              </div>
              
              {/* تاريخ المغادرة */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(booking.departure_date)}</span>
              </div>
              
              {/* شركة الطيران */}
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                <span>
                  {booking.airline?.name}
                  {booking.flight_number && ` - ${booking.flight_number}`}
                </span>
              </div>
              
              {/* عدد المسافرين */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{booking.number_of_passengers} مسافر</span>
              </div>
              
              {/* درجة السفر */}
              <div>
                <Badge variant="secondary">
                  {booking.flight_class?.name_ar}
                </Badge>
              </div>
              
              {/* تفاصيل الطيران */}
              <div className="text-xs">
                {booking.departure_airport?.city} → {booking.arrival_airport?.city}
              </div>
            </div>
          </div>

          {/* المعلومات المالية والإجراءات */}
          <div className="flex flex-col lg:items-end gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(booking.total_cost)}
              </p>
              <p className="text-sm text-gray-500">
                الربح: {formatCurrency(booking.total_profit || 0)}
              </p>
              {booking.remaining_amount && booking.remaining_amount > 0 && (
                <p className="text-sm text-red-500">
                  متبقي: {formatCurrency(booking.remaining_amount)}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(booking)}
              >
                عرض التفاصيل
              </Button>
            </div>
          </div>
        </div>

        {/* معلومات إضافية */}
        {(booking.special_requests || booking.meal_preferences) && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {booking.special_requests && (
                <p><strong>طلبات خاصة:</strong> {booking.special_requests}</p>
              )}
              {booking.meal_preferences && (
                <p><strong>تفضيلات الوجبات:</strong> {booking.meal_preferences}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FlightBookingCard;
