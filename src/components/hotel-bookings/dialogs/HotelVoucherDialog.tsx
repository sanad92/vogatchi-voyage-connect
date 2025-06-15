
import React from "react";
import HotelVoucherGenerator from "@/components/hotel-bookings/HotelVoucherGenerator";
import { HotelBooking } from "@/types/hotelBooking";

interface Props {
  open: boolean;
  booking: HotelBooking;
  onClose: () => void;
}

const HotelVoucherDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full relative">
        <button
          aria-label="إغلاق"
          className="absolute top-2 left-2 text-gray-400 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        <HotelVoucherGenerator booking={booking} onClose={onClose} />
      </div>
    </div>
  );
};

export default HotelVoucherDialog;
