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

// type for FlightBooking (تعديل حسب المتوفر في types/flightBooking.ts)
import { FlightBooking } from "@/types/flightBooking";
import FlightInvoiceForm from "./forms/FlightInvoiceForm";
import FlightInvoiceSummary from "./summary/FlightInvoiceSummary";

interface FlightInvoiceCreatorProps {
  booking: FlightBooking;
  open: boolean;
  onClose: () => void;
  printMode?: boolean; // ✅ NEW optional prop for print mode
}

const FlightInvoiceCreator = ({
  booking,
  open,
  onClose,
  printMode, // Accept the new prop; can optionally be used
}: FlightInvoiceCreatorProps) => {
  const [formData, setFormData] = useState({
    subtotal: booking.total_cost || 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    payment_method: "bank_transfer",
    notes: `فاتورة حجز طيران للشركة`,
    due_date: ""
  });

  const queryClient = useQueryClient();

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
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
          booking_type: 'flight', // مهم جداً
          subtotal: formData.subtotal,
          vat_rate: formData.vat_rate,
          discount_amount: formData.discount_amount,
          total_amount: formData.subtotal + vatAmount,
          final_amount: finalAmount,
          payment_terms: formData.payment_terms,
          notes: formData.notes,
          due_date: formData.due_date || null,
          issued_date: new Date().toISOString().split('T')[0],
          currency: booking.currency || 'EGP',
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;

      // تحديث حالة الحجز
      await supabase
        .from('flight_bookings')
        .update({ 
          invoice_sent: true,
          invoice_sent_date: new Date().toISOString(),
          payment_method: formData.payment_method
        })
        .eq('id', booking.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إصدار الفاتورة');
      onClose();
    },
    onError: (error) => {
      console.error('Error creating flight invoice:', error);
      toast.error('خطأ في إصدار فاتورة الطيران');
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

  // Compute values for summary
  const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
  const finalAmount = formData.subtotal + vatAmount - formData.discount_amount;

  // Helper for controlled form
  const handleFormChange = (fields: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            إصدار فاتورة رحلة طيران - {booking.booking_reference}
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
              <Input value={booking.booking_reference} disabled />
            </div>
          </div>

          <FlightInvoiceForm
            formData={formData}
            onChange={handleFormChange}
            printMode={printMode}
          />

          <FlightInvoiceSummary
            subtotal={formData.subtotal}
            vat_rate={formData.vat_rate}
            discount_amount={formData.discount_amount}
            currencySymbol={booking.currency || "ج.م"}
          />

          {!printMode && (
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
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FlightInvoiceCreator;
