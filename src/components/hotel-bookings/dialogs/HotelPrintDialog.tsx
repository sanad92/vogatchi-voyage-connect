
import React from "react";
import HotelInvoiceGenerator from "@/components/hotel-bookings/HotelInvoiceGenerator";
import { HotelBooking } from "@/types/hotelBooking";

interface Props {
  open: boolean;
  booking: HotelBooking;
  onClose: () => void;
}

const HotelPrintDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  if (!open) return null;
  return <HotelInvoiceGenerator booking={booking} onClose={onClose} />;
};

export default HotelPrintDialog;
