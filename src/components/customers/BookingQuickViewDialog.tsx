
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plane, Car, Building, Bus, ExternalLink, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookingQuickViewDialogProps {
  booking: any;
  type: 'hotel' | 'flight' | 'transport' | 'car_rental';
  isOpen: boolean;
  onClose: () => void;
}

const BookingQuickViewDialog = ({ booking, type, isOpen, onClose }: BookingQuickViewDialogProps) => {
  const navigate = useNavigate();

  if (!booking) return null;

  const getBookingIcon = () => {
    switch (type) {
      case 'hotel':
        return <Building className="h-5 w-5" />;
      case 'flight':
        return <Plane className="h-5 w-5" />;
      case 'transport':
        return <Bus className="h-5 w-5" />;
      case 'car_rental':
        return <Car className="h-5 w-5" />;
      default:
        return <Building className="h-5 w-5" />;
    }
  };

  const getBookingTypeLabel = () => {
    switch (type) {
      case 'hotel':
        return 'حجز فندق';
      case 'flight':
        return 'حجز طيران';
      case 'transport':
        return 'حجز نقل';
      case 'car_rental':
        return 'إيجار سيارة';
      default:
        return 'حجز';
    }
  };

  const handleViewFullDetails = () => {
    const routes = {
      hotel: '/hotel-bookings',
      flight: '/flight-bookings',
      transport: '/transport-bookings',
      car_rental: '/car-rentals'
    };

    navigate(`${routes[type]}?bookingId=${booking.id}`);
    onClose();
  };

  const renderBookingDetails = () => {
    switch (type) {
      case 'hotel':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">اسم الفندق</label>
                <p className="text-sm">{booking.hotel_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">المدينة</label>
                <p className="text-sm">{booking.destination_city}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ الوصول</label>
                <p className="text-sm">{new Date(booking.check_in_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ المغادرة</label>
                <p className="text-sm">{new Date(booking.check_out_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">عدد الليالي</label>
                <p className="text-sm">{booking.number_of_nights} ليلة</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">نوع الغرفة</label>
                <p className="text-sm">{booking.room_type}</p>
              </div>
            </div>
          </div>
        );
      
      case 'flight':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">مطار المغادرة</label>
                <p className="text-sm">{booking.departure_airport?.city}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">مطار الوصول</label>
                <p className="text-sm">{booking.arrival_airport?.city}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ المغادرة</label>
                <p className="text-sm">{new Date(booking.departure_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">شركة الطيران</label>
                <p className="text-sm">{booking.airline?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">عدد المسافرين</label>
                <p className="text-sm">{booking.number_of_passengers} مسافر</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">رقم الرحلة</label>
                <p className="text-sm">{booking.flight_number || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        );
      
      case 'transport':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">اسم الرحلة</label>
                <p className="text-sm">{booking.route?.route_name_ar || booking.route?.route_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">نوع المركبة</label>
                <p className="text-sm">{booking.vehicle_type?.name_ar || booking.vehicle_type?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ الخدمة</label>
                <p className="text-sm">{new Date(booking.service_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">عدد المسافرين</label>
                <p className="text-sm">{booking.number_of_passengers || 'غير محدد'}</p>
              </div>
            </div>
          </div>
        );
      
      case 'car_rental':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">نوع السيارة</label>
                <p className="text-sm">{booking.vehicle_make} {booking.vehicle_model}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">مكان الاستلام</label>
                <p className="text-sm">{booking.pickup_location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">مكان التسليم</label>
                <p className="text-sm">{booking.return_location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">فترة الإيجار</label>
                <p className="text-sm">{booking.rental_duration_days} يوم</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ الاستلام</label>
                <p className="text-sm">{new Date(booking.rental_start_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ التسليم</label>
                <p className="text-sm">{new Date(booking.rental_end_date).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return <p>تفاصيل الحجز غير متوفرة</p>;
    }
  };

  const getAmount = () => {
    switch (type) {
      case 'hotel':
        return booking.total_cost_customer;
      case 'flight':
        return booking.total_cost;
      case 'transport':
        return booking.total_cost;
      case 'car_rental':
        return booking.total_rental_cost;
      default:
        return 0;
    }
  };

  const getReference = () => {
    switch (type) {
      case 'hotel':
        return booking.internal_booking_number;
      case 'flight':
        return booking.booking_reference;
      case 'transport':
        return booking.booking_reference;
      case 'car_rental':
        return booking.rental_reference;
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getBookingIcon()}
            {getBookingTypeLabel()} - {getReference()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                {booking.status && (
                  <Badge variant={booking.status.color?.includes('green') ? 'default' : 'outline'}>
                    {booking.status.name_ar || booking.status.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                تم الإنشاء في {new Date(booking.created_at).toLocaleDateString('ar-EG')}
              </p>
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-gray-900">
                {getAmount()?.toLocaleString()} {booking.currency || 'EGP'}
              </div>
            </div>
          </div>

          {/* تفاصيل الحجز */}
          {renderBookingDetails()}

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleViewFullDetails} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              عرض التفاصيل الكاملة
            </Button>
            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingQuickViewDialog;
