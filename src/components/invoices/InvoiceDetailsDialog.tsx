
import React from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import InvoiceHeader from "./details/InvoiceHeader";
import InvoiceBasicInfo from "./details/InvoiceBasicInfo";
import InvoiceBookingDetails from "./details/InvoiceBookingDetails";
import InvoiceFinancialDetails from "./details/InvoiceFinancialDetails";

interface InvoiceDetailsDialogProps {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (invoice: any) => void;
  onDelete?: (invoiceId: string) => void;
  onUpdateStatus?: (invoiceId: string, status: string, paymentDate?: string) => void;
  onPrint?: (invoice: any) => void;
}

const InvoiceDetailsDialog = ({
  invoice,
  open,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  onPrint,
}: InvoiceDetailsDialogProps) => {
  if (!invoice) return null;

  const getStatusLabel = (status: string) => {
    const statuses = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغاة",
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "secondary",
      sent: "default",
      paid: "success",
      overdue: "destructive",
      cancelled: "outline",
    };
    return colors[status] || "default";
  };

  const getBookingTypeLabel = (type: string) => {
    const types = {
      hotel: "حجز فندق",
      flight: "حجز طيران",
      transport: "حجز نقل",
      car_rental: "إيجار سيارة",
    };
    return types[type] || type;
  };

  const getBookingDetails = () => {
    switch (invoice.booking_type) {
      case "hotel":
        return invoice.hotel_booking;
      case "flight":
        return invoice.flight_booking;
      case "transport":
        return invoice.transport_booking;
      case "car_rental":
        return invoice.car_rental;
      default:
        return null;
    }
  };

  const bookingDetails = getBookingDetails();

  const handleMarkAsPaid = () => {
    if (onUpdateStatus) {
      const paymentDate = new Date().toISOString().split('T')[0];
      onUpdateStatus(invoice.id, 'paid', paymentDate);
    }
  };

  const handleMarkAsOverdue = () => {
    if (onUpdateStatus) {
      onUpdateStatus(invoice.id, 'overdue');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <InvoiceHeader 
            invoice={invoice} 
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        </DialogHeader>

        <div className="space-y-6">
          <InvoiceBasicInfo 
            invoice={invoice} 
            getBookingTypeLabel={getBookingTypeLabel}
          />

          <InvoiceBookingDetails 
            invoice={invoice} 
            bookingDetails={bookingDetails}
          />

          <InvoiceFinancialDetails invoice={invoice} />

          {/* ملاحظات */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {onPrint && (
              <Button variant="outline" onClick={() => onPrint(invoice)}>
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
            )}
            
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(invoice)}>
                <Edit className="h-4 w-4 mr-2" />
                تعديل
              </Button>
            )}

            {invoice.status !== 'paid' && onUpdateStatus && (
              <Button variant="default" onClick={handleMarkAsPaid}>
                <CheckCircle className="h-4 w-4 mr-2" />
                تأكيد الدفع
              </Button>
            )}

            {invoice.status === 'sent' && onUpdateStatus && (
              <Button variant="destructive" onClick={handleMarkAsOverdue}>
                <XCircle className="h-4 w-4 mr-2" />
                تأخير في السداد
              </Button>
            )}

            {onDelete && (
              <Button variant="destructive" onClick={() => onDelete(invoice.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                حذف
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailsDialog;
