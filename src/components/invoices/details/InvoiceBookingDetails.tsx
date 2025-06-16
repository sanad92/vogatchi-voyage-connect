
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InvoiceBookingDetailsProps {
  invoice: any;
  bookingDetails: any;
}

const InvoiceBookingDetails = ({ invoice, bookingDetails }: InvoiceBookingDetailsProps) => {
  if (!bookingDetails) return null;

  return (
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
  );
};

export default InvoiceBookingDetails;
