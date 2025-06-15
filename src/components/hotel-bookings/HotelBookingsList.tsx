
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking, BookingStatus } from "@/types/hotelBooking";
import BookingCard from "./BookingCard";

interface HotelBookingsListProps {
  bookings: HotelBooking[];
  onEdit: (booking: HotelBooking) => void;
  onRefresh: () => void;
}

const HotelBookingsList = ({ bookings, onEdit, onRefresh }: HotelBookingsListProps) => {
  const [showStatusHistory, setShowStatusHistory] = useState<string | null>(null);

  // Get booking statuses for display
  const { data: statuses = [] } = useQuery({
    queryKey: ['booking-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_statuses')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as BookingStatus[];
    }
  });

  const getBookingStatus = (statusId?: string) => {
    return statuses.find(status => status.id === statusId);
  };

  const handleShowStatusHistory = (bookingId: string) => {
    setShowStatusHistory(bookingId);
  };

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          getBookingStatus={getBookingStatus}
          onEdit={onEdit}
          onRefresh={onRefresh}
          onShowStatusHistory={handleShowStatusHistory}
        />
      ))}
    </div>
  );
};

export default HotelBookingsList;
