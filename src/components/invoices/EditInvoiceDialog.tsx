
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit } from "lucide-react";

interface EditInvoiceDialogProps {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onSave: (invoiceId: string, updateData: any) => void;
  isLoading?: boolean;
}

const EditInvoiceDialog = ({
  invoice,
  open,
  onClose,
  onSave,
  isLoading = false,
}: EditInvoiceDialogProps) => {
  const [formData, setFormData] = useState({
    subtotal: 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    notes: "",
    due_date: "",
    status: "draft",
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        subtotal: invoice.subtotal || 0,
        vat_rate: invoice.vat_rate || 14,
        discount_amount: invoice.discount_amount || 0,
        payment_terms: invoice.payment_terms || "30 days",
        notes: invoice.notes || "",
        due_date: invoice.due_date || "",
        status: invoice.status || "draft",
      });
    }
  }, [invoice]);

  const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
  const totalAmount = formData.subtotal + vatAmount;
  const finalAmount = totalAmount - formData.discount_amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData = {
      ...formData,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      final_amount: finalAmount,
      updated_at: new Date().toISOString(),
    };

    onSave(invoice.id, updateData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            تعديل الفاتورة - {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* معلومات أساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>رقم الفاتورة</Label>
                  <Input value={invoice.invoice_number} disabled />
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
            </CardContent>
          </Card>

          {/* المبالغ المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المبالغ المالية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>المجموع النهائي:</span>
                  <span>{finalAmount.toLocaleString()} {invoice.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ملاحظات */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="أدخل أي ملاحظات إضافية..."
              />
            </CardContent>
          </Card>

          {/* أزرار الحفظ */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceDialog;
