
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Calendar, MapPin, Users, DollarSign, Phone, FileText } from 'lucide-react';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const TransportBookingsList = () => {
  const { transportBookings, bookingsLoading } = useTransportBookings();

  if (bookingsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!transportBookings || transportBookings.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حجوزات نقل</h3>
          <p className="text-gray-500">ابدأ بإضافة أول حجز نقل</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {transportBookings.map((booking) => (
        <Card key={booking.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                {booking.booking_reference}
              </CardTitle>
              {booking.status && (
                <Badge style={{ backgroundColor: booking.status.color }}>
                  {booking.status.name_ar}
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {booking.customer_name}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* معلومات الرحلة */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  {format(new Date(booking.departure_date), 'PPP', { locale: ar })}
                  {booking.departure_time && ` - ${booking.departure_time}`}
                </span>
              </div>
              
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">من: {booking.pickup_location}</div>
                  <div>إلى: {booking.dropoff_location}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{booking.number_of_passengers} راكب</span>
              </div>
            </div>

            {/* معلومات السائق */}
            {booking.driver_name && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium">السائق: {booking.driver_name}</div>
                {booking.driver_phone && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    {booking.driver_phone}
                  </div>
                )}
                {booking.vehicle_plate_number && (
                  <div className="text-sm text-gray-600">
                    لوحة: {booking.vehicle_plate_number}
                  </div>
                )}
              </div>
            )}

            {/* المعلومات المالية */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>التكلفة الإجمالية:</span>
                <span className="font-bold text-green-600">
                  <MultiCurrencyDisplay amount={booking.total_cost} currency={booking.currency} />
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span>المبلغ المدفوع:</span>
                <span className="text-blue-600">
                  <MultiCurrencyDisplay amount={booking.paid_amount} currency={booking.currency} />
                </span>
              </div>
              
              {booking.remaining_amount && booking.remaining_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>المبلغ المتبقي:</span>
                  <span className="text-red-600 font-medium">
                    <MultiCurrencyDisplay amount={booking.remaining_amount} currency={booking.currency} />
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TransportBookingsList;
