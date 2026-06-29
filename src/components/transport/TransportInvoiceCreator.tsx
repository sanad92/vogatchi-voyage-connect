import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { TransportBooking } from "@/types/transport";
import { useCurrencyHelper } from "@/hooks/useCurrencyHelper";
import { calculateFinancialBreakdown } from "@/utils/calculationHelpers";

interface TransportInvoiceCreatorProps {
  booking: TransportBooking;
  open: boolean;
  onClose: () => void;
}

const TransportInvoiceCreator = ({ booking, open, onClose }: TransportInvoiceCreatorProps) => {
  const [formData, setFormData] = useState({
    subtotal: booking.total_cost || 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    payment_method: "bank_transfer",
    notes: `فاتورة حجز نقل للرحلة ${booking.booking_reference || ""}`,
    due_date: ""
  });

  const queryClient = useQueryClient();
  const { ensureSupportedCurrency } = useCurrencyHelper();
  const currency = ensureSupportedCurrency((booking as any).currency || 'EGP');

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');
      if (numberError) throw numberError;

      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: formData.subtotal,
        discountAmount: formData.discount_amount,
        vatRate: formData.vat_rate,
      });

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: booking.customer_id,
          booking_id: booking.id,
          booking_type: 'transport',
          subtotal: financialBreakdown.subtotal,
          vat_rate: financialBreakdown.vatRate,
          vat_amount: financialBreakdown.vatAmount,
          discount_amount: financialBreakdown.discountAmount,
          total_amount: financialBreakdown.totalAmount,
          final_amount: financialBreakdown.totalAmount,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          due_date: formData.due_date || null,
          issued_date: new Date().toISOString().split('T')[0],
          currency,
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('transport_bookings')
        .update({ 
          invoice_sent: true,
          invoice_sent_date: new Date().toISOString(),
          payment_method: formData.payment_method
        })
        .eq('id', booking.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إصدار فاتورة النقل');
      onClose();
    },
    onError: (error) => {
      console.error('Error creating transport invoice:', error);
      toast.error('خطأ في إصدار فاتورة النقل');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking.customer_id) {
      toast.error('لا يمكن إصدار فاتورة بدون عميل');
      return;
    }
    createInvoiceMutation.mutate();
  };

  const financialBreakdown = calculateFinancialBreakdown({
    subtotal: formData.subtotal,
    discountAmount: formData.discount_amount,
    vatRate: formData.vat_rate,
  });
  const vatAmount = financialBreakdown.vatAmount;
  const finalAmount = financialBreakdown.totalAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إصدار فاتورة نقل - {booking.booking_reference}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>اسم العميل</Label>
              <Input value={booking.customer_name || ""} disabled />
            </div>
            <div>
              <Label>رقم الرحلة</Label>
              <Input value={booking.booking_reference || ""} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subtotal">المبلغ الفرعي</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={e => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})}
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
                onChange={e => setFormData({...formData, vat_rate: parseFloat(e.target.value) || 0})}
                required
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
                onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_terms">شروط الدفع</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                placeholder="30 days"
              />
            </div>
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData({...formData, payment_method: value})}
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
              onChange={e => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">ملخص الفاتورة:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>المبلغ الفرعي:</span>
                <span>{formData.subtotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>الضريبة ({formData.vat_rate}%):</span>
                <span>{vatAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>الخصم:</span>
                <span>-{formData.discount_amount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>الإجمالي النهائي:</span>
                <span>{finalAmount.toLocaleString()} ج.م</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={createInvoiceMutation.isPending}
              className="flex-1"
            >
              {createInvoiceMutation.isPending ? 'جاري الإصدار...' : 'إصدار الفاتورة'}
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

export default TransportInvoiceCreator;
