
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InvoiceBasicInfoProps {
  invoice: any;
  getBookingTypeLabel: (type: string) => string;
}

const InvoiceBasicInfo = ({ invoice, getBookingTypeLabel }: InvoiceBasicInfoProps) => {
  return (
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
  );
};

export default InvoiceBasicInfo;
