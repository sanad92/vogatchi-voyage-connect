
import React from "react";
import FlightInvoiceCreator from "@/components/flight-bookings/FlightInvoiceCreator";
import { FlightBooking } from "@/types/flightBooking";

interface Props {
  open: boolean;
  booking: FlightBooking;
  onClose: () => void;
}

const FlightInvoiceDialog: React.FC<Props> = ({ open, booking, onClose }) => {
  if (!open) return null;
  return (
    <FlightInvoiceCreator booking={booking} open={open} onClose={onClose} />
  );
};

export default FlightInvoiceDialog;
