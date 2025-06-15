
import React from "react";
// يمكن استبدال هذا بمكون خاص للفاوتشر مستقبلاً
import { FlightBooking } from "@/types/flightBooking";

interface Props {
  open: boolean;
  booking: FlightBooking;
  onClose: () => void;
}

const FlightVoucherDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full relative">
        <button
          aria-label="إغلاق"
          className="absolute top-2 left-2 text-gray-400 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        {/* فقط placeholder، ويمكن إضافة FlightVoucherGenerator لاحقًا */}
        <div>
          <h2 className="text-lg font-bold mb-2">فاوتشر حجز الطيران</h2>
          <p><strong>اسم العميل:</strong> {booking.customer_name}</p>
          <p><strong>رقم الحجز:</strong> {booking.booking_reference}</p>
          <p><strong>شركة الطيران:</strong> {booking.airline?.name}</p>
          <p><strong>من:</strong> {booking.departure_airport?.name}</p>
          <p><strong>إلى:</strong> {booking.arrival_airport?.name}</p>
          {/* يمكن إضافة باقي التفاصيل حسب الحاجة */}
        </div>
      </div>
    </div>
  );
};

export default FlightVoucherDialog;
