
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Plus, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency, SupplierPayment } from '@/types/currency';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface SupplierPaymentsProps {
  supplierId?: string | null;
}

const SupplierPayments = ({ supplierId }: SupplierPaymentsProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getCurrentRate } = useExchangeRates();

  const [newPayment, setNewPayment] = useState({
    supplier_id: supplierId || '',
    amount: 0,
    currency: 'EGP' as SupportedCurrency,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  // استعلام المدفوعات
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          suppliers(name)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(payment => ({
        ...payment,
        payment_date: payment.payment_date || payment.paid_date,
        reference_number: payment.reference_number || payment.payment_reference,
        exchange_rate: payment.exchange_rate || 1,
        amount_in_egp: payment.amount_in_egp || payment.amount
      })) as SupplierPayment[];
    },
    enabled: !!supplierId
  });

  // إضافة دفعة جديدة
  const addPaymentMutation = useMutation({
    mutationFn: async (payment: typeof newPayment) => {
      // حساب سعر الصرف إلى الجنيه المصري
      const exchangeRate = await getCurrentRate(payment.currency, 'EGP');
      const amountInEgp = payment.amount * exchangeRate;

      const { data, error } = await supabase
        .from('supplier_payments')
        .insert([{
          supplier_id: payment.supplier_id,
          amount: payment.amount,
          currency: payment.currency,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          notes: payment.notes,
          exchange_rate: exchangeRate,
          amount_in_egp: amountInEgp,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      setNewPayment({
        supplier_id: supplierId || '',
        amount: 0,
        currency: 'EGP',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      setShowAddForm(false);
      toast({
        title: "تم إضافة الدفعة بنجاح",
        description: "تم حفظ بيانات الدفعة الجديدة",
      });
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "في الانتظار",
      paid: "مدفوع",
      cancelled: "ملغي"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bank_transfer: "تحويل بنكي",
      cash: "نقدي",
      check: "شيك",
      credit_card: "بطاقة ائتمان"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.reference_number.trim() || !supplierId) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }
    addPaymentMutation.mutate({
      ...newPayment,
      supplier_id: supplierId
    });
  };

  // حساب إجمالي المدفوعات بالجنيه المصري
  const totalPaymentsEgp = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_in_egp, 0);

  if (!supplierId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">يرجى اختيار مورد لعرض المدفوعات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات المدفوعات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي المدفوعات</p>
                <p className="text-2xl font-bold">{totalPaymentsEgp.toLocaleString()} {CURRENCY_SYMBOLS.EGP}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">عدد المعاملات</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">المعلقة</p>
                <p className="text-2xl font-bold">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* زر إضافة دفعة جديدة */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">مدفوعات المورد</h3>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة دفعة جديدة
        </Button>
      </div>

      {/* نموذج إضافة دفعة */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة دفعة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.01"
                placeholder="المبلغ"
                value={newPayment.amount}
                onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                required
              />
              <Select value={newPayment.currency} onValueChange={(value: SupportedCurrency) => setNewPayment({...newPayment, currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">{CURRENCY_NAMES.EGP} ({CURRENCY_SYMBOLS.EGP})</SelectItem>
                  <SelectItem value="USD">{CURRENCY_NAMES.USD} ({CURRENCY_SYMBOLS.USD})</SelectItem>
                  <SelectItem value="SAR">{CURRENCY_NAMES.SAR} ({CURRENCY_SYMBOLS.SAR})</SelectItem>
                  <SelectItem value="EUR">{CURRENCY_NAMES.EUR} ({CURRENCY_SYMBOLS.EUR})</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="تاريخ الدفع"
                value={newPayment.payment_date}
                onChange={e => setNewPayment({...newPayment, payment_date: e.target.value})}
                required
              />
              <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment({...newPayment, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="رقم المرجع"
                value={newPayment.reference_number}
                onChange={e => setNewPayment({...newPayment, reference_number: e.target.value})}
                required
              />
              <div className="md:col-span-2">
                <Textarea
                  placeholder="ملاحظات"
                  value={newPayment.notes}
                  onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={addPaymentMutation.isPending}>
                  {addPaymentMutation.isPending ? "جاري الحفظ..." : "حفظ الدفعة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* قائمة المدفوعات */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل المدفوعات...</div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد مدفوعات لهذا المورد</p>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      دفعة #{payment.reference_number}
                    </h4>
                    <p className="text-gray-600">طريقة الدفع: {getPaymentMethodLabel(payment.payment_method)}</p>
                  </div>
                  <div className="text-left">
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                    <div className="mt-2">
                      <div className="text-lg font-bold">
                        {payment.amount.toLocaleString()} {CURRENCY_SYMBOLS[payment.currency]}
                      </div>
                      {payment.currency !== 'EGP' && (
                        <div className="text-sm text-gray-600">
                          ({payment.amount_in_egp.toLocaleString()} {CURRENCY_SYMBOLS.EGP})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium">تاريخ الدفع:</span>
                    <p>{new Date(payment.payment_date).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div>
                    <span className="font-medium">سعر الصرف:</span>
                    <p>{payment.exchange_rate.toFixed(4)}</p>
                  </div>
                  <div>
                    <span className="font-medium">المبلغ بالجنيه:</span>
                    <p>{payment.amount_in_egp.toLocaleString()} {CURRENCY_SYMBOLS.EGP}</p>
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الإضافة:</span>
                    <p>{new Date(payment.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                {payment.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <span className="font-medium">ملاحظات:</span>
                    <p className="text-sm mt-1">{payment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SupplierPayments;
