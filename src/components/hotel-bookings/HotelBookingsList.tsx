import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, FileText, Send, Printer, CheckCircle, History, Receipt, Ticket } from "lucide-react";
import { toast } from "sonner";
import { HotelBooking, BookingStatus } from "@/types/hotelBooking";
import HotelInvoiceGenerator from "./HotelInvoiceGenerator";
import HotelVoucherGenerator from "./HotelVoucherGenerator";
import HotelSupplierPaymentGenerator from "./HotelSupplierPaymentGenerator";
import HotelInvoiceCreator from "./HotelInvoiceCreator";
import BookingStatusBadge from "./BookingStatusBadge";
import BookingStatusSelector from "./BookingStatusSelector";
import BookingStatusHistory from "./BookingStatusHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface HotelBookingsListProps {
  bookings: HotelBooking[];
  onEdit: (booking: HotelBooking) => void;
  onRefresh: () => void;
}

const HotelBookingsList = ({ bookings, onEdit, onRefresh }: HotelBookingsListProps) => {
  const [selectedBooking, setSelectedBooking] = useState<HotelBooking | null>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'voucher' | 'payment' | null>(null);
  const [showStatusHistory, setShowStatusHistory] = useState<string | null>(null);
  const [showInvoiceCreator, setShowInvoiceCreator] = useState<HotelBooking | null>(null);
  const [showVoucherGenerator, setShowVoucherGenerator] = useState<HotelBooking | null>(null);

  // Get booking statuses for display
  const { data: statuses = [] } = useQuery({
    queryKey: ['booking-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_statuses')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as BookingStatus[];
    }
  });

  const getBookingStatus = (statusId?: string) => {
    return statuses.find(status => status.id === statusId);
  };

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
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <CardTitle className="text-lg">
                  {booking.customer_name} - {booking.hotel_name}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  رقم الحجز: {booking.internal_booking_number}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">حالة الحجز:</span>
                  <BookingStatusSelector 
                    bookingId={booking.id}
                    currentStatus={getBookingStatus(booking.status_id)}
                    onStatusUpdate={onRefresh}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog 
                  open={showStatusHistory === booking.id} 
                  onOpenChange={(open) => setShowStatusHistory(open ? booking.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>تاريخ حالات الحجز - {booking.internal_booking_number}</DialogTitle>
                    </DialogHeader>
                    <BookingStatusHistory bookingId={booking.id} />
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(booking)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">الوجهة</p>
                <p className="font-medium">{booking.destination_city}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">تواريخ الإقامة</p>
                <p className="font-medium">
                  {new Date(booking.check_in_date).toLocaleDateString('ar')} - 
                  {new Date(booking.check_out_date).toLocaleDateString('ar')}
                </p>
                <p className="text-sm text-gray-500">{booking.number_of_nights} ليلة</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">إجمالي التكلفة</p>
                <p className="font-medium text-lg">{booking.total_cost_customer?.toFixed(2)} جنيه</p>
                <p className="text-sm text-green-600">ربح: {booking.total_profit?.toFixed(2)} جنيه</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">تفاصيل الغرفة</p>
                <p>{booking.room_type} - {booking.number_of_adults} بالغ</p>
                {booking.number_of_children > 0 && (
                  <p className="text-sm">{booking.number_of_children} طفل</p>
                )}
                <p className="text-sm">نظام الوجبات: {booking.meal_plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">المورد</p>
                <p>{booking.supplier_name}</p>
                {booking.booking_reference_supplier && (
                  <p className="text-sm">مرجع: {booking.booking_reference_supplier}</p>
                )}
              </div>
            </div>

            {/* Payment Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">حالة الدفع</p>
                <p>مدفوع: {booking.paid_amount?.toFixed(2) || '0.00'} جنيه</p>
                <p>متبقي: {booking.remaining_amount?.toFixed(2) || '0.00'} جنيه</p>
                {booking.payment_due_date && (
                  <p className="text-sm text-red-600">
                    تاريخ الاستحقاق: {new Date(booking.payment_due_date).toLocaleDateString('ar')}
                  </p>
                )}
              </div>
            </div>

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
          </CardContent>
        </Card>
      ))}

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
    </div>
  );
};

export default HotelBookingsList;
