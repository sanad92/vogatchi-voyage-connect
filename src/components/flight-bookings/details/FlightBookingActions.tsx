
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Ban, RotateCcw } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";
import CancelBookingDialog from "../dialogs/CancelBookingDialog";
import RefundBookingDialog from "../dialogs/RefundBookingDialog";

interface Props {
  booking: FlightBooking;
  onBack: () => void;
  onEdit: () => void;
  onInvoice: () => void;
  onPrint: () => void;
  onVoucher: () => void;
}

const FlightBookingActions: React.FC<Props> = ({
  booking, onBack, onEdit, onInvoice, onPrint, onVoucher
}) => {
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  const isCancellable = !["ملغي", "مسترد"].includes(booking.booking_status?.name_ar || "") && !booking.invoice_sent;
  const isRefundable = (booking.booking_status?.name_ar === "ملغي" || booking.booking_status?.name_ar?.toLowerCase() === "cancelled") && (booking.paid_amount || 0) > 0 && booking.booking_status?.name_ar !== "مسترد";

  return (
    <div className="mt-6 flex flex-wrap gap-2 justify-end">
      <Button variant="outline" onClick={onBack}>
        رجوع للقائمة
      </Button>
      <Button onClick={onEdit}>
        تعديل الحجز
      </Button>
      {!booking.invoice_sent && (
        <Button variant="secondary" onClick={onInvoice}>
          <FileText className="h-4 w-4 ml-1" />
          إصدار فاتورة
        </Button>
      )}
      {booking.invoice_sent && (
        <Button variant="secondary" onClick={onPrint}>
          <Printer className="h-4 w-4 ml-1" />
          طباعة الفاتورة
        </Button>
      )}
      <Button variant="outline" onClick={onVoucher}>
        <FileText className="h-4 w-4 ml-1" />
        إنشاء فاوتشر
      </Button>
      {isCancellable && (
        <Button variant="destructive" onClick={() => setShowCancel(true)}>
          <Ban className="h-4 w-4 ml-1" />
          إلغاء الحجز
        </Button>
      )}
      {isRefundable && (
        <Button variant="secondary" onClick={() => setShowRefund(true)}>
          <RotateCcw className="h-4 w-4 ml-1" />
          استرداد الحجز
        </Button>
      )}
      {/* Dialogs */}
      <CancelBookingDialog
        open={showCancel}
        bookingId={booking.id}
        onClose={() => setShowCancel(false)}
      />
      <RefundBookingDialog
        open={showRefund}
        bookingId={booking.id}
        onClose={() => setShowRefund(false)}
      />
    </div>
  );
};

export default FlightBookingActions;
