
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Printer, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

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
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              فاتورة رقم {invoice.invoice_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(invoice.status)}>
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات أساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الفاتورة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">رقم الفاتورة:</span>
                  <span>{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">تاريخ الإصدار:</span>
                  <span>
                    {format(new Date(invoice.issued_date), "d MMM yyyy", { locale: ar })}
                  </span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span className="font-medium">تاريخ الاستحقاق:</span>
                    <span>
                      {format(new Date(invoice.due_date), "d MMM yyyy", { locale: ar })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">نوع الحجز:</span>
                  <span>{getBookingTypeLabel(invoice.booking_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">العملة:</span>
                  <span>{invoice.currency}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات العميل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">الاسم:</span>
                  <span>{invoice.customer?.name || "غير محدد"}</span>
                </div>
                {invoice.customer?.email && (
                  <div className="flex justify-between">
                    <span className="font-medium">البريد الإلكتروني:</span>
                    <span>{invoice.customer.email}</span>
                  </div>
                )}
                {invoice.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="font-medium">الهاتف:</span>
                    <span>{invoice.customer.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* تفاصيل الحجز */}
          {bookingDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل الحجز</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.booking_type === "hotel" && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">اسم الفندق:</span>
                      <span>{bookingDetails.hotel_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">المدينة:</span>
                      <span>{bookingDetails.destination_city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">تاريخ الوصول:</span>
                      <span>
                        {format(new Date(bookingDetails.check_in_date), "d MMM yyyy", { locale: ar })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">تاريخ المغادرة:</span>
                      <span>
                        {format(new Date(bookingDetails.check_out_date), "d MMM yyyy", { locale: ar })}
                      </span>
                    </div>
                  </>
                )}
                {invoice.booking_type === "flight" && (
                  <>
                    <div className="flex justify-between">
                      <span className="font-medium">شركة الطيران:</span>
                      <span>{bookingDetails.airline_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">تاريخ المغادرة:</span>
                      <span>
                        {format(new Date(bookingDetails.departure_date), "d MMM yyyy", { locale: ar })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">رقم الحجز:</span>
                      <span>{bookingDetails.booking_reference}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* المبالغ المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">التفاصيل المالية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">المبلغ الفرعي:</span>
                <span>{invoice.subtotal?.toLocaleString()} {invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">الضريبة ({invoice.vat_rate}%):</span>
                <span>{invoice.vat_amount?.toLocaleString()} {invoice.currency}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">الخصم:</span>
                  <span>-{invoice.discount_amount?.toLocaleString()} {invoice.currency}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>المجموع النهائي:</span>
                <span>{invoice.final_amount?.toLocaleString()} {invoice.currency}</span>
              </div>
            </CardContent>
          </Card>

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
