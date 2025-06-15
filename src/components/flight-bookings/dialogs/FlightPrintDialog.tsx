
import React from "react";
import FlightInvoiceCreator from "@/components/flight-bookings/FlightInvoiceCreator";
import { FlightBooking } from "@/types/flightBooking";

interface Props {
  open: boolean;
  booking: FlightBooking;
  onClose: () => void;
}

const FlightPrintDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  // لاحقًا يمكن استبدال هذا بـ "FlightInvoiceGenerator" إن وجد
  if (!open) return null;
  return <FlightInvoiceCreator booking={booking} open={open} onClose={onClose} printMode />;
};

export default FlightPrintDialog;
