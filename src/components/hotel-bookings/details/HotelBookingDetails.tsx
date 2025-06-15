
import React, { useState } from "react";
import { HotelBooking } from "@/types/hotelBooking";
import { Button } from "@/components/ui/button";
import { Ban, RotateCcw } from "lucide-react";
import CancelBookingDialog from "../dialogs/CancelBookingDialog";
import RefundBookingDialog from "../dialogs/RefundBookingDialog";

interface Props {
  booking: HotelBooking;
}

const HotelBookingDetails: React.FC<Props> = ({ booking }) => {
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  // شروط ظهور الأزرار
  const isCancellable =
    !["ملغي", "مسترد"].includes(booking.booking_status?.name_ar || "") &&
    !booking.invoice_sent;
  const isRefundable =
    (booking.booking_status?.name_ar === "ملغي" ||
      booking.booking_status?.name_ar?.toLowerCase() === "cancelled") &&
    (booking.paid_amount || 0) > 0 &&
    booking.booking_status?.name_ar !== "مسترد";

  if (!booking) return null;

  return (
    <div>
      {/* أزرار الإلغاء والاسترداد أعلى التفاصيل */}
      <div className="flex flex-wrap gap-3 justify-end mb-6 border-b pb-4">
        {isCancellable && (
          <>
            <Button
              variant="destructive"
              className="flex items-center gap-2 shadow hover:scale-105 transition-transform"
              onClick={() => setShowCancel(true)}
            >
              <Ban className="h-4 w-4" />
              إلغاء الحجز
            </Button>
            <CancelBookingDialog
              open={showCancel}
              bookingId={booking.id}
              onClose={() => setShowCancel(false)}
            />
          </>
        )}
        {isRefundable && (
          <>
            <Button
              variant="secondary"
              className="flex items-center gap-2 bg-yellow-400 text-black border-yellow-500 shadow hover:bg-yellow-500 hover:scale-105 transition-all"
              onClick={() => setShowRefund(true)}
            >
              <RotateCcw className="h-4 w-4" />
              استرداد الحجز
            </Button>
            <RefundBookingDialog
              open={showRefund}
              bookingId={booking.id}
              onClose={() => setShowRefund(false)}
            />
          </>
        )}
      </div>

      {/* باقي تفاصيل الحجز */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات العميل */}
        <div>
          <h3 className="text-lg font-semibold mb-3">معلومات العميل</h3>
          <div className="space-y-2 text-sm">
            <p><strong>اسم العميل:</strong> {booking.customer_name}</p>
            <p><strong>وكيل الحجز:</strong> {booking.booking_agent_name}</p>
            <p><strong>رقم الحجز:</strong> {booking.internal_booking_number}</p>
            <p><strong>تاريخ الحجز:</strong> {booking.booking_date}</p>
          </div>
        </div>
        {/* تفاصيل الفندق */}
        <div>
          <h3 className="text-lg font-semibold mb-3">تفاصيل الفندق</h3>
          <div className="space-y-2 text-sm">
            <p><strong>اسم الفندق:</strong> {booking.hotel_name}</p>
            <p><strong>المدينة:</strong> {booking.destination_city}</p>
            <p><strong>نوع الغرفة:</strong> {booking.room_type}</p>
            <p><strong>خطة الوجبات:</strong> {booking.meal_plan}</p>
            <p><strong>تقييم الفندق:</strong> {booking.hotel_star_rating} نجوم</p>
          </div>
        </div>
        {/* تفاصيل الإقامة */}
        <div>
          <h3 className="text-lg font-semibold mb-3">تفاصيل الإقامة</h3>
          <div className="space-y-2 text-sm">
            <p><strong>تاريخ الوصول:</strong> {booking.check_in_date}</p>
            <p><strong>تاريخ المغادرة:</strong> {booking.check_out_date}</p>
            <p><strong>عدد الليالي:</strong> {booking.number_of_nights}</p>
            <p><strong>عدد البالغين:</strong> {booking.number_of_adults}</p>
            <p><strong>عدد الأطفال:</strong> {booking.number_of_children}</p>
          </div>
        </div>
        {/* المعلومات المالية */}
        <div>
          <h3 className="text-lg font-semibold mb-3">المعلومات المالية</h3>
          <div className="space-y-2 text-sm">
            <p><strong>سعر البيع/ليلة:</strong> {booking.selling_price_per_night} {booking.currency}</p>
            <p><strong>التكلفة/ليلة:</strong> {booking.cost_per_night} {booking.currency}</p>
            <p><strong>إجمالي المبلغ:</strong> {booking.total_cost_customer} {booking.currency}</p>
            <p><strong>الربح الإجمالي:</strong> {booking.total_profit} {booking.currency}</p>
            <p><strong>المبلغ المدفوع:</strong> {booking.paid_amount} {booking.currency}</p>
            <p><strong>المتبقي:</strong> {booking.remaining_amount} {booking.currency}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelBookingDetails;

