
import { useState } from "react";
import { HotelBooking } from "@/types/hotelBooking";

export function useHotelBookingsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null);
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  return {
    activeTab, setActiveTab,
    editingBooking, setEditingBooking,
    showPrintInvoice, setShowPrintInvoice,
    showCreateInvoice, setShowCreateInvoice,
    showVoucher, setShowVoucher
  };
}
