
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Calendar, MapPin, Clock, DollarSign, FileText, Settings } from 'lucide-react';
import { useCarRentals } from '@/hooks/useCarRentals';
import UnifiedBookingStatusSelector from '@/components/common/UnifiedBookingStatusSelector';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CarRentalsList = () => {
  const { carRentals, rentalsLoading } = useCarRentals();

  if (rentalsLoading) {
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

  if (!carRentals || carRentals.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد عقود إيجار سيارات</h3>
          <p className="text-gray-500">ابدأ بإضافة أول عقد إيجار</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {carRentals.map((rental) => (
        <Card key={rental.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-green-600" />
                {rental.rental_reference}
              </CardTitle>
              <UnifiedBookingStatusSelector
                bookingId={rental.id}
                bookingType="car_rental"
                currentStatus={rental.status}
              />
            </div>
            <div className="text-sm text-gray-600">
              {rental.customer_name}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* معلومات السيارة */}
            {(rental.vehicle_make || rental.vehicle_model) && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900">
                  {rental.vehicle_make} {rental.vehicle_model}
                  {rental.vehicle_year && ` (${rental.vehicle_year})`}
                </div>
                {rental.vehicle_color && (
                  <div className="text-sm text-blue-700">اللون: {rental.vehicle_color}</div>
                )}
                {rental.vehicle_plate_number && (
                  <div className="text-sm text-blue-700">لوحة: {rental.vehicle_plate_number}</div>
                )}
              </div>
            )}

            {/* معلومات الإيجار */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>
                  {format(new Date(rental.rental_start_date), 'dd/MM/yyyy', { locale: ar })}
                  {' → '}
                  {format(new Date(rental.rental_end_date), 'dd/MM/yyyy', { locale: ar })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{rental.rental_duration_days} يوم</span>
              </div>
              
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium">استلام: {rental.pickup_location}</div>
                  <div>إرجاع: {rental.return_location}</div>
                </div>
              </div>
            </div>

            {/* الميزات */}
            <div className="flex gap-2 text-xs">
              <Badge variant={rental.insurance_included ? "default" : "secondary"}>
                {rental.insurance_included ? "تأمين ✓" : "بدون تأمين"}
              </Badge>
              <Badge variant={rental.gps_included ? "default" : "secondary"}>
                {rental.gps_included ? "GPS ✓" : "بدون GPS"}
              </Badge>
              {rental.additional_driver_count > 0 && (
                <Badge variant="outline">
                  +{rental.additional_driver_count} سائق
                </Badge>
              )}
            </div>

            {/* المعلومات المالية */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>المعدل اليومي:</span>
                <span className="font-medium">
                  <MultiCurrencyDisplay amount={rental.daily_rate} currency={rental.currency as "EGP" | "USD" | "SAR"} />
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span>التكلفة الإجمالية:</span>
                <span className="font-bold text-green-600">
                  <MultiCurrencyDisplay amount={rental.total_rental_cost} currency={rental.currency as "EGP" | "USD" | "SAR"} />
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span>المبلغ المدفوع:</span>
                <span className="text-blue-600">
                  <MultiCurrencyDisplay amount={rental.paid_amount} currency={rental.currency as "EGP" | "USD" | "SAR"} />
                </span>
              </div>
              
              {rental.remaining_amount && rental.remaining_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>المبلغ المتبقي:</span>
                  <span className="text-red-600 font-medium">
                    <MultiCurrencyDisplay amount={rental.remaining_amount} currency={rental.currency as "EGP" | "USD" | "SAR"} />
                  </span>
                </div>
              )}

              {rental.security_deposit > 0 && (
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                  <span>العربون:</span>
                  <span className="text-orange-600">
                    <MultiCurrencyDisplay amount={rental.security_deposit} currency={rental.currency as "EGP" | "USD" | "SAR"} />
                  </span>
                </div>
              )}
            </div>

            {/* المورد */}
            <div className="text-sm">
              <span className="text-gray-500">المورد: </span>
              <span className="font-medium">{rental.supplier_name}</span>
            </div>

            {/* وكيل الحجز */}
            <div className="text-sm">
              <span className="text-gray-500">وكيل الحجز: </span>
              <span>{rental.booking_agent_name}</span>
            </div>

            {/* رخصة القيادة */}
            {rental.driver_license_number && (
              <div className="text-sm bg-gray-50 p-2 rounded">
                <span className="text-gray-500">رخصة القيادة: </span>
                <span className="font-mono">{rental.driver_license_number}</span>
              </div>
            )}

            {/* حالة الوثائق */}
            <div className="flex gap-2 text-xs">
              <Badge variant={rental.contract_sent ? "default" : "secondary"}>
                عقد {rental.contract_sent ? "✓" : "✗"}
              </Badge>
              <Badge variant={rental.invoice_sent ? "default" : "secondary"}>
                فاتورة {rental.invoice_sent ? "✓" : "✗"}
              </Badge>
              <Badge variant={rental.supplier_payment_sent ? "default" : "secondary"}>
                دفع مورد {rental.supplier_payment_sent ? "✓" : "✗"}
              </Badge>
            </div>

            {/* المتطلبات الخاصة */}
            {rental.special_requirements && (
              <div className="text-sm bg-yellow-50 p-2 rounded">
                <div className="font-medium text-yellow-800">متطلبات خاصة:</div>
                <div className="text-yellow-700">{rental.special_requirements}</div>
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
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                عقد
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CarRentalsList;
