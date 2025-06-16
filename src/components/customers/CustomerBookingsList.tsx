
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerBookingCard from "./CustomerBookingCard";
import BookingQuickViewDialog from "./BookingQuickViewDialog";
import { Building, Plane, Car, Bus } from "lucide-react";

interface CustomerBookingsListProps {
  hotelBookings: any[];
  flightBookings: any[];
  transportBookings: any[];
  carRentals: any[];
}

const CustomerBookingsList = ({ 
  hotelBookings, 
  flightBookings, 
  transportBookings, 
  carRentals 
}: CustomerBookingsListProps) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedBookingType, setSelectedBookingType] = useState<'hotel' | 'flight' | 'transport' | 'car_rental' | null>(null);

  // Combine all bookings with type information
  const allBookings = [
    ...hotelBookings.map(booking => ({ ...booking, type: 'hotel' as const })),
    ...flightBookings.map(booking => ({ ...booking, type: 'flight' as const })),
    ...transportBookings.map(booking => ({ ...booking, type: 'transport' as const })),
    ...carRentals.map(booking => ({ ...booking, type: 'car_rental' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter bookings based on active filter
  const filteredBookings = activeFilter === 'all' 
    ? allBookings 
    : allBookings.filter(booking => booking.type === activeFilter);

  const getFilterStats = () => {
    return {
      all: allBookings.length,
      hotel: hotelBookings.length,
      flight: flightBookings.length,
      transport: transportBookings.length,
      car_rental: carRentals.length
    };
  };

  const stats = getFilterStats();

  const filterButtons = [
    { key: 'all', label: 'الكل', icon: null, count: stats.all },
    { key: 'hotel', label: 'فنادق', icon: <Building className="h-4 w-4" />, count: stats.hotel },
    { key: 'flight', label: 'طيران', icon: <Plane className="h-4 w-4" />, count: stats.flight },
    { key: 'transport', label: 'نقل', icon: <Bus className="h-4 w-4" />, count: stats.transport },
    { key: 'car_rental', label: 'سيارات', icon: <Car className="h-4 w-4" />, count: stats.car_rental }
  ];

  const handleBookingClick = (booking: any, type: 'hotel' | 'flight' | 'transport' | 'car_rental') => {
    setSelectedBooking(booking);
    setSelectedBookingType(type);
  };

  if (allBookings.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">لا توجد حجوزات لهذا العميل</div>
        <div className="text-sm text-gray-400">سيتم عرض الحجوزات هنا عند إضافتها</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.key)}
            className="flex items-center gap-2"
          >
            {filter.icon}
            <span>{filter.label}</span>
            <Badge 
              variant={activeFilter === filter.key ? "secondary" : "outline"}
              className="ml-1"
            >
              {filter.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.all}</div>
          <div className="text-sm text-blue-700">إجمالي الحجوزات</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {allBookings.reduce((sum, booking) => {
              const amount = booking.total_cost_customer || booking.total_cost || booking.total_rental_cost || 0;
              return sum + amount;
            }, 0).toLocaleString()}
          </div>
          <div className="text-sm text-green-700">إجمالي الإنفاق</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.hotel}</div>
          <div className="text-sm text-purple-700">حجوزات الفنادق</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.flight}</div>
          <div className="text-sm text-orange-700">حجوزات الطيران</div>
        </div>
      </div>

      {/* Bookings list */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            لا توجد حجوزات من النوع المحدد
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div 
              key={`${booking.type}-${booking.id}`}
              onClick={() => handleBookingClick(booking, booking.type)}
            >
              <CustomerBookingCard
                booking={booking}
                type={booking.type}
              />
            </div>
          ))
        )}
      </div>

      {/* Quick View Dialog */}
      {selectedBooking && selectedBookingType && (
        <BookingQuickViewDialog
          booking={selectedBooking}
          type={selectedBookingType}
          isOpen={!!selectedBooking}
          onClose={() => {
            setSelectedBooking(null);
            setSelectedBookingType(null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerBookingsList;
