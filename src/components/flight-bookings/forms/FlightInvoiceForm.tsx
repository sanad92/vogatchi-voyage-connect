
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FormData = {
  subtotal: number;
  vat_rate: number;
  discount_amount: number;
  payment_terms: string;
  payment_method: string;
  notes: string;
  due_date: string;
};

interface Props {
  formData: FormData;
  onChange: (fields: Partial<FormData>) => void;
  printMode?: boolean;
}

const FlightInvoiceForm: React.FC<Props> = ({ formData, onChange, printMode }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="subtotal">المبلغ الفرعي</Label>
        <Input
          id="subtotal"
          type="number"
          step="0.01"
          value={formData.subtotal}
          onChange={e => onChange({ subtotal: parseFloat(e.target.value) || 0 })}
          required
          disabled={!!printMode}
        />
      </div>
      <div>
        <Label htmlFor="vat_rate">نسبة الضريبة (%)</Label>
        <Input
          id="vat_rate"
          type="number"
          step="0.01"
          value={formData.vat_rate}
          onChange={e => onChange({ vat_rate: parseFloat(e.target.value) || 0 })}
          required
          disabled={!!printMode}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="discount_amount">قيمة الخصم</Label>
        <Input
          id="discount_amount"
          type="number"
          step="0.01"
          value={formData.discount_amount}
          onChange={e => onChange({ discount_amount: parseFloat(e.target.value) || 0 })}
          disabled={!!printMode}
        />
      </div>
      <div>
        <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
        <Input
          id="due_date"
          type="date"
          value={formData.due_date}
          onChange={e => onChange({ due_date: e.target.value })}
          disabled={!!printMode}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="payment_terms">شروط الدفع</Label>
        <Input
          id="payment_terms"
          value={formData.payment_terms}
          onChange={e => onChange({ payment_terms: e.target.value })}
          placeholder="30 days"
          disabled={!!printMode}
        />
      </div>
      <div>
        <Label htmlFor="payment_method">طريقة الدفع</Label>
        <Select 
          value={formData.payment_method} 
          onValueChange={value => onChange({ payment_method: value })}
          disabled={!!printMode}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">نقداً</SelectItem>
            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
            <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
            <SelectItem value="check">شيك</SelectItem>
            <SelectItem value="instant_transfer">تحويل فوري</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div>
      <Label htmlFor="notes">ملاحظات</Label>
      <Textarea
        id="notes"
        value={formData.notes}
        onChange={e => onChange({ notes: e.target.value })}
        rows={3}
        disabled={!!printMode}
      />
    </div>
  </div>
);

export default FlightInvoiceForm;
