
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking } from "@/types/hotelBooking";
import { BookingStatus } from "@/types/common";
import BookingCard from "./BookingCard";
import HotelBookingSearch, { SearchFilters } from "./HotelBookingSearch";
import HotelBookingStats from "./HotelBookingStats";
import HotelBookingEmptyState from "./HotelBookingEmptyState";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { isWithinInterval, parseISO } from "date-fns";

interface HotelBookingsListProps {
  bookings: HotelBooking[];
  onEdit: (booking: HotelBooking) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

const HotelBookingsList = ({ bookings, onEdit, onRefresh, onCreateNew }: HotelBookingsListProps) => {
  const [showStatusHistory, setShowStatusHistory] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: "",
    status: "all",
    dateRange: undefined,
    minAmount: "",
    maxAmount: ""
  });
  const [isSearching, setIsSearching] = useState(false);

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

  // Filter bookings based on search criteria
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search term filter
    if (searchFilters.searchTerm) {
      const term = searchFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customer_name?.toLowerCase().includes(term) ||
        booking.internal_booking_number?.toLowerCase().includes(term) ||
        booking.hotel_name?.toLowerCase().includes(term) ||
        booking.destination_city?.toLowerCase().includes(term) ||
        booking.booking_agent_name?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (searchFilters.status && searchFilters.status !== "all") {
      const statusName = searchFilters.status;
      filtered = filtered.filter(booking => {
        const status = getBookingStatus(booking.status_id);
        return status?.name === statusName;
      });
    }

    // Date range filter
    if (searchFilters.dateRange?.from && searchFilters.dateRange?.to) {
      filtered = filtered.filter(booking => {
        const bookingDate = parseISO(booking.booking_date);
        return isWithinInterval(bookingDate, {
          start: searchFilters.dateRange!.from!,
          end: searchFilters.dateRange!.to!
        });
      });
    }

    // Amount range filter
    if (searchFilters.minAmount) {
      const minAmount = parseFloat(searchFilters.minAmount);
      filtered = filtered.filter(booking => 
        (booking.total_cost_customer || 0) >= minAmount
      );
    }

    if (searchFilters.maxAmount) {
      const maxAmount = parseFloat(searchFilters.maxAmount);
      filtered = filtered.filter(booking => 
        (booking.total_cost_customer || 0) <= maxAmount
      );
    }

    return filtered;
  }, [bookings, searchFilters]);

  const getBookingStatus = (statusId?: string) => {
    return statuses.find(status => status.id === statusId);
  };

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setIsSearching(true);
  };

  const handleClearSearch = () => {
    setSearchFilters({
      searchTerm: "",
      status: "all",
      dateRange: undefined,
      minAmount: "",
      maxAmount: ""
    });
    setIsSearching(false);
  };

  const handleShowStatusHistory = (bookingId: string) => {
    setShowStatusHistory(bookingId);
  };

  const hasActiveFilters = searchFilters.searchTerm || 
    searchFilters.status !== "all" || 
    searchFilters.dateRange || 
    searchFilters.minAmount || 
    searchFilters.maxAmount;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">حجوزات الفنادق</h2>
          <p className="text-gray-600">
            {filteredBookings.length} من {bookings.length} حجز
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            حجز جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <HotelBookingStats bookings={bookings} />

      {/* Search */}
      <HotelBookingSearch 
        onSearch={handleSearch}
        onClear={handleClearSearch}
      />

      {/* Results */}
      {filteredBookings.length === 0 ? (
        <HotelBookingEmptyState 
          onCreateNew={onCreateNew}
          isSearching={hasActiveFilters}
          onClearSearch={hasActiveFilters ? handleClearSearch : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
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
      )}
    </div>
  );
};

export default HotelBookingsList;
