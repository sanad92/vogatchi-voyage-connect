
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HotelBooking } from "@/types/hotelBooking";
import { BookingStatus } from "@/types/common";
import BookingStatusSelector from "./BookingStatusSelector";
import BookingActionsPanel from "./BookingActionsPanel";
import DocumentActionsPanel from "./DocumentActionsPanel";

interface BookingCardProps {
  booking: HotelBooking;
  getBookingStatus: (statusId?: string) => BookingStatus | undefined;
  onEdit: (booking: HotelBooking) => void;
  onRefresh: () => void;
  onShowStatusHistory: (bookingId: string) => void;
}

const BookingCard = ({ 
  booking, 
  getBookingStatus, 
  onEdit, 
  onRefresh, 
  onShowStatusHistory 
}: BookingCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-lg">
              {booking.customer_name} - {booking.hotel_name}
            </CardTitle>
            <p className="text-sm text-gray-600">
              رقم الحجز: {booking.internal_booking_number}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">حالة الحجز:</span>
              <BookingStatusSelector 
                bookingId={booking.id}
                currentStatus={getBookingStatus(booking.status_id)}
                onStatusUpdate={onRefresh}
              />
            </div>
          </div>
          <BookingActionsPanel 
            booking={booking}
            onEdit={onEdit}
            onShowStatusHistory={onShowStatusHistory}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">الوجهة</p>
            <p className="font-medium">{booking.destination_city}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">تواريخ الإقامة</p>
            <p className="font-medium">
              {formatDate(booking.check_in_date)} - 
              {formatDate(booking.check_out_date)}
            </p>
            <p className="text-sm text-gray-500">{booking.number_of_nights} ليلة</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">إجمالي التكلفة</p>
            <p className="font-medium text-lg">
              {booking.total_cost_customer?.toFixed(2)} {booking.currency || 'SAR'}
            </p>
            <p className="text-sm text-green-600">
              ربح: {booking.total_profit?.toFixed(2)} {booking.currency || 'SAR'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">تفاصيل الغرفة</p>
            <p>{booking.room_type} - {booking.number_of_adults} بالغ</p>
            {booking.number_of_children > 0 && (
              <p className="text-sm">{booking.number_of_children} طفل</p>
            )}
            <p className="text-sm">نظام الوجبات: {booking.meal_plan}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">المورد</p>
            <p>{booking.supplier_name}</p>
            {booking.booking_reference_supplier && (
              <p className="text-sm">مرجع: {booking.booking_reference_supplier}</p>
            )}
          </div>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">حالة الدفع</p>
            <p>مدفوع: {booking.paid_amount?.toFixed(2) || '0.00'} {booking.currency || 'SAR'}</p>
            <p>متبقي: {booking.remaining_amount?.toFixed(2) || '0.00'} {booking.currency || 'SAR'}</p>
            {booking.payment_due_date && (
              <p className="text-sm text-red-600">
                تاريخ الاستحقاق: {formatDate(booking.payment_due_date)}
              </p>
            )}
          </div>
        </div>

        <DocumentActionsPanel booking={booking} onRefresh={onRefresh} />
      </CardContent>
    </Card>
  );
};

export default BookingCard;
