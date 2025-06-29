
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import HotelInvoiceCreator from "./HotelInvoiceCreator";
import HotelBookingSearch, { SearchFilters } from "./HotelBookingSearch";
import HotelBookingStats from "./HotelBookingStats";
import { HotelBooking } from "@/types/hotelBooking";

interface HotelBookingsListProps {
  bookings: HotelBooking[];
  onEdit: (booking: HotelBooking) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

const HotelBookingsList = ({ bookings, onEdit, onRefresh, onCreateNew }: HotelBookingsListProps) => {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState<HotelBooking | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: '',
    status: 'all',
    dateRange: undefined,
    minAmount: '',
    maxAmount: ''
  });

  const filteredBookings = useMemo(() => {
    try {
      let filtered = [...(bookings || [])];

      // Search term filter
      if (searchFilters.searchTerm.trim()) {
        const searchLower = searchFilters.searchTerm.toLowerCase().trim();
        filtered = filtered.filter(booking => 
          booking.customer_name?.toLowerCase().includes(searchLower) ||
          booking.internal_booking_number?.toLowerCase().includes(searchLower) ||
          booking.hotel_name?.toLowerCase().includes(searchLower) ||
          booking.destination_city?.toLowerCase().includes(searchLower) ||
          booking.booking_reference_supplier?.toLowerCase().includes(searchLower)
        );
      }

      // Status filter
      if (searchFilters.status !== 'all') {
        filtered = filtered.filter(booking => {
          if (searchFilters.status === 'confirmed') {
            return booking.status_id && booking.status_id !== 'cancelled';
          }
          if (searchFilters.status === 'pending') {
            return !booking.status_id || booking.status_id === 'pending';
          }
          if (searchFilters.status === 'cancelled') {
            return booking.status_id === 'cancelled';
          }
          if (searchFilters.status === 'completed') {
            return booking.status_id === 'completed';
          }
          return true;
        });
      }

      // Date range filter
      if (searchFilters.dateRange?.from && searchFilters.dateRange?.to) {
        filtered = filtered.filter(booking => {
          try {
            const checkInDate = new Date(booking.check_in_date);
            return checkInDate >= searchFilters.dateRange!.from! && 
                   checkInDate <= searchFilters.dateRange!.to!;
          } catch (error) {
            console.warn('تاريخ غير صالح في الحجز:', booking.id);
            return false;
          }
        });
      }

      // Amount filters
      if (searchFilters.minAmount) {
        const minAmount = parseFloat(searchFilters.minAmount);
        if (!isNaN(minAmount)) {
          filtered = filtered.filter(booking => 
            (booking.total_cost_customer || 0) >= minAmount
          );
        }
      }

      if (searchFilters.maxAmount) {
        const maxAmount = parseFloat(searchFilters.maxAmount);
        if (!isNaN(maxAmount)) {
          filtered = filtered.filter(booking => 
            (booking.total_cost_customer || 0) <= maxAmount
          );
        }
      }

      return filtered;
    } catch (error) {
      console.error('خطأ في فلترة الحجوزات:', error);
      return bookings || [];
    }
  }, [bookings, searchFilters]);

  const handleOpenInvoiceDialog = (booking: HotelBooking) => {
    setInvoiceBooking(booking);
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceDialogClose = () => {
    setInvoiceDialogOpen(false);
    setInvoiceBooking(null);
    if(onRefresh) onRefresh();
  };

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  const handleClearFilters = () => {
    setSearchFilters({
      searchTerm: '',
      status: 'all',
      dateRange: undefined,
      minAmount: '',
      maxAmount: ''
    });
  };

  return (
    <div className="space-y-6">
      <HotelBookingStats bookings={bookings || []} />
      
      <HotelBookingSearch 
        onSearch={handleSearch}
        onClear={handleClearFilters}
      />

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          عرض {filteredBookings.length} من أصل {(bookings || []).length} حجز
        </div>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          حجز جديد
        </Button>
      </div>

      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchFilters.searchTerm || searchFilters.status !== 'all' || 
             searchFilters.dateRange || searchFilters.minAmount || searchFilters.maxAmount
              ? "لا توجد حجوزات تطابق معايير البحث"
              : "لا توجد حجوزات فنادق حتى الآن"}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center border">
              <div>
                <div className="font-semibold">{booking.customer_name || "عميل"}</div>
                <div className="text-gray-600">رقم الحجز: {booking.internal_booking_number}</div>
                <div className="text-gray-500 text-xs">{booking.hotel_name} - {booking.destination_city}</div>
                <div className="text-gray-500 text-xs">
                  التواريخ: {new Date(booking.check_in_date).toLocaleDateString('ar-EG')} - {new Date(booking.check_out_date).toLocaleDateString('ar-EG')}
                </div>
                <div className="text-gray-500 text-xs">الحالة: {booking.invoice_sent ? "تم إصدار فاتورة" : "بدون فاتورة"}</div>
                <div className="text-gray-500 text-xs">
                  المبلغ: {(booking.total_cost_customer || 0).toLocaleString()} {booking.currency || 'EGP'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition disabled:opacity-60"
                  disabled={!!booking.invoice_sent}
                  onClick={() => handleOpenInvoiceDialog(booking)}
                >
                  إصدار فاتورة
                </button>
                <button
                  className="border border-gray-300 px-4 py-1 rounded hover:bg-gray-100"
                  onClick={() => onEdit && onEdit(booking)}
                >
                  تفاصيل
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {invoiceDialogOpen && invoiceBooking && (
        <HotelInvoiceCreator
          booking={invoiceBooking}
          open={invoiceDialogOpen}
          onClose={handleInvoiceDialogClose}
        />
      )}
    </div>
  );
};

export default HotelBookingsList;
