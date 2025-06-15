
import React from "react";
import HotelInvoiceCreator from "@/components/hotel-bookings/HotelInvoiceCreator";
import { HotelBooking } from "@/types/hotelBooking";

interface Props {
  open: boolean;
  booking: HotelBooking;
  onClose: () => void;
}

const HotelInvoiceDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  if (!open) return null;
  return (
    <HotelInvoiceCreator booking={booking} open={open} onClose={onClose} />
  );
};

export default HotelInvoiceDialog;
