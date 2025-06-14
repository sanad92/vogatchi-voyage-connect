
import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Eye, Edit, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  booking_id: string;
  status: string;
  total_amount: number;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  discount_amount: number | null;
  final_amount: number;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  currency: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type Booking = {
  id: string;
  booking_reference: string;
  customer_id: string;
  selling_price: number;
  supplier_cost: number;
  profit_margin: number | null;
};

const Invoices = () => {
  const [newInvoice, setNewInvoice] = useState({
    customer_id: "",
    booking_id: "",
    subtotal: 0,
    vat_rate: 14,
    discount_amount: 0,
    payment_terms: "30 days",
    notes: "",
    due_date: ""
  });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // استعلام الفواتير
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, email),
          bookings(booking_reference, selling_price)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // استعلام العملاء
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .order('name');
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  // استعلام الحجوزات
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_reference, customer_id, selling_price, supplier_cost, profit_margin')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Booking[];
    }
  });

  // تصفية الحجوزات حسب العميل المختار
  const filteredBookings = bookings.filter(booking => 
    !newInvoice.customer_id || booking.customer_id === newInvoice.customer_id
  );

  // حساب الإجمالي تلقائياً
  useEffect(() => {
    const selectedBooking = bookings.find(b => b.id === newInvoice.booking_id);
    if (selectedBooking) {
      setNewInvoice(prev => ({
        ...prev,
        subtotal: selectedBooking.selling_price
      }));
    }
  }, [newInvoice.booking_id, bookings]);

  // إضافة فاتورة جديدة
  const addInvoiceMutation = useMutation({
    mutationFn: async (invoice: typeof newInvoice) => {
      // إنشاء رقم فاتورة تلقائي
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');
      
      if (numberError) throw numberError;

      const selectedBooking = bookings.find(b => b.id === invoice.booking_id);
      if (!selectedBooking) throw new Error('الحجز غير موجود');

      const subtotal = invoice.subtotal || selectedBooking.selling_price;
      const vatAmount = (subtotal * invoice.vat_rate) / 100;
      const finalAmount = subtotal + vatAmount - invoice.discount_amount;

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: invoice.customer_id,
          booking_id: invoice.booking_id,
          subtotal: subtotal,
          vat_rate: invoice.vat_rate,
          discount_amount: invoice.discount_amount,
          total_amount: subtotal + vatAmount,
          final_amount: finalAmount,
          payment_terms: invoice.payment_terms,
          notes: invoice.notes,
          due_date: invoice.due_date || null,
          issued_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setNewInvoice({
        customer_id: "",
        booking_id: "",
        subtotal: 0,
        vat_rate: 14,
        discount_amount: 0,
        payment_terms: "30 days",
        notes: "",
        due_date: ""
      });
      setShowForm(false);
      toast({
        title: "تم إنشاء الفاتورة بنجاح",
        description: "تم حفظ الفاتورة الجديدة",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الفاتورة",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغية"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.customer_id || !newInvoice.booking_id) {
      toast({
        title: "يرجى اختيار العميل والحجز",
        variant: "destructive",
      });
      return;
    }
    addInvoiceMutation.mutate(newInvoice);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
            <Receipt /> نظام الفواتير المتقدم
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 ml-2" />
            إنشاء فاتورة جديدة
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>إنشاء فاتورة جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={newInvoice.customer_id} onValueChange={(value) => setNewInvoice({...newInvoice, customer_id: value, booking_id: ""})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={newInvoice.booking_id} onValueChange={(value) => setNewInvoice({...newInvoice, booking_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحجز" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBookings.map(booking => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.booking_reference} - {booking.selling_price.toLocaleString()} ج.م
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="المبلغ الفرعي"
                  value={newInvoice.subtotal}
                  onChange={e => setNewInvoice({...newInvoice, subtotal: parseFloat(e.target.value) || 0})}
                  step="0.01"
                />

                <Input
                  type="number"
                  placeholder="نسبة الضريبة %"
                  value={newInvoice.vat_rate}
                  onChange={e => setNewInvoice({...newInvoice, vat_rate: parseFloat(e.target.value) || 0})}
                  step="0.01"
                />

                <Input
                  type="number"
                  placeholder="قيمة الخصم"
                  value={newInvoice.discount_amount}
                  onChange={e => setNewInvoice({...newInvoice, discount_amount: parseFloat(e.target.value) || 0})}
                  step="0.01"
                />

                <Input
                  type="date"
                  placeholder="تاريخ الاستحقاق"
                  value={newInvoice.due_date}
                  onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})}
                />

                <Select value={newInvoice.payment_terms} onValueChange={(value) => setNewInvoice({...newInvoice, payment_terms: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="شروط الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">فوري</SelectItem>
                    <SelectItem value="15 days">15 يوم</SelectItem>
                    <SelectItem value="30 days">30 يوم</SelectItem>
                    <SelectItem value="60 days">60 يوم</SelectItem>
                  </SelectContent>
                </Select>

                <div className="md:col-span-2">
                  <Textarea
                    placeholder="ملاحظات إضافية"
                    value={newInvoice.notes}
                    onChange={e => setNewInvoice({...newInvoice, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                {newInvoice.subtotal > 0 && (
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">ملخص الفاتورة:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>المبلغ الفرعي:</span>
                        <span>{newInvoice.subtotal.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الضريبة ({newInvoice.vat_rate}%):</span>
                        <span>{((newInvoice.subtotal * newInvoice.vat_rate) / 100).toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>الخصم:</span>
                        <span>-{newInvoice.discount_amount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>الإجمالي النهائي:</span>
                        <span>{(newInvoice.subtotal + (newInvoice.subtotal * newInvoice.vat_rate / 100) - newInvoice.discount_amount).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={addInvoiceMutation.isPending}>
                    {addInvoiceMutation.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="text-center py-8">جاري تحميل الفواتير...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد فواتير حتى الآن</div>
          ) : (
            invoices.map((invoice: any) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        فاتورة #{invoice.invoice_number}
                      </h3>
                      <p className="text-gray-600">العميل: {invoice.customers?.name}</p>
                      {invoice.bookings?.booking_reference && (
                        <p className="text-sm text-gray-500">الحجز: {invoice.bookings.booking_reference}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                      <div className="mt-2 text-lg font-bold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {invoice.final_amount.toLocaleString()} ج.م
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">تاريخ الإصدار:</span>
                      <p>{invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الاستحقاق:</span>
                      <p>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                    </div>
                    <div>
                      <span className="font-medium">شروط الدفع:</span>
                      <p>{invoice.payment_terms}</p>
                    </div>
                    <div>
                      <span className="font-medium">الضريبة:</span>
                      <p>{invoice.vat_rate}% = {invoice.vat_amount?.toLocaleString()} ج.م</p>
                    </div>
                  </div>

                  {invoice.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <span className="font-medium">ملاحظات:</span>
                      <p className="text-sm mt-1">{invoice.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      عرض
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      تعديل
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="w-4 h-4 mr-1" />
                      طباعة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
