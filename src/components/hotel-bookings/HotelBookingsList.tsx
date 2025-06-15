import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Edit, Eye, FileText, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HotelBooking } from "@/types/hotelBooking";
import HotelInvoiceCreator from "./HotelInvoiceCreator"; // إضافة الاستيراد

const HotelBookingsList = ({ bookings, onEdit, onRefresh, onCreateNew }: any) => {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);

  const handleOpenInvoiceDialog = (booking: any) => {
    setInvoiceBooking(booking);
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceDialogClose = () => {
    setInvoiceDialogOpen(false);
    setInvoiceBooking(null);
    if(onRefresh) onRefresh();
  };

  return (
    <div className="space-y-4">
      {bookings.map((booking: any) => (
        <div key={booking.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center border">
          <div>
            <div className="font-semibold">{booking.customer_name || "عميل"}</div>
            <div className="text-gray-600">رقم الحجز: {booking.internal_booking_number}</div>
            <div className="text-gray-500 text-xs">{booking.hotel_name} - {booking.destination_city}</div>
            <div className="text-gray-500 text-xs">الحالة: {booking.invoice_sent ? "تم إصدار فاتورة" : "بدون فاتورة"}</div>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition disabled:opacity-60"
              disabled={!!booking.invoice_sent}
              onClick={() => handleOpenInvoiceDialog(booking)}
            >
              إصدار فاتورة
            </button>
            {/* زر تعديل الحجز موجود مسبقاً في onEdit */}
            <button
              className="border border-gray-300 px-4 py-1 rounded hover:bg-gray-100"
              onClick={() => onEdit && onEdit(booking)}
            >
              تفاصيل
            </button>
          </div>
        </div>
      ))}

      {invoiceDialogOpen && invoiceBooking && (
        <HotelInvoiceCreator
          booking={invoiceBooking}
          open={invoiceDialogOpen}
          onClose={handleInvoiceDialogClose}
        />
      )}
    </div>
  );
};

export default HotelBookingsList;
