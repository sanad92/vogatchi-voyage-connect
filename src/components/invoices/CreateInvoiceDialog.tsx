import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrgId } from "@/hooks/useOrgId";
import CustomerSelectionStep from "./create/CustomerSelectionStep";
import InvoiceDetailsStep from "./create/InvoiceDetailsStep";

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateInvoiceDialog = ({ open, onClose }: CreateInvoiceDialogProps) => {
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [bookingType, setBookingType] = useState("all");
  
  const [formData, setFormData] = useState({
    subtotal: 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    notes: "",
    due_date: "",
    currency: "EGP",
  });

  const queryClient = useQueryClient();
  const currentOrgId = useOrgId();

  // جلب العملاء
  const { data: customers } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .limit(20);

      if (customerSearch) {
        query = query.or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // جلب الحجوزات للعميل المحدد
  const { data: bookings } = useQuery({
    queryKey: ['customer-bookings', selectedCustomer?.id, bookingType],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];

      const bookingQueries = [];

      if (!bookingType || bookingType === 'hotel') {
        bookingQueries.push(
          supabase
            .from('hotel_bookings')
            .select('*, booking_type:hotel')
            .eq('customer_id', selectedCustomer.id)
            .eq('invoice_sent', false)
        );
      }

      if (!bookingType || bookingType === 'flight') {
        bookingQueries.push(
          supabase
            .from('flight_bookings')
            .select('*, booking_type:flight')
            .eq('customer_id', selectedCustomer.id)
            .eq('invoice_sent', false)
        );
      }

      if (!bookingType || bookingType === 'transport') {
        bookingQueries.push(
          supabase
            .from('transport_bookings')
            .select('*, booking_type:transport')
            .eq('customer_id', selectedCustomer.id)
            .eq('invoice_sent', false)
        );
      }

      if (!bookingType || bookingType === 'car_rental') {
        bookingQueries.push(
          supabase
            .from('car_rentals')
            .select('*, booking_type:car_rental')
            .eq('customer_id', selectedCustomer.id)
            .eq('invoice_sent', false)
        );
      }

      const results = await Promise.all(bookingQueries);
      const allBookings = results.flatMap(result => result.data || []);
      
      return allBookings.map(booking => ({
        ...booking,
        booking_type: booking.booking_type || 'hotel',
      }));
    },
    enabled: !!selectedCustomer?.id && open,
  });

  // إنشاء الفاتورة
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const orgId = (selectedBooking as any)?.organization_id || currentOrgId;
      if (!orgId) {
        throw new Error('NO_ORG');
      }

      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');
      if (numberError) throw numberError;

      const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
      const totalAmount = formData.subtotal + vatAmount;
      const finalAmount = totalAmount - formData.discount_amount;

      const invoiceData = {
        organization_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        booking_id: selectedBooking?.id || null,
        booking_type: selectedBooking?.booking_type || 'manual',
        subtotal: formData.subtotal,
        vat_rate: formData.vat_rate,
        vat_amount: vatAmount,
        discount_amount: formData.discount_amount,
        final_amount: finalAmount,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        due_date: formData.due_date || null,
        issued_date: new Date().toISOString().split('T')[0],
        currency: formData.currency,
        status: 'draft',
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      // تحديث حالة الحجز إذا كان موجوداً
      if (selectedBooking) {
        const updateData = {
          invoice_sent: true,
          invoice_sent_date: new Date().toISOString(),
        };

        if (selectedBooking.booking_type === 'hotel') {
          await supabase
            .from('hotel_bookings')
            .update(updateData)
            .eq('id', selectedBooking.id);
        } else if (selectedBooking.booking_type === 'flight') {
          await supabase
            .from('flight_bookings')
            .update(updateData)
            .eq('id', selectedBooking.id);
        } else if (selectedBooking.booking_type === 'transport') {
          await supabase
            .from('transport_bookings')
            .update(updateData)
            .eq('id', selectedBooking.id);
        } else if (selectedBooking.booking_type === 'car_rental') {
          await supabase
            .from('car_rentals')
            .update(updateData)
            .eq('id', selectedBooking.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إنشاء الفاتورة بنجاح');
      handleClose();
    },
    onError: (error: any) => {
      console.error('Error creating invoice:', error);
      if (error?.message === 'NO_ORG') {
        toast.error('تعذر تحديد المؤسسة الحالية لإنشاء الفاتورة');
      } else if (error?.code === '42501') {
        toast.error('ليس لديك صلاحية إنشاء فاتورة لهذه المؤسسة');
      } else {
        toast.error(error?.message || 'حدث خطأ أثناء إنشاء الفاتورة');
      }
    },
  });

  const handleClose = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSelectedBooking(null);
    setCustomerSearch("");
    setBookingType("");
    setFormData({
      subtotal: 0,
      vat_rate: 14,
      discount_amount: 0,
      payment_terms: "30 days",
      notes: "",
      due_date: "",
      currency: "EGP",
    });
    onClose();
  };

  const handleNextStep = () => {
    if (!selectedCustomer) {
      toast.error('يرجى اختيار عميل');
      return;
    }
    setStep(2);
  };

  const handleSelectBooking = (booking) => {
    setSelectedBooking(booking);
    
    let amount = 0;
    if (booking.booking_type === 'hotel') {
      amount = booking.total_cost_customer || 0;
    } else if (booking.booking_type === 'flight') {
      amount = booking.total_cost || 0;
    } else if (booking.booking_type === 'transport') {
      amount = booking.total_cost || 0;
    } else if (booking.booking_type === 'car_rental') {
      amount = booking.total_rental_cost || 0;
    }

    setFormData(prev => ({
      ...prev,
      subtotal: amount,
      currency: booking.currency || 'EGP',
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
  const finalAmount = formData.subtotal + vatAmount - formData.discount_amount;

  const getBookingReference = (booking) => {
    switch (booking.booking_type) {
      case 'hotel':
        return booking.internal_booking_number;
      case 'flight':
        return booking.booking_reference;
      case 'transport':
        return booking.booking_reference;
      case 'car_rental':
        return booking.rental_reference;
      default:
        return 'N/A';
    }
  };

  const getBookingTitle = (booking) => {
    switch (booking.booking_type) {
      case 'hotel':
        return `${booking.hotel_name} - ${booking.destination_city}`;
      case 'flight':
        return `${booking.airline_name || 'رحلة طيران'}`;
      case 'transport':
        return `خدمة نقل من ${booking.pickup_location} إلى ${booking.dropoff_location}`;
      case 'car_rental':
        return `إيجار ${booking.vehicle_make} ${booking.vehicle_model}`;
      default:
        return 'حجز';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            إنشاء فاتورة جديدة
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <>
            <CustomerSelectionStep
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              customers={customers}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              bookingType={bookingType}
              setBookingType={setBookingType}
              bookings={bookings} // Add bookings query here
              selectedBooking={selectedBooking}
              handleSelectBooking={handleSelectBooking}
              getBookingTitle={getBookingTitle}
              getBookingReference={getBookingReference}
            />

            <div className="flex gap-2">
              <Button onClick={handleNextStep} className="flex-1" disabled={!selectedCustomer}>
                التالي
              </Button>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); createInvoiceMutation.mutate(); }} className="space-y-6">
            <InvoiceDetailsStep
              formData={formData}
              handleInputChange={handleInputChange}
              vatAmount={vatAmount}
              finalAmount={finalAmount}
            />

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline">
                السابق
              </Button>
              <Button 
                type="submit" 
                disabled={createInvoiceMutation.isPending}
                className="flex-1"
              >
                {createInvoiceMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
