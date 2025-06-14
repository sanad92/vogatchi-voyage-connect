
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users } from 'lucide-react';

interface Booking {
  id: string;
  booking_reference: string;
  check_in_date: string | null;
  check_out_date: string | null;
  number_of_nights: number | null;
  number_of_guests: number | null;
  supplier_cost: number;
  selling_price: number;
  profit_margin: number;
  status: string | null;
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  services: {
    id: string;
    name: string;
    type: string;
    location: string | null;
    supplier_id: string;
    service_category: string | null;
    suppliers: {
      name: string;
    };
  };
}

interface BookingCardProps {
  booking: Booking;
}

const BookingCard = ({ booking }: BookingCardProps) => {
  const getStatusColor = (status: string | null) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string | null) => {
    const labels = {
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      cancelled: "ملغي",
      completed: "مكتمل"
    };
    return labels[status as keyof typeof labels] || status || "غير محدد";
  };

  const getServiceCategoryLabel = (category: string | null) => {
    const labels = {
      hotel: "فندق",
      flight: "طيران",
      transfer: "انتقالات",
      car_rental: "إيجار سيارة",
      local_tour: "رحلة داخلية",
      other: "أخرى"
    };
    return labels[category as keyof typeof labels] || "غير محدد";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="font-bold text-lg">{booking.booking_reference}</p>
            <p className="text-sm text-gray-600">{booking.customers.name}</p>
            <p className="text-sm text-gray-600">{booking.customers.phone}</p>
          </div>
          
          <div>
            <p className="font-medium">{booking.services.name}</p>
            <p className="text-sm text-gray-600">
              {getServiceCategoryLabel(booking.services.service_category)}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {booking.services.location || "غير محدد"}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Users className="w-4 h-4" />
              {booking.number_of_guests} ضيف
            </p>
          </div>

          <div>
            {booking.check_in_date && (
              <p className="text-sm">
                <span className="font-medium">الوصول:</span> {booking.check_in_date}
              </p>
            )}
            {booking.check_out_date && (
              <p className="text-sm">
                <span className="font-medium">المغادرة:</span> {booking.check_out_date}
              </p>
            )}
            {booking.number_of_nights && (
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {booking.number_of_nights} ليلة
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Badge className={getStatusColor(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">التكلفة:</span> {booking.supplier_cost} جنيه</p>
              <p><span className="font-medium">السعر:</span> {booking.selling_price} جنيه</p>
              <p className={`font-bold ${booking.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>الربح:</span> {booking.profit_margin} جنيه
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingCard;
