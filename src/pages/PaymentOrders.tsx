import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Plus, Eye, Edit, CheckCircle, XCircle, Clock, Search, Filter, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { CURRENCY_SYMBOLS } from "@/types/currency";
import CurrencyConverter from "@/components/currency/CurrencyConverter";

type PaymentOrder = {
  id: string;
  invoice_id: string;
  order_number: string;
  amount: number;
  payment_method: string;
  status: string;
  due_date: string;
  payment_date: string | null;
  bank_reference: string | null;
  notes: string | null;
  created_at: string;
  bank_account_id: string | null;
  exchange_rate: number;
  amount_in_account_currency: number | null;
  invoice: {
    invoice_number: string;
    booking_type: 'hotel' | 'flight';
    currency: string;
    customers: { name: string };
    hotel_booking?: {
      internal_booking_number: string;
      hotel_name: string;
    };
    flight_booking?: {
      booking_reference: string;
    };
  };
  bank_account?: {
    account_name: string;
    currency: string;
    bank_name: string;
  };
};

const PaymentOrders = () => {
  const [newPaymentOrder, setNewPaymentOrder] = useState({
    invoice_id: "",
    amount: 0,
    payment_method: "bank_transfer",
    due_date: "",
    bank_reference: "",
    notes: "",
    bank_account_id: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { bankAccounts } = useBankAccounts();
  const { convertCurrency } = useExchangeRates();

  // استعلام أوامر الدفع مع معلومات الحسابات البنكية
  const { data: paymentOrders = [], isLoading } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('payment_orders' as any)
        .select(`
          *,
          invoices!inner(
            invoice_number,
            booking_type,
            currency,
            customers(name)
          ),
          bank_accounts(
            account_name,
            currency,
            bank_name
          )
        `)
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;

      // جلب تفاصيل الحجوزات
      const ordersWithBookings = await Promise.all(
        (data || []).map(async (order: any) => {
          const invoice = order.invoices;
          let bookingDetails = {};

          if (invoice?.booking_type === 'hotel') {
            const { data: hotelData } = await supabase
              .from('hotel_bookings')
              .select('internal_booking_number, hotel_name')
              .eq('id', order.invoice_id)
              .single();
            
            if (hotelData) {
              bookingDetails = { hotel_booking: hotelData };
            }
          } else if (invoice?.booking_type === 'flight') {
            const { data: flightData } = await supabase
              .from('flight_bookings')
              .select('booking_reference')
              .eq('id', order.invoice_id)
              .single();
            
            if (flightData) {
              bookingDetails = { flight_booking: flightData };
            }
          }

          return {
            ...order,
            invoice: {
              ...invoice,
              ...bookingDetails
            }
          };
        })
      );

      return ordersWithBookings as unknown as PaymentOrder[];
    }
  });

  // استعلام الفواتير المتاحة للدفع
  const { data: availableInvoices = [] } = useQuery({
    queryKey: ['available-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          final_amount,
          currency,
          status,
          booking_type,
          booking_id,
          customers(name)
        `)
        .in('status', ['sent'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // إنشاء أمر دفع جديد
  const createPaymentOrderMutation = useMutation({
    mutationFn: async (paymentOrder: typeof newPaymentOrder) => {
      const { data, error } = await (supabase
        .from('payment_orders' as any)
        .insert([{
          invoice_id: paymentOrder.invoice_id,
          amount: paymentOrder.amount,
          payment_method: paymentOrder.payment_method,
          due_date: paymentOrder.due_date,
          bank_reference: paymentOrder.bank_reference || null,
          notes: paymentOrder.notes || null,
          bank_account_id: paymentOrder.bank_account_id || null
        }])
        .select()
        .single() as any);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-invoices'] });
      setNewPaymentOrder({
        invoice_id: "",
        amount: 0,
        payment_method: "bank_transfer",
        due_date: "",
        bank_reference: "",
        notes: "",
        bank_account_id: ""
      });
      setShowForm(false);
      toast({
        title: "تم إنشاء أمر الدفع بنجاح",
        description: "تم إنشاء أمر الدفع الجديد مع ربطه بالحساب البنكي المناسب",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء أمر الدفع",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // تحديث حالة أمر الدفع
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ id, status, payment_date }: { id: string, status: string, payment_date?: string }) => {
      const updateData: any = { status };
      if (payment_date) {
        updateData.payment_date = payment_date;
      }

      const { data, error } = await supabase
        .from('payment_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // إذا تم الدفع، تحديث حالة الفاتورة وإضافة حركة بنكية
      if (status === 'completed') {
        const order = paymentOrders.find(po => po.id === id);
        if (order) {
          await supabase
            .from('invoices')
            .update({ 
              status: 'paid',
              paid_date: payment_date || new Date().toISOString().split('T')[0]
            })
            .eq('id', order.invoice_id);

          // إضافة حركة بنكية إذا كان هناك حساب بنكي مرتبط
          if (order.bank_account_id && order.amount_in_account_currency) {
            await supabase
              .from('bank_account_transactions')
              .insert([{
                bank_account_id: order.bank_account_id,
                transaction_type: 'debit',
                amount: order.amount_in_account_currency,
                description: `دفع أمر رقم ${order.order_number}`,
                reference_number: order.bank_reference,
                related_payment_order_id: order.id,
                transaction_date: payment_date || new Date().toISOString().split('T')[0]
              }]);
          }
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: "تم تحديث حالة الدفع",
        description: "تم تحديث حالة أمر الدفع وتسجيل الحركة البنكية",
      });
    }
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      processing: "bg-primary/10 text-primary",
      completed: "bg-primary/10 text-primary",
      failed: "bg-destructive/10 text-destructive",
      cancelled: "bg-muted text-muted-foreground"
    };
    return colors[status] || "bg-muted text-foreground";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "في الانتظار",
      processing: "قيد المعالجة",
      completed: "مكتمل",
      failed: "فاشل",
      cancelled: "ملغي"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bank_transfer: "تحويل بنكي",
      cash: "نقدي",
      credit_card: "بطاقة ائتمان",
      check: "شيك"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status === 'pending';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentOrder.invoice_id || !newPaymentOrder.due_date || newPaymentOrder.amount <= 0) {
      toast({
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createPaymentOrderMutation.mutate(newPaymentOrder);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const selectedInvoice = availableInvoices.find(inv => inv.id === invoiceId);
    if (selectedInvoice) {
      setNewPaymentOrder(prev => ({
        ...prev,
        invoice_id: invoiceId,
        amount: selectedInvoice.final_amount
      }));
    }
  };

  // تصفية أوامر الدفع
  const filteredPaymentOrders = paymentOrders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.invoice.customers.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesCurrency = currencyFilter === "all" || order.invoice.currency === currencyFilter;
    
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  // إحصائيات
  const totalOrders = paymentOrders.length;
  const totalAmount = paymentOrders.reduce((sum, order) => sum + order.amount, 0);
  const completedAmount = paymentOrders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingAmount = paymentOrders
    .filter(order => order.status === 'pending')
    .reduce((sum, order) => sum + order.amount, 0);

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            أوامر الدفع
          </h1>
          <p className="text-muted-foreground mt-1">إدارة ومتابعة أوامر الدفع متعددة العملات</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowConverter(!showConverter)}
          >
            <Building2 className="w-4 h-4 ml-2" />
            محول العملات
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 ml-2" />
            إنشاء أمر دفع جديد
          </Button>
        </div>
      </div>

      {showConverter && (
        <div className="flex justify-center">
          <CurrencyConverter />
        </div>
      )}

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأوامر</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">المكتمل</p>
                <p className="text-2xl font-bold text-primary">{completedAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">المعلق</p>
                <p className="text-2xl font-bold text-primary">{pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مرشحات البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الأمر أو رقم الفاتورة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="processing">قيد المعالجة</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="failed">فاشل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="فلترة حسب العملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العملات</SelectItem>
                <SelectItem value="EGP">جنيه مصري</SelectItem>
                <SelectItem value="USD">دولار أمريكي</SelectItem>
                <SelectItem value="SAR">ريال سعودي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>إنشاء أمر دفع جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={newPaymentOrder.invoice_id} onValueChange={handleInvoiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  {availableInvoices.map(invoice => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.customers.name} - {invoice.final_amount.toFixed(2)} {CURRENCY_SYMBOLS[invoice.currency as keyof typeof CURRENCY_SYMBOLS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="المبلغ"
                value={newPaymentOrder.amount}
                onChange={e => setNewPaymentOrder({...newPaymentOrder, amount: parseFloat(e.target.value) || 0})}
                step="0.01"
                required
              />

              <Select value={newPaymentOrder.payment_method} onValueChange={(value) => setNewPaymentOrder({...newPaymentOrder, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newPaymentOrder.bank_account_id} onValueChange={(value) => setNewPaymentOrder({...newPaymentOrder, bank_account_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحساب البنكي" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="تاريخ الاستحقاق"
                value={newPaymentOrder.due_date}
                onChange={e => setNewPaymentOrder({...newPaymentOrder, due_date: e.target.value})}
                required
              />

              <Input
                placeholder="المرجع البنكي (اختياري)"
                value={newPaymentOrder.bank_reference}
                onChange={e => setNewPaymentOrder({...newPaymentOrder, bank_reference: e.target.value})}
              />

              <div className="md:col-span-2">
                <Textarea
                  placeholder="ملاحظات إضافية"
                  value={newPaymentOrder.notes}
                  onChange={e => setNewPaymentOrder({...newPaymentOrder, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createPaymentOrderMutation.isPending}>
                  {createPaymentOrderMutation.isPending ? "جاري الإنشاء..." : "إنشاء أمر الدفع"}
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
          <div className="text-center py-8">جاري تحميل أوامر الدفع...</div>
        ) : filteredPaymentOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد أوامر دفع مطابقة للبحث</p>
              </CardContent>
            </Card>
          ) : (
            filteredPaymentOrders.map((order) => (
              <Card key={order.id} className={`hover:shadow-lg transition-shadow ${isOverdue(order.due_date, order.status) ? 'border-destructive/30 bg-destructive/10' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        أمر دفع #{order.order_number}
                      </h3>
                      <p className="text-muted-foreground">فاتورة: {order.invoice.invoice_number}</p>
                      <p className="text-muted-foreground">العميل: {order.invoice.customers.name}</p>
                    {order.bank_account && (
                      <p className="text-sm text-primary">
                        حساب: {order.bank_account.account_name} ({order.bank_account.currency})
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <Badge className={getStatusColor(order.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </Badge>
                    <div className="mt-2">
                      <div className="text-lg font-bold">
                        {order.amount.toFixed(2)} {CURRENCY_SYMBOLS[order.invoice.currency as keyof typeof CURRENCY_SYMBOLS]}
                      </div>
                      {order.amount_in_account_currency && order.bank_account && order.invoice.currency !== order.bank_account.currency && (
                        <div className="text-sm text-gray-600">
                          ≈ {order.amount_in_account_currency.toFixed(2)} {CURRENCY_SYMBOLS[order.bank_account.currency as keyof typeof CURRENCY_SYMBOLS]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isOverdue(order.due_date, order.status) && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm font-medium">⚠️ هذا الأمر متأخر عن موعد الاستحقاق</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium">طريقة الدفع:</span>
                    <p>{getPaymentMethodLabel(order.payment_method)}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الاستحقاق:</span>
                    <p className={isOverdue(order.due_date, order.status) ? 'text-destructive font-medium' : ''}>
                      {new Date(order.due_date).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الدفع:</span>
                    <p>{order.payment_date ? new Date(order.payment_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="font-medium">المرجع البنكي:</span>
                    <p>{order.bank_reference || 'غير محدد'}</p>
                  </div>
                </div>

                {order.exchange_rate !== 1.0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded">
                    <span className="font-medium text-primary">سعر الصرف:</span>
                    <p className="text-sm text-primary">
                      1 {order.invoice.currency} = {order.exchange_rate.toFixed(4)} {order.bank_account?.currency}
                    </p>
                  </div>
                )}

                {order.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <span className="font-medium">ملاحظات:</span>
                    <p className="text-sm mt-1">{order.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    عرض
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    تعديل
                  </Button>
                  
                  {order.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => updatePaymentStatusMutation.mutate({
                          id: order.id,
                          status: 'completed',
                          payment_date: new Date().toISOString().split('T')[0]
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        تأكيد الدفع
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => updatePaymentStatusMutation.mutate({
                          id: order.id,
                          status: 'failed'
                        })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        فشل الدفع
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentOrders;
