
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetailsStepProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  vatAmount: number;
  finalAmount: number;
}

const InvoiceDetailsStep = ({ 
  formData, 
  handleInputChange, 
  vatAmount, 
  finalAmount 
}: InvoiceDetailsStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل الفاتورة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subtotal">المبلغ الفرعي</Label>
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
            <Label htmlFor="currency">العملة</Label>
            <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                <SelectItem value="EUR">يورو (EUR)</SelectItem>
                <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <Label htmlFor="discount_amount">قيمة الخصم</Label>
            <Input
              id="discount_amount"
              type="number"
              step="0.01"
              value={formData.discount_amount}
              onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
            />
          </div>
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
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        {/* ملخص الحسابات */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <h4 className="font-medium mb-3">ملخص الفاتورة:</h4>
          <div className="flex justify-between text-sm">
            <span>المبلغ الفرعي:</span>
            <span>{formData.subtotal.toLocaleString()} {formData.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>الضريبة ({formData.vat_rate}%):</span>
            <span>{vatAmount.toLocaleString()} {formData.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>الخصم:</span>
            <span>-{formData.discount_amount.toLocaleString()} {formData.currency}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>المجموع النهائي:</span>
            <span>{finalAmount.toLocaleString()} {formData.currency}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceDetailsStep;
