
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface InvoiceFinancialDetailsProps {
  invoice: any;
}

const InvoiceFinancialDetails = ({ invoice }: InvoiceFinancialDetailsProps) => {
  return (
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
  );
};

export default InvoiceFinancialDetails;
