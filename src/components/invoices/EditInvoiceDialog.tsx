
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit } from "lucide-react";
import InvoiceFormFields from "./forms/InvoiceFormFields";

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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoiceFormFields
                formData={formData}
                invoice={invoice}
                handleInputChange={handleInputChange}
                vatAmount={vatAmount}
                totalAmount={totalAmount}
                finalAmount={finalAmount}
              />
            </CardContent>
          </Card>

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
