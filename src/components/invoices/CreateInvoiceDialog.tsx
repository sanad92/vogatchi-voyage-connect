
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateInvoiceDialog = ({ open, onClose }: CreateInvoiceDialogProps) => {
  const [step, setStep] = useState(1); // 1: اختيار العميل/الحجز, 2: تفاصيل الفاتورة
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [bookingType, setBookingType] = useState("");
  
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
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');
      if (numberError) throw numberError;

      const vatAmount = (formData.subtotal * formData.vat_rate) / 100;
      const totalAmount = formData.subtotal + vatAmount;
      const finalAmount = totalAmount - formData.discount_amount;

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        booking_id: selectedBooking?.id || null,
        booking_type: selectedBooking?.booking_type || 'manual',
        subtotal: formData.subtotal,
        vat_rate: formData.vat_rate,
        vat_amount: vatAmount,
        discount_amount: formData.discount_amount,
        total_amount: totalAmount,
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
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
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
    
    // تحديد المبلغ بناءً على نوع الحجز
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
  const totalAmount = formData.subtotal + vatAmount;
  const finalAmount = totalAmount - formData.discount_amount;

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
          <div className="space-y-6">
            {/* اختيار العميل */}
            <Card>
              <CardHeader>
                <CardTitle>اختيار العميل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer-search">البحث عن العميل</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="customer-search"
                      placeholder="الاسم، البريد الإلكتروني، أو رقم الهاتف..."
                      className="pl-8"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {customers?.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {customer.email} • {customer.phone}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCustomer && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">العميل المحدد:</div>
                    <div className="text-green-700">{selectedCustomer.name}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* اختيار الحجز (اختياري) */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle>اختيار الحجز (اختياري)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="booking-type">تصفية حسب نوع الحجز</Label>
                    <Select value={bookingType} onValueChange={setBookingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع أنواع الحجوزات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الأنواع</SelectItem>
                        <SelectItem value="hotel">حجز فندق</SelectItem>
                        <SelectItem value="flight">حجز طيران</SelectItem>
                        <SelectItem value="transport">حجز نقل</SelectItem>
                        <SelectItem value="car_rental">إيجار سيارة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bookings && bookings.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      {bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                            selectedBooking?.id === booking.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                          onClick={() => handleSelectBooking(booking)}
                        >
                          <div className="font-medium">{getBookingTitle(booking)}</div>
                          <div className="text-sm text-gray-500">
                            رقم الحجز: {getBookingReference(booking)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      لا توجد حجوزات متاحة لهذا العميل
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    يمكنك المتابعة بدون اختيار حجز لإنشاء فاتورة مستقلة
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleNextStep} className="flex-1" disabled={!selectedCustomer}>
                التالي
              </Button>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); createInvoiceMutation.mutate(); }} className="space-y-6">
            {/* تفاصيل الفاتورة */}
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
