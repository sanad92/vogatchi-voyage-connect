
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Printer } from "lucide-react";
import { FlightBooking } from "@/types/flightBooking";

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
    </div>
  );
};

export default FlightBookingActions;
