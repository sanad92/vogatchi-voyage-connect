
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plane, Car, Building, Bus } from "lucide-react";

interface BookingStatus {
  name: string;
  name_ar: string;
  color: string;
}

interface CustomerBookingCardProps {
  booking: any;
  type: 'hotel' | 'flight' | 'transport' | 'car_rental';
}

const CustomerBookingCard = ({ booking, type }: CustomerBookingCardProps) => {
  const getBookingIcon = () => {
    switch (type) {
      case 'hotel':
        return <Building className="h-4 w-4" />;
      case 'flight':
        return <Plane className="h-4 w-4" />;
      case 'transport':
        return <Bus className="h-4 w-4" />;
      case 'car_rental':
        return <Car className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
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

  const getBookingDetails = () => {
    switch (type) {
      case 'hotel':
        return {
          title: booking.hotel_name,
          subtitle: booking.destination_city,
          dates: `${new Date(booking.check_in_date).toLocaleDateString('ar-EG')} - ${new Date(booking.check_out_date).toLocaleDateString('ar-EG')}`,
          reference: booking.internal_booking_number,
          amount: booking.total_cost_customer
        };
      case 'flight':
        return {
          title: `${booking.departure_airport?.city} → ${booking.arrival_airport?.city}`,
          subtitle: booking.airline?.name,
          dates: new Date(booking.departure_date).toLocaleDateString('ar-EG'),
          reference: booking.booking_reference,
          amount: booking.total_cost
        };
      case 'transport':
        return {
          title: booking.route?.route_name_ar || booking.route?.route_name,
          subtitle: booking.vehicle_type?.name_ar || booking.vehicle_type?.name,
          dates: new Date(booking.service_date).toLocaleDateString('ar-EG'),
          reference: booking.booking_reference,
          amount: booking.total_cost
        };
      case 'car_rental':
        return {
          title: `${booking.vehicle_make} ${booking.vehicle_model}`,
          subtitle: `${booking.pickup_location} → ${booking.return_location}`,
          dates: `${new Date(booking.rental_start_date).toLocaleDateString('ar-EG')} - ${new Date(booking.rental_end_date).toLocaleDateString('ar-EG')}`,
          reference: booking.rental_reference,
          amount: booking.total_rental_cost
        };
      default:
        return {
          title: 'حجز',
          subtitle: '',
          dates: '',
          reference: '',
          amount: 0
        };
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    if (!status) {
      return <Badge variant="outline">غير محدد</Badge>;
    }

    const variant = status.color?.includes('green') ? 'default' : 
                   status.color?.includes('red') ? 'destructive' : 
                   status.color?.includes('yellow') ? 'secondary' : 'outline';

    return <Badge variant={variant}>{status.name_ar || status.name}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const details = getBookingDetails();

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
              {getBookingIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {getBookingTypeLabel()}
                </span>
                {booking.status && getStatusBadge(booking.status)}
              </div>
              
              <h4 className="font-medium text-gray-900 truncate">{details.title}</h4>
              
              {details.subtitle && (
                <p className="text-sm text-gray-600 truncate">{details.subtitle}</p>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {details.dates && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{details.dates}</span>
                  </div>
                )}
                
                {details.reference && (
                  <span className="font-mono">{details.reference}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-left flex-shrink-0">
            <div className="text-sm font-medium text-gray-900">
              {details.amount?.toLocaleString()} {booking.currency || 'EGP'}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(booking.created_at)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerBookingCard;
