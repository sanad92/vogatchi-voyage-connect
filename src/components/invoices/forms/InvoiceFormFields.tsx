
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InvoiceFormFieldsProps {
  formData: any;
  invoice: any;
  handleInputChange: (field: string, value: any) => void;
  vatAmount: number;
  totalAmount: number;
  finalAmount: number;
}

const InvoiceFormFields = ({ 
  formData, 
  invoice, 
  handleInputChange, 
  vatAmount, 
  totalAmount, 
  finalAmount 
}: InvoiceFormFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="subtotal">المبلغ الفرعي ({invoice.currency})</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            value={formData.subtotal}
            onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div>
          <Label htmlFor="vat_rate">نسبة الضريبة (%)</Label>
          <Input
            id="vat_rate"
            type="number"
            step="0.01"
            value={formData.vat_rate}
            onChange={(e) => handleInputChange('vat_rate', parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="discount_amount">قيمة الخصم ({invoice.currency})</Label>
        <Input
          id="discount_amount"
          type="number"
          step="0.01"
          value={formData.discount_amount}
          onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="payment_terms">شروط الدفع</Label>
          <Input
            id="payment_terms"
            value={formData.payment_terms}
            onChange={(e) => handleInputChange('payment_terms', e.target.value)}
            placeholder="30 days"
          />
        </div>
        <div>
          <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">الحالة</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => handleInputChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="sent">مرسلة</SelectItem>
            <SelectItem value="paid">مدفوعة</SelectItem>
            <SelectItem value="overdue">متأخرة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          placeholder="أدخل أي ملاحظات إضافية..."
        />
      </div>

      {/* ملخص الحسابات */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <h4 className="font-medium mb-3">ملخص الفاتورة:</h4>
        <div className="flex justify-between text-sm">
          <span>المبلغ الفرعي:</span>
          <span>{formData.subtotal.toLocaleString()} {invoice.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>الضريبة ({formData.vat_rate}%):</span>
          <span>{vatAmount.toLocaleString()} {invoice.currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>الخصم:</span>
          <span>-{formData.discount_amount.toLocaleString()} {invoice.currency}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>المجموع النهائي:</span>
          <span>{finalAmount.toLocaleString()} {invoice.currency}</span>
        </div>
      </div>
    </>
  );
};

export default InvoiceFormFields;
