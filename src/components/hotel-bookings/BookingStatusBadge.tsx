
import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/types/hotelBooking";

interface BookingStatusBadgeProps {
  status?: BookingStatus;
  className?: string;
}

const BookingStatusBadge = ({ status, className = "" }: BookingStatusBadgeProps) => {
  if (!status) {
    return (
      <Badge variant="secondary" className={className}>
        غير محدد
      </Badge>
    );
  }

  return (
    <Badge 
      className={`${className}`}
      style={{ 
        backgroundColor: status.color,
        color: 'white',
        border: 'none'
      }}
    >
      {status.name_ar}
    </Badge>
  );
};

export default BookingStatusBadge;
