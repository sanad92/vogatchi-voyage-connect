
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Plus, Eye, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  invoices: {
    invoice_number: string;
    customers: { name: string };
  };
};

type Invoice = {
  id: string;
  invoice_number: string;
  final_amount: number;
  status: string;
  customers: { name: string };
};

const PaymentOrders = () => {
  const [newPaymentOrder, setNewPaymentOrder] = useState({
    invoice_id: "",
    amount: 0,
    payment_method: "bank_transfer",
    due_date: "",
    bank_reference: "",
    notes: ""
  });
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // استعلام أوامر الدفع
  const { data: paymentOrders = [], isLoading } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_orders')
        .select(`
          *,
          invoices(
            invoice_number,
            customers(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentOrder[];
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
          status,
          customers(name)
        `)
        .in('status', ['draft', 'sent'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // إنشاء أمر دفع جديد
  const createPaymentOrderMutation = useMutation({
    mutationFn: async (paymentOrder: typeof newPaymentOrder) => {
      const { data, error } = await supabase
        .from('payment_orders')
        .insert([{
          invoice_id: paymentOrder.invoice_id,
          amount: paymentOrder.amount,
          payment_method: paymentOrder.payment_method,
          due_date: paymentOrder.due_date,
          bank_reference: paymentOrder.bank_reference || null,
          notes: paymentOrder.notes || null
        }])
        .select()
        .single();
      
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
        notes: ""
      });
      setShowForm(false);
      toast({
        title: "تم إنشاء أمر الدفع بنجاح",
        description: "تم إنشاء أمر الدفع الجديد",
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      toast({
        title: "تم تحديث حالة الدفع",
        description: "تم تحديث حالة أمر الدفع بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-orange-900 flex items-center gap-2">
            <CreditCard /> أوامر الدفع التلقائية
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 ml-2" />
            إنشاء أمر دفع جديد
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
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
                        {invoice.invoice_number} - {invoice.customers.name} - {invoice.final_amount.toLocaleString()} ج.م
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
          ) : paymentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد أوامر دفع حتى الآن</div>
          ) : (
            paymentOrders.map((order) => (
              <Card key={order.id} className={`hover:shadow-lg transition-shadow ${isOverdue(order.due_date, order.status) ? 'border-red-300 bg-red-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        أمر دفع #{order.order_number}
                      </h3>
                      <p className="text-gray-600">فاتورة: {order.invoices.invoice_number}</p>
                      <p className="text-gray-600">العميل: {order.invoices.customers.name}</p>
                    </div>
                    <div className="text-left">
                      <Badge className={getStatusColor(order.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </span>
                      </Badge>
                      <div className="mt-2 text-lg font-bold">
                        {order.amount.toLocaleString()} ج.م
                      </div>
                    </div>
                  </div>

                  {isOverdue(order.due_date, order.status) && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm font-medium">⚠️ هذا الأمر متأخر عن موعد الاستحقاق</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium">طريقة الدفع:</span>
                      <p>{getPaymentMethodLabel(order.payment_method)}</p>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الاستحقاق:</span>
                      <p className={isOverdue(order.due_date, order.status) ? 'text-red-600 font-medium' : ''}>
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
                          className="bg-green-600 hover:bg-green-700"
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
    </div>
  );
};

export default PaymentOrders;
