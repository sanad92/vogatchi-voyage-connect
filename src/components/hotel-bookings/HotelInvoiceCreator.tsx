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
import { HotelBooking } from "@/types/hotelBooking";
import { FileText } from "lucide-react";

interface HotelInvoiceCreatorProps {
  booking: HotelBooking;
  open: boolean;
  onClose: () => void;
}

const HotelInvoiceCreator = ({ booking, open, onClose }: HotelInvoiceCreatorProps) => {
  const [formData, setFormData] = useState({
    subtotal: booking.total_cost_customer || 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    payment_method: "bank_transfer",
    notes: `فاتورة حجز فندق ${booking.hotel_name} - ${booking.destination_city}`,
    due_date: ""
  });

  const queryClient = useQueryClient();

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      // إنشاء رقم فاتورة تلقائي
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');
      
      if (numberError) throw numberError;

      const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
      const finalAmount = formData.subtotal + vatAmount - formData.discount_amount;

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: booking.customer_id,
          booking_id: booking.id,
          booking_type: 'hotel',
          subtotal: formData.subtotal,
          vat_rate: formData.vat_rate,
          discount_amount: formData.discount_amount,
          total_amount: formData.subtotal + vatAmount,
          final_amount: finalAmount,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          due_date: formData.due_date || null,
          issued_date: new Date().toISOString().split('T')[0],
          currency: 'EGP', // تثبيت العملة على الجنيه المصري
          status: 'sent'
        }])
        .select()
        .single();
      
      if (error) throw error;

      // تحديث حالة الحجز أن الفاتورة تم إصدارها
      await supabase
        .from('hotel_bookings')
        .update({ 
          invoice_sent: true,
          invoice_sent_date: new Date().toISOString(),
          payment_method: formData.payment_method // إضافة طريقة الدفع
        })
        .eq('id', booking.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إصدار الفاتورة بنجاح بالجنيه المصري');
      onClose();
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error('خطأ في إصدار الفاتورة');
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

  const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
  const finalAmount = formData.subtotal + vatAmount - formData.discount_amount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إصدار فاتورة للحجز - {booking.internal_booking_number}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>اسم العميل</Label>
              <Input value={booking.customer_name} disabled />
            </div>
            <div>
              <Label>رقم الحجز</Label>
              <Input value={booking.internal_booking_number} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subtotal">المبلغ الفرعي (ج.م)</Label>
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
              <Label htmlFor="discount_amount">قيمة الخصم (ج.م)</Label>
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

export default HotelInvoiceCreator;
