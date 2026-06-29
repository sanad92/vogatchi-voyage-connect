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
import { useOrgId } from "@/hooks/useOrgId";
import { useCurrencyHelper } from "@/hooks/useCurrencyHelper";
import { calculateFinancialBreakdown } from "@/utils/calculationHelpers";

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
  const currentOrgId = useOrgId();
  const { ensureSupportedCurrency } = useCurrencyHelper();
  const currency = ensureSupportedCurrency((booking as any).currency || 'EGP');

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const orgId = (booking as any).organization_id || currentOrgId;
      if (!orgId) {
        throw new Error('NO_ORG');
      }

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
          organization_id: orgId,
          invoice_number: invoiceNumber,
          customer_id: booking.customer_id,
          booking_id: booking.id,
          booking_type: 'flight',
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
    onError: (error: any) => {
      console.error('Error creating flight invoice:', error);
      if (error?.message === 'NO_ORG') {
        toast.error('تعذر تحديد المؤسسة الحالية لإصدار الفاتورة');
      } else if (error?.code === '42501') {
        toast.error('ليس لديك صلاحية إصدار فاتورة لهذه المؤسسة');
      } else {
        toast.error(error?.message || 'خطأ في إصدار فاتورة الطيران');
      }
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
  const financialBreakdown = calculateFinancialBreakdown({
    subtotal: formData.subtotal,
    discountAmount: formData.discount_amount,
    vatRate: formData.vat_rate,
  });
  const vatAmount = financialBreakdown.vatAmount;
  const finalAmount = financialBreakdown.totalAmount;

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
