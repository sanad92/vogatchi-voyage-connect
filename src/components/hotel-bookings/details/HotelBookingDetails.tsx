
import React from "react";
import { HotelBooking } from "@/types/hotelBooking";

interface Props {
  booking: HotelBooking;
}

const HotelBookingDetails: React.FC<Props> = ({ booking }) => {
  if (!booking) return null;

  return (
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
  );
};

export default HotelBookingDetails;
