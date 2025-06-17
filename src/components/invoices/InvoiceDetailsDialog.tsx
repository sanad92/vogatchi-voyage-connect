import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Edit, Trash2, CheckCircle, XCircle, CreditCard } from "lucide-react";
import InvoiceHeader from "./details/InvoiceHeader";
import InvoiceBasicInfo from "./details/InvoiceBasicInfo";
import InvoiceBookingDetails from "./details/InvoiceBookingDetails";
import InvoiceFinancialDetails from "./details/InvoiceFinancialDetails";
import InvoicePaymentDetails from "./details/InvoicePaymentDetails";
import InvoicePaymentManager from "./payments/InvoicePaymentManager";

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
  const [activeTab, setActiveTab] = useState('details');

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <InvoiceHeader 
            invoice={invoice} 
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
          />
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">تفاصيل الفاتورة</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              إدارة المدفوعات
            </TabsTrigger>
            <TabsTrigger value="actions">الإجراءات</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <InvoiceBasicInfo 
              invoice={invoice} 
              getBookingTypeLabel={getBookingTypeLabel}
            />

            <InvoiceBookingDetails 
              invoice={invoice} 
              bookingDetails={bookingDetails}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InvoiceFinancialDetails invoice={invoice} />
              <InvoicePaymentDetails invoice={invoice} />
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <InvoicePaymentManager invoice={invoice} />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {onPrint && (
                <Button variant="outline" onClick={() => onPrint(invoice)} className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  طباعة
                </Button>
              )}
              
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(invoice)} className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  تعديل
                </Button>
              )}

              {invoice.payment_status !== 'fully_paid' && onUpdateStatus && (
                <Button variant="default" onClick={handleMarkAsPaid} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  تأكيد الدفع الكامل
                </Button>
              )}

              {invoice.status === 'sent' && onUpdateStatus && (
                <Button variant="destructive" onClick={handleMarkAsOverdue} className="w-full">
                  <XCircle className="h-4 w-4 mr-2" />
                  تأخير في السداد
                </Button>
              )}
            </div>

            {onDelete && (
              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => onDelete(invoice.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف الفاتورة
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailsDialog;
