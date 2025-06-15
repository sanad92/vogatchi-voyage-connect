
import { useState } from "react";
import { FlightBooking } from "@/types/flightBooking";

export function useFlightBookingsPage() {
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  return {
    showPrintInvoice, setShowPrintInvoice,
    showCreateInvoice, setShowCreateInvoice,
    showVoucher, setShowVoucher
  };
}
