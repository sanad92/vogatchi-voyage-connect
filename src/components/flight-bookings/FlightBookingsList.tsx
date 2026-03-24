
import React, { useState } from "react";
import { FlightBooking } from "@/types/flightBooking";
import { useFlightBookings } from "@/hooks/useFlightBookings";
import { useClientPagination } from "@/hooks/useClientPagination";
import PaginationControlsUI from "@/components/ui/pagination-controls";
import FlightBookingSearch from "./FlightBookingSearch";
import FlightBookingStats from "./FlightBookingStats";
import FlightBookingCard from "./FlightBookingCard";
import FlightBookingEmptyState from "./FlightBookingEmptyState";

interface FlightBookingsListProps {
  onCreateNew?: () => void;
  onEditBooking?: (booking: FlightBooking) => void;
}

const FlightBookingsList = ({ onCreateNew, onEditBooking }: FlightBookingsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { flightBookings, bookingsLoading } = useFlightBookings();
  const { paginatedItems, pagination } = useClientPagination(flightBookings || [], 12);

  if (bookingsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">جاري تحميل حجوزات الطيران...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FlightBookingSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateNew={onCreateNew || (() => {})}
      />

      <FlightBookingStats bookings={flightBookings || []} />

      {!flightBookings || flightBookings.length === 0 ? (
        <FlightBookingEmptyState onCreateNew={onCreateNew || (() => {})} />
      ) : (
        <div className="grid gap-4">
          {paginatedItems.map((booking) => (
            <FlightBookingCard
              key={booking.id}
              booking={booking}
              onEdit={onEditBooking}
            />
          ))}
        </div>
      )}

      <PaginationControlsUI pagination={pagination} />
    </div>
  );
};

export default FlightBookingsList;
