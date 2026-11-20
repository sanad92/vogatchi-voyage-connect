import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { isRecordId, readActiveCustomer, useActiveCustomerOptions, useCustomerContext, type CustomerContext } from '@/hooks/useCustomerContext';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { calculateFinancialBreakdown } from '@/utils/calculationHelpers';
import { useCurrencyHelper } from '@/hooks/useCurrencyHelper';

async function readInvoiceBooking(orgId: string, id: string) {
  const { data, error } = await supabase.from('bookings')
    .select('id, booking_type, booking_number, customer_id, currency')
    .eq('organization_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const NewInvoice = () => {
  const orgId = useOrgId();
  const [params] = useSearchParams();
  const id = params.get('booking_id');
  const booking = useQuery({
    queryKey: ['new-invoice-booking', orgId, id],
    enabled: Boolean(orgId && isRecordId(id)),
    queryFn: () => readInvoiceBooking(orgId!, id!),
  });
  const customerId = id ? booking.data?.customer_id : params.get('customer_id');
  const customer = useCustomerContext(orgId, customerId);
  if (!orgId) return null;
  if (booking.isLoading || customer.isLoading) return <p className="p-6 text-center">جاري التحقق من بيانات الفاتورة...</p>;
  if (id && !booking.data) return <p role="alert" className="p-6 text-center">تعذر فتح الحجز في الشركة الحالية لإنشاء الفاتورة.</p>;
  if (id && !customer.data) return <p role="alert" className="p-6 text-center">يلزم ربط الحجز بعميل متاح في الشركة الحالية قبل إنشاء الفاتورة.</p>;
  return (
    <InvoiceForm
      key={`${orgId}:${id ?? ''}:${customerId ?? ''}`}
      orgId={orgId}
      initialCustomer={customer.data}
      missingCustomer={Boolean(customerId && !customer.data)}
      booking={booking.data}
    />
  );
};

type InvoiceBooking = {
  id: string;
  booking_type: string;
  booking_number: string;
  currency: string | null;
};

function InvoiceForm({ orgId, initialCustomer, missingCustomer, booking }: {
  orgId: string;
  initialCustomer?: CustomerContext | null;
  missingCustomer: boolean;
  booking?: InvoiceBooking | null;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ensureSupportedCurrency } = useCurrencyHelper();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  
  const [formData, setFormData] = useState({
    customer_id: initialCustomer?.id ?? '',
    booking_type: booking?.booking_type ?? '',
    amount: '',
    currency: booking?.currency || 'EGP',
    description: '',
    notes: ''
  });

  const customers = useActiveCustomerOptions(orgId, initialCustomer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || !orgId) return;

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'خطأ', description: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر', variant: 'destructive' });
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      if (formData.customer_id && !await readActiveCustomer(orgId, formData.customer_id)) {
        throw new Error('اختر عميلاً متاحًا في الشركة الحالية');
      }
      if (booking) {
        const current = await readInvoiceBooking(orgId, booking.id);
        if (!current || current.customer_id !== formData.customer_id
          || current.booking_type !== booking.booking_type || current.currency !== booking.currency) {
          throw new Error('اتغيّرت بيانات الحجز. افتحه من جديد قبل إنشاء الفاتورة.');
        }
      }
      if (!mounted.current) return;
      // Generate invoice number via RPC
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
      if (!mounted.current) return;
      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: amount,
        discountAmount: 0,
        vatRate: 0,
      });
      const currency = ensureSupportedCurrency(formData.currency);

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          organization_id: orgId,
          customer_id: formData.customer_id || null,
          booking_type: formData.booking_type || null,
          booking_id: booking?.id ?? null,
          subtotal: financialBreakdown.subtotal,
          total_amount: financialBreakdown.totalAmount,
          final_amount: financialBreakdown.totalAmount,
          currency,
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          notes: formData.notes || null,
          status: 'pending',
          issued_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;
      if (!mounted.current) return;

      toast({
        title: "تم إنشاء الفاتورة بنجاح",
        description: `فاتورة رقم ${data.invoice_number}`,
      });

      navigate('/invoices');
    } catch (error: any) {
      if (!mounted.current) return;
      console.error('Error creating invoice:', error);
      toast({
        title: "خطأ في إنشاء الفاتورة",
        description: error?.message || "حدث خطأ أثناء إنشاء الفاتورة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">فاتورة جديدة</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الفاتورة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل *</Label>
                  {missingCustomer && <p role="status" className="text-sm text-muted-foreground">تعذر اختيار العميل من الرابط.</p>}
                  <Select value={formData.customer_id} disabled={!!booking} onValueChange={(value) => handleChange('customer_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers || []).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>نوع الحجز</Label>
                  {booking ? <p className="text-sm">{booking.booking_number}</p> : (
                  <Select value={formData.booking_type} onValueChange={(value) => handleChange('booking_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحجز" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">حجز فندق</SelectItem>
                      <SelectItem value="flight">حجز طيران</SelectItem>
                      <SelectItem value="car_rental">تأجير سيارة</SelectItem>
                      <SelectItem value="transport">حجز نقل</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>العملة *</Label>
                  <Select value={formData.currency} disabled={!!booking} onValueChange={(value) => handleChange('currency', value)} required>
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
                  <p className="text-[11px] text-muted-foreground">
                    يجب أن تطابق عملة الفاتورة عملة الحجز المرتبط بها.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف الفاتورة</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="وصف مختصر للفاتورة"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="ملاحظات إضافية (اختياري)"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/invoices')}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NewInvoice;
