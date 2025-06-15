
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Send, Printer, CheckCircle, Receipt, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking } from "@/types/hotelBooking";
import HotelInvoiceGenerator from "./HotelInvoiceGenerator";
import HotelVoucherGenerator from "./HotelVoucherGenerator";
import HotelSupplierPaymentGenerator from "./HotelSupplierPaymentGenerator";
import HotelInvoiceCreator from "./HotelInvoiceCreator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DocumentActionsPanelProps {
  booking: HotelBooking;
  onRefresh: () => void;
}

const DocumentActionsPanel = ({ booking, onRefresh }: DocumentActionsPanelProps) => {
  const [selectedBooking, setSelectedBooking] = useState<HotelBooking | null>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'voucher' | 'payment' | null>(null);
  const [showInvoiceCreator, setShowInvoiceCreator] = useState<HotelBooking | null>(null);
  const [showVoucherGenerator, setShowVoucherGenerator] = useState<HotelBooking | null>(null);

  const updateDocumentStatus = async (bookingId: string, field: string, value: boolean) => {
    try {
      const updateData: any = { [field]: value };
      if (value) {
        updateData[`${field}_date`] = new Date().toISOString();
      }

      const { error } = await supabase
        .from('hotel_bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;
      onRefresh();
      toast.success('تم تحديث حالة الوثيقة');
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('خطأ في تحديث الحالة');
    }
  };

  const handlePrintDocument = (booking: HotelBooking, type: 'invoice' | 'voucher' | 'payment') => {
    setSelectedBooking(booking);
    setDocumentType(type);
  };

  const handleCreateInvoice = (booking: HotelBooking) => {
    setShowInvoiceCreator(booking);
  };

  const handleCreateVoucher = (booking: HotelBooking) => {
    setShowVoucherGenerator(booking);
  };

  const closePrintModal = () => {
    setSelectedBooking(null);
    setDocumentType(null);
  };

  const closeInvoiceCreator = () => {
    setShowInvoiceCreator(null);
    onRefresh();
  };

  const closeVoucherGenerator = () => {
    setShowVoucherGenerator(null);
    onRefresh();
  };

  return (
    <>
      {/* Document Status */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">حالة الوثائق</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Invoice */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">فاتورة العميل</span>
              {booking.invoice_sent && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex gap-1">
              {!booking.invoice_sent && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleCreateInvoice(booking)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Receipt className="h-3 w-3 mr-1" />
                  إصدار
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrintDocument(booking, 'invoice')}
              >
                <Printer className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={booking.invoice_sent ? "default" : "outline"}
                onClick={() => updateDocumentStatus(booking.id, 'invoice_sent', !booking.invoice_sent)}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Voucher */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="text-sm">فاوتشر الحجز</span>
              {booking.voucher_sent && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex gap-1">
              {!booking.voucher_sent && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleCreateVoucher(booking)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Ticket className="h-3 w-3 mr-1" />
                  إصدار فاوتشر
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrintDocument(booking, 'voucher')}
              >
                <Printer className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={booking.voucher_sent ? "default" : "outline"}
                onClick={() => updateDocumentStatus(booking.id, 'voucher_sent', !booking.voucher_sent)}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Supplier Payment */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">أمر دفع المورد</span>
              {booking.supplier_payment_sent && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrintDocument(booking, 'payment')}
              >
                <Printer className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant={booking.supplier_payment_sent ? "default" : "outline"}
                onClick={() => updateDocumentStatus(booking.id, 'supplier_payment_sent', !booking.supplier_payment_sent)}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Creator Modal */}
      {showInvoiceCreator && (
        <HotelInvoiceCreator 
          booking={showInvoiceCreator} 
          open={!!showInvoiceCreator}
          onClose={closeInvoiceCreator}
        />
      )}

      {/* Voucher Generator Modal */}
      {showVoucherGenerator && (
        <Dialog open={!!showVoucherGenerator} onOpenChange={closeVoucherGenerator}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                إصدار فاوتشر الحجز - {showVoucherGenerator.internal_booking_number}
              </DialogTitle>
            </DialogHeader>
            <HotelVoucherGenerator 
              booking={showVoucherGenerator} 
              onClose={closeVoucherGenerator}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Document Generation Modals */}
      {selectedBooking && documentType === 'invoice' && (
        <HotelInvoiceGenerator 
          booking={selectedBooking} 
          onClose={closePrintModal}
        />
      )}
      {selectedBooking && documentType === 'voucher' && (
        <HotelVoucherGenerator 
          booking={selectedBooking} 
          onClose={closePrintModal}
        />
      )}
      {selectedBooking && documentType === 'payment' && (
        <HotelSupplierPaymentGenerator 
          booking={selectedBooking} 
          onClose={closePrintModal}
        />
      )}
    </>
  );
};

export default DocumentActionsPanel;
