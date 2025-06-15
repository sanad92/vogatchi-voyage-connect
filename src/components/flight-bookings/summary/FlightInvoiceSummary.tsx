
import React from "react";

interface Props {
  subtotal: number;
  vat_rate: number;
  discount_amount: number;
  currencySymbol?: string;
}

const FlightInvoiceSummary: React.FC<Props> = ({
  subtotal,
  vat_rate,
  discount_amount,
  currencySymbol = "ج.م",
}) => {
  const vatAmount = (subtotal * vat_rate) / 100;
  const finalAmount = subtotal + vatAmount - discount_amount;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-2">ملخص الفاتورة:</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>المبلغ الفرعي:</span>
          <span>{subtotal.toLocaleString()} {currencySymbol}</span>
        </div>
        <div className="flex justify-between">
          <span>الضريبة ({vat_rate}%):</span>
          <span>{vatAmount.toLocaleString()} {currencySymbol}</span>
        </div>
        <div className="flex justify-between">
          <span>الخصم:</span>
          <span>-{discount_amount.toLocaleString()} {currencySymbol}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-1">
          <span>الإجمالي النهائي:</span>
          <span>{finalAmount.toLocaleString()} {currencySymbol}</span>
        </div>
      </div>
    </div>
  );
};

export default FlightInvoiceSummary;
