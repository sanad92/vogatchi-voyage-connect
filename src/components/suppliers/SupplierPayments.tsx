
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency } from '@/types/currency';
import { useOrgId } from '@/hooks/useOrgId';
import { formatRefundAmount } from '@/components/finance/RefundMovements';
import type { Tables } from '@/integrations/supabase/types';

type Payment = Pick<Tables<'supplier_payments'>,
  'id' | 'reference_number' | 'payment_reference' | 'status' | 'amount' | 'currency' |
  'paid_date' | 'payment_date' | 'payment_method'>;

interface SupplierPaymentsProps {
  supplierId: string;
  canManage: boolean;
  payments: Payment[];
  state: { isPending: boolean; isError: boolean };
}

const SupplierPayments = ({ supplierId, canManage, payments, state }: SupplierPaymentsProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const [newPayment, setNewPayment] = useState({
    supplier_id: supplierId || '',
    amount: 0,
    currency: 'EGP' as SupportedCurrency,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (payment: typeof newPayment) => {
      if (!canManage || !orgId) throw new Error('ليس لديك صلاحية لإضافة دفعة.');
      const { data, error } = await supabase
        .from('supplier_payments')
        .insert([{
          supplier_id: payment.supplier_id,
          organization_id: orgId,
          amount: payment.amount,
          currency: payment.currency,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          payment_reference: payment.reference_number, // للتوافق مع الحقل الحالي
          notes: payment.notes,
          exchange_rate: 1,
          amount_in_egp: payment.amount,
          status: 'pending',
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sup360-payments', supplierId, orgId] });
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
    },
    onError: error => toast({ title: 'تعذر حفظ الدفعة', description: error.message, variant: 'destructive' }),
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">مدفوعات المورد</h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="size-4" /> إضافة دفعة جديدة
          </Button>
        )}
      </div>

      {/* نموذج إضافة دفعة */}
      {canManage && showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة دفعة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="المبلغ (ج.م)"
                value={newPayment.amount}
                onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                required
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">العملة:</span>
                <span className="font-medium">{CURRENCY_NAMES.EGP} ({CURRENCY_SYMBOLS.EGP})</span>
              </div>
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

      <Card>
        <CardContent className="overflow-x-auto p-4">
          {state.isError ? (
            <p role="alert" className="text-sm text-destructive">تعذر تحميل مدفوعات المورد.</p>
          ) : state.isPending ? (
            <p className="text-sm text-muted-foreground">جاري تحميل المدفوعات...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مدفوعات لهذا المورد</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  {['المرجع', 'التاريخ', 'المبلغ', 'الوسيلة', 'الحالة'].map(label => <th key={label} className="p-2">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => {
                  const status = payment.status || 'pending';
                  return (
                    <tr key={payment.id} className="border-b">
                      <td className="p-2">{payment.reference_number || payment.payment_reference || '—'}</td>
                      <td className="p-2">{payment.payment_date || payment.paid_date || '—'}</td>
                      <td className="p-2">{formatRefundAmount(payment.amount, payment.currency || 'EGP')}</td>
                      <td className="p-2">{payment.payment_method ? getPaymentMethodLabel(payment.payment_method) : '—'}</td>
                      <td className="p-2"><Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPayments;
