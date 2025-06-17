
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Calendar, Users, DollarSign, FileText, MapPin, Clock } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";
import UnifiedBookingStatusSelector from "@/components/common/UnifiedBookingStatusSelector";
import MultiCurrencyDisplay from "@/components/currency/MultiCurrencyDisplay";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface FlightBookingCardProps {
  booking: FlightBooking;
  onEdit?: (booking: FlightBooking) => void;
}

const FlightBookingCard = ({ booking, onEdit }: FlightBookingCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            {booking.booking_reference}
          </CardTitle>
          <UnifiedBookingStatusSelector
            bookingId={booking.id}
            bookingType="flight"
            currentStatus={booking.status}
          />
        </div>
        <div className="text-sm text-gray-600">
          {booking.customer_name}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* معلومات الرحلة */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span>
              {booking.departure_airport?.city} → {booking.arrival_airport?.city}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>
              {format(new Date(booking.departure_date), 'PPP', { locale: ar })}
              {booking.departure_time && ` - ${booking.departure_time}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-500" />
            <span>{booking.number_of_passengers} مسافر</span>
          </div>

          {booking.flight_number && (
            <div className="flex items-center gap-2 text-sm">
              <Plane className="h-4 w-4 text-gray-500" />
              <span>رحلة: {booking.flight_number}</span>
            </div>
          )}
        </div>

        {/* معلومات شركة الطيران والدرجة */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="font-medium text-blue-900">
            {booking.airline?.name}
          </div>
          <div className="text-sm text-blue-700">
            {booking.flight_class?.name_ar}
          </div>
        </div>

        {/* المعلومات المالية */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>التكلفة الإجمالية:</span>
            <span className="font-bold text-green-600">
              <MultiCurrencyDisplay amount={booking.total_cost} currency={booking.currency as "EGP" | "USD" | "SAR"} />
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-2">
            <span>المبلغ المدفوع:</span>
            <span className="text-blue-600">
              <MultiCurrencyDisplay amount={booking.paid_amount} currency={booking.currency as "EGP" | "USD" | "SAR"} />
            </span>
          </div>
          
          {booking.remaining_amount && booking.remaining_amount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>المبلغ المتبقي:</span>
              <span className="text-red-600 font-medium">
                <MultiCurrencyDisplay amount={booking.remaining_amount} currency={booking.currency as "EGP" | "USD" | "SAR"} />
              </span>
            </div>
          )}
        </div>

        {/* المورد */}
        <div className="text-sm">
          <span className="text-gray-500">المورد: </span>
          <span className="font-medium">{booking.supplier_name}</span>
        </div>

        {/* وكيل الحجز */}
        <div className="text-sm">
          <span className="text-gray-500">وكيل الحجز: </span>
          <span>{booking.booking_agent_name}</span>
        </div>

        {/* رقم التأكيد */}
        {booking.confirmation_number && (
          <div className="text-sm bg-gray-50 p-2 rounded">
            <span className="text-gray-500">رقم التأكيد: </span>
            <span className="font-mono">{booking.confirmation_number}</span>
          </div>
        )}

        {/* حالة الوثائق */}
        <div className="flex gap-2 text-xs">
          <Badge variant={booking.invoice_sent ? "default" : "secondary"}>
            فاتورة {booking.invoice_sent ? "✓" : "✗"}
          </Badge>
          <Badge variant={booking.voucher_sent ? "default" : "secondary"}>
            قسيمة {booking.voucher_sent ? "✓" : "✗"}
          </Badge>
          <Badge variant={booking.supplier_payment_sent ? "default" : "secondary"}>
            دفع مورد {booking.supplier_payment_sent ? "✓" : "✗"}
          </Badge>
        </div>

        {/* الطلبات الخاصة */}
        {booking.special_requests && (
          <div className="text-sm bg-yellow-50 p-2 rounded">
            <div className="font-medium text-yellow-800">طلبات خاصة:</div>
            <div className="text-yellow-700">{booking.special_requests}</div>
          </div>
        )}

        {/* أزرار العمليات */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <FileText className="h-4 w-4 mr-1" />
            تفاصيل
          </Button>
          <Button size="sm" variant="outline">
            <DollarSign className="h-4 w-4 mr-1" />
            فاتورة
          </Button>
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(booking)}>
              تعديل
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlightBookingCard;
